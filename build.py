#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# ///
"""Render every file in templates/ into dist/, with palette.toml as the only source of color.

    ./build.py            (or: uv run build.py, python3 build.py)

templates/<app>/<path> becomes dist/<app>/<path>, except templates/nvim/<path>, which becomes
<path> at the repo root so plugin managers find colors/neoplasticism.lua. Placeholders look
like {{ name }} or {{ name | filter }}; an unknown name or a malformed placeholder stops the
build so a typo can't ship a broken theme. Files that aren't text (an icon) are copied as
they are.

Everything is rendered into a scratch folder first and only then moved into place, so a build
that fails leaves the previous output, and the themes linked to it, untouched.
"""

import json
import re
import shutil
import sys
import tempfile
import tomllib
import zipfile
from pathlib import Path
from xml.dom import minidom
from xml.parsers.expat import ExpatError
from xml.sax.saxutils import escape as xml_escape

ROOT = Path(__file__).resolve().parent
TEMPLATES = ROOT / "templates"
# The only folders templates/nvim/ may write to at the repo root. Anything else there (a
# templates/nvim/README.md, say) would overwrite a hand-written file, so it stops the build.
NVIM_DIRS = ("colors", "lua", "plugin", "after")
# Folders at the repo root that are replaced whole on every build, so a deleted template can't
# linger. Any other NVIM_DIRS folder is replaced only while a template still writes into it.
ALWAYS_GENERATED = ("dist", "colors")

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
TOKEN = re.compile(r"\{\{\s*([\w.]+)\s*(?:\|\s*(\w+)\s*)?\}\}")
FILTERS = {
    "rgb": lambda h: ", ".join(str(int(h[i : i + 2], 16)) for i in (1, 3, 5)),
    "bare": lambda h: h[1:],
}
XML_SUFFIXES = {".xml", ".vsixmanifest"}


def die(msg: str) -> None:
    sys.exit(f"build.py: {msg}")


def load_palette() -> dict[str, str]:
    try:
        data = tomllib.loads((ROOT / "palette.toml").read_text())
    except FileNotFoundError:
        die("palette.toml is missing")
    except tomllib.TOMLDecodeError as e:
        die(f"palette.toml: {e}")

    raw: dict[str, str] = {}
    tables = [(t, "") for t in ("colors", "shades", "roles")] + [("ansi", "ansi.")]
    for table, prefix in tables:
        for key, value in data.get(table, {}).items():
            name = f"{prefix}{key}"
            if not isinstance(value, str):
                die(f"palette.toml: {name} = {value!r} must be a quoted hex color or color name")
            if name in raw:
                die(f"palette.toml: '{name}' is defined twice")
            raw[name] = value

    def resolve(name: str, chain: tuple[str, ...] = ()) -> str:
        if name in chain:
            die(f"palette.toml: cycle {' -> '.join(chain + (name,))}")
        value = raw[name]
        if HEX.match(value):
            return value.lower()
        if value not in raw:
            die(f"palette.toml: {name} = '{value}' is neither a hex color nor a known name")
        return resolve(value, chain + (name,))

    ctx = {key: resolve(key) for key in raw}

    named = set(data.get("colors", {})) | set(data.get("shades", {}))

    def color_name(role: str) -> str | None:
        # Follow the role to the first named color it points at, e.g. variable -> yellow.
        # None when it never reaches one (the role is missing or is a bare hex code).
        value = raw.get(role)
        while value in raw and value not in named:
            value = raw[value]
        return value if value in named else None

    def colored(what: str, role: str) -> str:
        name = color_name(role)
        return f"{what} ({name})" if name else what

    if "meta" not in data:
        die("palette.toml: the [meta] table is missing")
    meta = dict(data["meta"])
    fg = color_name("fg")
    meta.setdefault(
        "description",
        "After Mondrian. Three things get color: "
        f"{colored('variables', 'variable')}, {colored('functions', 'function')}, "
        f"{colored('literals', 'literal')}. Everything else is {fg or 'plain'}.",
    )
    for key in ("name", "slug", "version", "publisher"):
        if key not in meta:
            die(f"palette.toml: [meta] needs '{key}'")
    for key, value in meta.items():
        ctx[f"meta.{key}"] = str(value)
    return ctx


def escaper(suffix: str):
    """How a value has to be written so it can't break the file it lands in."""
    if suffix in XML_SUFFIXES:
        return lambda v: xml_escape(v, {'"': "&quot;"})
    if suffix == ".json":
        return lambda v: json.dumps(v, ensure_ascii=False)[1:-1]
    return lambda v: v


