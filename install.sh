#!/usr/bin/env bash
# neoplasticism installer: build dist/, then put each theme where its app looks.
#
#   ./install.sh
#
# Safe to re-run. Skips apps that aren't installed. Themes are symlinked into place,
# so a later ./build.py updates them in place. Anything this script replaces or
# edits is copied to ~/.local/state/neoplasticism/backups/<timestamp>/ first.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$ROOT/dist"
CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}"
BACKUP="${XDG_STATE_HOME:-$HOME/.local/state}/neoplasticism/backups/$(date +%Y%m%d-%H%M%S)"

ok()   { printf '  \033[34m✓\033[0m %s\n' "$*"; }
todo() { printf '  \033[33m→\033[0m %s\n' "$*"; }
skip() { printf '  \033[90m- %s\033[0m\n' "$*"; }
has()  { command -v "$1" >/dev/null 2>&1; }
tilde() { if [[ "$1" == "$HOME"/* ]]; then printf '%s' "~${1#"$HOME"}"; else printf '%s' "$1"; fi; }

# backup FILE: copy FILE into $BACKUP (once per run), mirroring its path under $HOME.
backup() {
  local f="$1" dest
  if [[ ! -e "$f" && ! -L "$f" ]]; then return 0; fi
  dest="$BACKUP/${f#"$HOME"/}"
  if [[ -e "$dest" || -L "$dest" ]]; then return 0; fi
  mkdir -p "$(dirname "$dest")"
  cp -RP "$f" "$dest"
}

# link SRC DEST: make DEST a symlink to SRC, backing up whatever was there.
link() {
  local src="$1" dest="$2"
  if [[ "$(readlink "$dest" 2>/dev/null || true)" == "$src" ]]; then return 0; fi
  if [[ -e "$dest" || -L "$dest" ]]; then backup "$dest"; rm -f "$dest"; fi
  mkdir -p "$(dirname "$dest")"
  ln -s "$src" "$dest"
}

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

# set_line FILE REGEX LINE: replace the first line matching REGEX with LINE, else append LINE.
set_line() {
  local file="$1" re="$2" line="$3"
  if [[ -f "$file" ]] && grep -qxF -- "$line" "$file"; then return 0; fi
  backup "$file"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  if grep -qE -- "$re" "$file"; then
    rewrite "$file" '!done && $0 ~ re { print line; done = 1; next } { print }' -v re="$re" -v line="$line"
  else
    if [[ -s "$file" && -n "$(tail -c1 "$file")" ]]; then echo >> "$file"; fi
    printf '%s\n' "$line" >> "$file"
  fi
}

# comment_out FILE REGEX: disable every line matching REGEX, with a marker saying why.
comment_out() {
  local file="$1" re="$2"
  if [[ ! -f "$file" ]] || ! grep -qE -- "$re" "$file"; then return 0; fi
  backup "$file"
  rewrite "$file" '$0 ~ re { print "# [neoplasticism] " $0; next } { print }' -v re="$re"
}

echo "Building"
if has uv; then uv run --quiet "$ROOT/build.py" >/dev/null; else python3 "$ROOT/build.py" >/dev/null; fi
echo "Installing"

# Neovim --------------------------------------------------------------------------------
# colors/ is on the runtimepath, so the link alone makes :colorscheme neoplasticism work.
if has nvim; then
  link "$ROOT/colors/neoplasticism.lua" "$CONFIG/nvim/colors/neoplasticism.lua"
  if grep -rqsE --exclude-dir=colors 'colorscheme[^a-z]+neoplasticism' "$CONFIG/nvim"; then
    ok "nvim"
  else
    todo "nvim: theme linked; select it with  vim.cmd.colorscheme(\"neoplasticism\")  in your config"
  fi
else
  skip "nvim (not installed)"
fi

# VS Code ---------------------------------------------------------------------------------
code_cli=""
for c in code "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"; do
  if has "$c"; then code_cli="$c"; break; fi
done
if [[ -n "$code_cli" ]]; then
  vsix="$(ls "$DIST"/vscode/*.vsix | head -1)"
  version="$(basename "$vsix" .vsix)"; version="${version##*-}"
  theme="themes/neoplasticism-color-theme.json"
  installed="$HOME/.vscode/extensions/brysontang.neoplasticism-$version/$theme"
  # Reinstall whenever the built theme differs from the installed one, even at the same version.
  if ! cmp -s "$installed" "$DIST/vscode/extension/$theme"; then
    "$code_cli" --install-extension "$vsix" --force >/dev/null 2>&1 || true
  fi
  settings="$HOME/Library/Application Support/Code/User/settings.json"
  if [[ ! -f "$settings" ]]; then settings="$CONFIG/Code/User/settings.json"; fi
  if ! cmp -s "$installed" "$DIST/vscode/extension/$theme"; then
    todo "VS Code: install didn't take; install $(tilde "$vsix") by hand (Extensions → … → Install from VSIX)"
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
    comment_out "$f" '^[[:space:]]*(palette|background|foreground|cursor-color|cursor-text|selection-background|selection-foreground)[[:space:]]*='
    if [[ "$f" != "$last" ]]; then comment_out "$f" '^[[:space:]]*theme[[:space:]]*='; fi
  done
  set_line "$last" '^[[:space:]]*theme[[:space:]]*=' 'theme = neoplasticism'
  ok "Ghostty (reload config: cmd+shift+,)"
else
  skip "Ghostty (not installed)"
fi

# tmux ------------------------------------------------------------------------------------
if has tmux; then
  link "$DIST/tmux/neoplasticism.conf" "$CONFIG/tmux/neoplasticism.conf"
  tconf="$CONFIG/tmux/tmux.conf"
  if [[ ! -f "$tconf" && -f "$HOME/.tmux.conf" ]]; then tconf="$HOME/.tmux.conf"; fi
  # A theme plugin would repaint the status bar after us.
  comment_out "$tconf" "^[[:space:]]*set(-option)?[[:space:]]+-g[[:space:]]+@plugin[[:space:]]+['\"]catppuccin/tmux['\"]"
  # Sourced last so it wins over anything earlier in the file, plugins included.
  set_line "$tconf" '^[[:space:]]*source-file[[:space:]].*neoplasticism[.]conf' "source-file $(tilde "$CONFIG/tmux/neoplasticism.conf")"
  ok "tmux (reload: tmux source-file $(tilde "$tconf"))"
else
  skip "tmux (not installed)"
fi

# git -------------------------------------------------------------------------------------
if has git; then
  link "$DIST/git/neoplasticism.gitconfig" "$CONFIG/git/neoplasticism.gitconfig"
  if ! git config --global --get-all include.path 2>/dev/null | grep -qF neoplasticism.gitconfig; then
    backup "$HOME/.gitconfig"
    git config --global --add include.path "$(tilde "$CONFIG/git/neoplasticism.gitconfig")"
  fi
  ok "git"
fi

# Blink (iPad) ----------------------------------------------------------------------------
remote="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
branch="$(git -C "$ROOT" symbolic-ref --short HEAD 2>/dev/null || echo main)"
if [[ "$remote" =~ github\.com[:/]([^/]+)/([^/]+)$ ]]; then
  repo="${BASH_REMATCH[2]%.git}"
  todo "Blink: Settings → Appearance → Themes → Add → https://raw.githubusercontent.com/${BASH_REMATCH[1]}/$repo/$branch/dist/blink/neoplasticism.js"
else
  todo "Blink: push this repo to GitHub, then add the raw URL of dist/blink/neoplasticism.js in Blink"
fi

if [[ -d "$BACKUP" ]]; then echo "Backed up what changed to $(tilde "$BACKUP")"; fi
