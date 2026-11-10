#!/usr/bin/env bash
# neoplasticism installer: build dist/, then put each theme where its app looks.
#
#   ./install.sh
#
# Safe to re-run. Skips apps that aren't installed. Themes are symlinked into place,
# so a later ./build.py updates them in place. Anything this script replaces or
# edits is copied to ~/.local/state/neoplasticism/backups/<timestamp>/ first, and
# every line it disables or adds in one of your configs carries a "# [neoplasticism]" marker.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$ROOT/dist"
CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}"
BACKUP="${XDG_STATE_HOME:-$HOME/.local/state}/neoplasticism/backups/$(date +%Y%m%d-%H%M%S)"
MARK="# [neoplasticism]"
ADDED="$MARK added by install.sh:"

ok()   { printf '  \033[34m✓\033[0m %s\n' "$*"; }
todo() { printf '  \033[33m→\033[0m %s\n' "$*"; }
skip() { printf '  \033[90m- %s\033[0m\n' "$*"; }
has()  { command -v "$1" >/dev/null 2>&1; }
tilde() { if [[ "$1" == "$HOME"/* ]]; then printf '%s' "~${1#"$HOME"}"; else printf '%s' "$1"; fi; }

# backup FILE [as-is]: copy FILE into $BACKUP (once per run), mirroring its path under $HOME.
# A config that is a symlink (into a dotfiles repo, say) is backed up as the text it points
# at, because that text is what gets edited. "as-is" keeps a symlink a symlink, for link().
backup() {
  local f="$1" how="${2:-}" dest
  dest="$BACKUP/${f#"$HOME"/}"
  if [[ -e "$dest" || -L "$dest" ]]; then return 0; fi
  if [[ "$how" == as-is ]]; then
    if [[ ! -e "$f" && ! -L "$f" ]]; then return 0; fi
    mkdir -p "$(dirname "$dest")"
    cp -RP "$f" "$dest"
  else
    if [[ ! -e "$f" ]]; then return 0; fi
    mkdir -p "$(dirname "$dest")"
    cp -RL "$f" "$dest"
  fi
}

# link SRC DEST: make DEST a symlink to SRC, backing up whatever was there.
link() {
  local src="$1" dest="$2"
  if [[ "$(readlink "$dest" 2>/dev/null || true)" == "$src" ]]; then return 0; fi
  if [[ -e "$dest" || -L "$dest" ]]; then backup "$dest" as-is; rm -f "$dest"; fi
  mkdir -p "$(dirname "$dest")"
  ln -s "$src" "$dest"
}

# Patterns below are awk regexes. They spell whitespace as [ \t] because some awks (older
# mawk, the default on Debian and Ubuntu) don't know [[:space:]].

# rewrite FILE AWK_PROGRAM [awk -v args...]: run awk over FILE and write the result back
# through the same path (so a FILE that is itself a symlink stays one).
rewrite() {
  local file="$1" prog="$2" tmp
  shift 2
  tmp="$(mktemp)"
  awk "$@" "$prog" "$file" > "$tmp"
  cat "$tmp" > "$file"
  rm -f "$tmp"
}

# append FILE LINE...: add lines at the end of FILE, starting on a line of their own.
append() {
  local file="$1"
  shift
  mkdir -p "$(dirname "$file")"
  touch "$file"
  if [[ -s "$file" && -n "$(tail -c1 "$file")" ]]; then echo >> "$file"; fi
  printf '%s\n' "$@" >> "$file"
}

# comment_out FILE REGEX [KEEP]: disable every line matching REGEX (except one that is
# exactly KEEP), with a marker saying who did it.
comment_out() {
  local file="$1" re="$2"
  export NEO_KEEP="${3:-}"
  # shellcheck disable=SC2016  # an awk condition, not shell
  local hit='$0 ~ re && (ENVIRON["NEO_KEEP"] == "" || $0 != ENVIRON["NEO_KEEP"])'
  if [[ ! -f "$file" ]] || ! awk -v re="$re" "$hit { found = 1; exit } END { exit !found }" "$file"; then
    return 0
  fi
  backup "$file"
  rewrite "$file" "$hit { print mark \" \" \$0; next } { print }" -v re="$re" -v mark="$MARK"
}

# set_line FILE REGEX LINE: make LINE the only live line matching REGEX. Any other match is
# commented out, and LINE is added at the end (under a marker) unless it's already there.
set_line() {
  local file="$1" re="$2" line="$3"
  comment_out "$file" "$re" "$line"
  if [[ -f "$file" ]] && grep -qxF -- "$line" "$file"; then return 0; fi
  backup "$file"
  append "$file" "$ADDED" "$line"
}

echo "Building"
if has uv; then
  build=(uv run --quiet "$ROOT/build.py")
elif has python3 && python3 -c 'import sys; sys.exit(sys.version_info < (3, 11))' 2>/dev/null; then
  build=(python3 "$ROOT/build.py")
else
  found="$(python3 --version 2>&1 || true)"
  echo "install.sh: the build needs uv or Python 3.11+ (found: ${found:-no python3}). Get uv at https://docs.astral.sh/uv/ and run this again." >&2
  exit 1
fi
"${build[@]}" >/dev/null
echo "Installing"

# Neovim --------------------------------------------------------------------------------
# colors/ is on the runtimepath, so the link alone makes :colorscheme neoplasticism work.
if has nvim; then
  link "$ROOT/colors/neoplasticism.lua" "$CONFIG/nvim/colors/neoplasticism.lua"
  # find -L, because a config kept in a dotfiles repo is a symlink (or a folder of them).
  selected="$(find -L "$CONFIG/nvim" -path "$CONFIG/nvim/colors" -prune -o -type f \
    -exec grep -lsE 'colorscheme[^a-z]+neoplasticism' {} + 2>/dev/null || true)"
  if [[ -n "$selected" ]]; then
    ok "nvim (already open? run  :colorscheme neoplasticism)"
  else
    todo "nvim: theme linked; select it with  vim.cmd.colorscheme(\"neoplasticism\")  in your config"
  fi
else
  skip "nvim (not installed)"
fi

# VS Code ---------------------------------------------------------------------------------
# pkg_field KEY: a top-level string from the built extension's package.json.
pkg_field() {
  sed -n 's/^  "'"$1"'": *"\(.*\)",\{0,1\}$/\1/p' "$DIST/vscode/extension/package.json" | head -1
}
code_cli=""
for c in code "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"; do
  if has "$c"; then code_cli="$c"; break; fi
done
if [[ -n "$code_cli" ]]; then
  name="$(pkg_field name)"
  version="$(pkg_field version)"
  vsix="$DIST/vscode/$name-$version.vsix"
  theme="themes/neoplasticism-color-theme.json"
  # VS Code unpacks an extension into <publisher>.<name>-<version>, lowercased.
  extensions="${VSCODE_EXTENSIONS:-$HOME/.vscode/extensions}"
  id="$(printf '%s.%s' "$(pkg_field publisher)" "$name" | tr '[:upper:]' '[:lower:]')"
  installed="$extensions/$id-$version/$theme"
  # Reinstall whenever the built theme differs from the installed one, even at the same version.
  code_said=""
  if ! cmp -s "$installed" "$DIST/vscode/extension/$theme"; then
    code_said="$("$code_cli" --install-extension "$vsix" --force 2>&1 || true)"
  fi
  settings="$HOME/Library/Application Support/Code/User/settings.json"
  if [[ ! -f "$settings" ]]; then settings="$CONFIG/Code/User/settings.json"; fi
  if ! cmp -s "$installed" "$DIST/vscode/extension/$theme"; then
    todo "VS Code: install didn't take (no $id-$version in $(tilde "$extensions")); install $(tilde "$vsix") by hand (Extensions → … → Install from VSIX)"
    if [[ -n "$code_said" ]]; then printf '%s\n' "$code_said" | tail -5 | sed 's/^/      code: /'; fi
  elif grep -qsE '"workbench.colorTheme"[[:space:]]*:[[:space:]]*"Neoplasticism"' "$settings"; then
    ok "VS Code $version (Developer: Reload Window if it's open)"
  else
    todo "VS Code: installed; pick it with  Preferences: Color Theme → Neoplasticism"
  fi
else
  skip "VS Code (no code CLI found)"
fi

# Ghostty ---------------------------------------------------------------------------------
if has ghostty || [[ -d /Applications/Ghostty.app ]]; then
  link "$DIST/ghostty/neoplasticism" "$CONFIG/ghostty/themes/neoplasticism"
  # Ghostty loads every one of these that exists, macOS ones last. Explicit colors in any
  # of them would override the theme, so those get commented out.
  gconfigs=()
  for f in "$CONFIG/ghostty/config" "$CONFIG/ghostty/config.ghostty" \
           "$HOME/Library/Application Support/com.mitchellh.ghostty/config" \
           "$HOME/Library/Application Support/com.mitchellh.ghostty/config.ghostty"; do
    if [[ -f "$f" ]]; then gconfigs+=("$f"); fi
  done
  if [[ ${#gconfigs[@]} -eq 0 ]]; then gconfigs=("$CONFIG/ghostty/config"); fi
  last="${gconfigs[${#gconfigs[@]}-1]}"
  for f in "${gconfigs[@]}"; do
    comment_out "$f" '^[ \t]*(palette|background|foreground|cursor-color|cursor-text|selection-background|selection-foreground)[ \t]*='
    if [[ "$f" != "$last" ]]; then comment_out "$f" '^[ \t]*theme[ \t]*='; fi
  done
  set_line "$last" '^[ \t]*theme[ \t]*=' 'theme = neoplasticism'
  if [[ "$(uname -s)" == Darwin ]]; then reload="cmd+shift+,"; else reload="ctrl+shift+,"; fi
  ok "Ghostty (reload config: $reload)"
else
  skip "Ghostty (not installed)"
fi

# tmux ------------------------------------------------------------------------------------
if has tmux; then
  link "$DIST/tmux/neoplasticism.conf" "$CONFIG/tmux/neoplasticism.conf"
  tconf="$CONFIG/tmux/tmux.conf"
  if [[ ! -f "$tconf" && -f "$HOME/.tmux.conf" ]]; then tconf="$HOME/.tmux.conf"; fi
  # A theme plugin would repaint the status bar after us. Catches the TPM line in its usual
  # spellings (set -g / -ag, a pinned #version) and a hand-written run of catppuccin.tmux.
  comment_out "$tconf" "^[ \t]*set(-option)?[ \t]+-[ag]+[ \t]+@plugin[ \t]+['\"]catppuccin/tmux(#[^'\"]*)?['\"]"
  comment_out "$tconf" '^[ \t]*run(-shell)?[ \t].*catppuccin[.]tmux'
  # Sourced last so it wins over anything earlier in the file, plugins included.
  set_line "$tconf" '^[ \t]*source(-file)?[ \t].*neoplasticism[.]conf' "source-file $(tilde "$CONFIG/tmux/neoplasticism.conf")"
  ok "tmux (reload: tmux source-file $(tilde "$tconf"))"
else
  skip "tmux (not installed)"
fi

# git -------------------------------------------------------------------------------------
if has git; then
  gtheme="$CONFIG/git/neoplasticism.gitconfig"
  link "$DIST/git/neoplasticism.gitconfig" "$gtheme"
  includes="$(git config --global --get-all include.path 2>/dev/null || true)"
  if [[ "$includes" != *neoplasticism.gitconfig* ]]; then
    # The file git itself treats as the global config: ~/.gitconfig, or the XDG one when
    # that exists and ~/.gitconfig doesn't.
    gconf="${GIT_CONFIG_GLOBAL:-$HOME/.gitconfig}"
    if [[ -z "${GIT_CONFIG_GLOBAL:-}" && ! -e "$gconf" && -e "$CONFIG/git/config" ]]; then gconf="$CONFIG/git/config"; fi
    backup "$gconf"
    append "$gconf" "$ADDED" "[include]" "	path = \"$(tilde "$gtheme")\""
    includes="$(git config --global --get-all include.path 2>/dev/null || true)"
  fi
  if [[ "$includes" == *neoplasticism.gitconfig* ]]; then
    ok "git"
  else
    todo "git: couldn't add the include; run  git config --global --add include.path $(tilde "$gtheme")"
  fi
fi

# Blink (iPad) ----------------------------------------------------------------------------
# Blink fetches the theme from GitHub, so the link names the default branch, not whichever
# branch happens to be checked out here.
remote="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
branch="$(git -C "$ROOT" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || true)"
branch="${branch#origin/}"
if [[ "$remote" =~ github\.com[:/]([^/]+)/([^/]+)$ ]]; then
  repo="${BASH_REMATCH[2]%.git}"
  todo "Blink: Settings → Appearance → Themes → Add → https://raw.githubusercontent.com/${BASH_REMATCH[1]}/$repo/${branch:-main}/dist/blink/neoplasticism.js"
else
  todo "Blink: push this repo to GitHub, then add the raw URL of dist/blink/neoplasticism.js in Blink"
fi

if [[ -d "$BACKUP" ]]; then echo "Backed up what changed to $(tilde "$BACKUP")"; fi