def render(text: str, ctx: dict[str, str], where: Path) -> str:
    escape = escaper(where.suffix)

    def line_of(pos: int) -> int:
        return text.count("\n", 0, pos) + 1

    # A {{ that isn't a well-formed placeholder would otherwise be copied out as it is.
    for m in re.finditer(r"\{\{", text):
        if not TOKEN.match(text, m.start()):
            snippet = text[m.start() : text.find("\n", m.start()) % (len(text) + 1)][:40]
            die(
                f"templates/{where}:{line_of(m.start())}: malformed placeholder '{snippet}' "
                "(expected {{ name }} or {{ name | filter }}; for literal braces, put a space between them)"
            )

    def sub(m: re.Match) -> str:
        name, filt = m.group(1), m.group(2)
        at = f"templates/{where}:{line_of(m.start())}"
        if name not in ctx:
            die(f"{at}: unknown name '{name}'")
        value = ctx[name]
        if filt:
            if filt not in FILTERS:
                die(f"{at}: unknown filter '{filt}'")
            if not HEX.match(value):
                die(f"{at}: filter '{filt}' needs a color, but {name} is '{value}'")
            value = FILTERS[filt](value)
        return escape(value)

    return TOKEN.sub(sub, text)


def check(rendered: str, rel: Path) -> None:
    """Parse the structured outputs, so a template can't render to a file its app rejects."""
    if rel.suffix == ".json":
        try:
            json.loads(rendered)
        except json.JSONDecodeError as e:
            die(f"templates/{rel} renders to invalid JSON: {e}")
    elif rel.suffix in XML_SUFFIXES:
        try:
            minidom.parseString(rendered.encode())
        except ExpatError as e:
            die(f"templates/{rel} renders to invalid XML: {e}")


def package_vsix(dist: Path, ctx: dict[str, str]) -> Path:
    """Zip dist/vscode into a .vsix (it's just a zip), so no vsce or npm is needed."""
    root = dist / "vscode"
    shutil.copy(ROOT / "LICENSE", root / "extension" / "LICENSE.txt")
    vsix = root / f"{ctx['meta.slug']}-{ctx['meta.version']}.vsix"
    with zipfile.ZipFile(vsix, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(root.rglob("*")):
            if f.is_file() and f.suffix != ".vsix":
                z.write(f, f.relative_to(root).as_posix())
    return vsix


def output_path(rel: Path) -> Path:
    """Where templates/<rel> lands, relative to the repo root."""
    # Neovim plugin managers put the repo itself on the runtimepath, so its files go to the
    # root (colors/neoplasticism.lua) instead of dist/nvim/.
    if rel.parts[0] == "nvim":
        if len(rel.parts) < 3 or rel.parts[1] not in NVIM_DIRS:
            die(
                f"templates/{rel}: templates/nvim/ is copied to the repo root, so only "
                f"{', '.join(d + '/' for d in NVIM_DIRS)} are allowed there"
            )
        return Path(*rel.parts[1:])
    return Path("dist") / rel


def swap(stage: Path, generated: list[str]) -> None:
    """Move the finished folders from the scratch build into the repo, replacing the old ones."""
    old = stage / ".old"
    old.mkdir()
    for name in generated:
        new, live = stage / name, ROOT / name
        if live.exists():
            live.rename(old / name)
        if new.exists():
            new.rename(live)


def main() -> None:
    ctx = load_palette()
    sources = [p for p in sorted(TEMPLATES.rglob("*")) if p.is_file() and p.name != ".DS_Store"]
    if not sources:
        die("templates/ is empty")

    # The scratch folder sits next to the output so the final move is a rename, not a copy.
    stage = Path(tempfile.mkdtemp(prefix=".build-", dir=ROOT))
    try:
        outputs: list[Path] = []
        for src in sources:
            rel = src.relative_to(TEMPLATES)
            out = output_path(rel)
            dest = stage / out
            dest.parent.mkdir(parents=True, exist_ok=True)
            data = src.read_bytes()
            try:
                text = data.decode("utf-8")
            except UnicodeDecodeError:
                dest.write_bytes(data)  # not text (an icon, a font): copied as it is
            else:
                rendered = render(text, ctx, rel)
                check(rendered, rel)
                dest.write_text(rendered)
            outputs.append(out)
        outputs.append(package_vsix(stage / "dist", ctx).relative_to(stage))

        generated = sorted(set(ALWAYS_GENERATED) | {out.parts[0] for out in outputs})
        swap(stage, generated)
    finally:
        shutil.rmtree(stage, ignore_errors=True)

    for out in outputs:
        print(f"  {out}")


if __name__ == "__main__":
    main()
