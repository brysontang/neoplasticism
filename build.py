#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# ///
"""Render every file in templates/ into dist/, with palette.toml as the only source of color.

    ./build.py            (or: uv run build.py, python3 build.py)

templates/<app>/<path> becomes dist/<app>/<path>, except templates/nvim/<path>, which becomes
<path> at the repo root so plugin managers find colors/neoplasticism.lua. Placeholders look like {{ name }} or
{{ name | filter }}; an unknown name stops the build so a typo can't ship a broken theme.
"""

import json
import re
import shutil
import sys
import tomllib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TEMPLATES = ROOT / "templates"
DIST = ROOT / "dist"
# Everything build.py writes. Wiped before each build so a deleted template can't linger.
GENERATED = [DIST, ROOT / "colors"]

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
TOKEN = re.compile(r"\{\{\s*([\w.]+)\s*(?:\|\s*(\w+)\s*)?\}\}")
FILTERS = {
    "rgb": lambda h: ", ".join(str(int(h[i : i + 2], 16)) for i in (1, 3, 5)),
    "bare": lambda h: h[1:],
}


def die(msg: str) -> None:
    sys.exit(f"build.py: {msg}")


def load_palette() -> dict[str, str]:
    data = tomllib.loads((ROOT / "palette.toml").read_text())

    raw: dict[str, str] = {}
    for table in ("colors", "shades", "roles"):
        for key, value in data.get(table, {}).items():
            if key in raw:
                die(f"palette.toml: '{key}' is defined twice")
            raw[key] = value
    for key, value in data.get("ansi", {}).items():
        raw[f"ansi.{key}"] = value

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

    def color_name(role: str) -> str:
        # Follow the role to the first named color it points at, e.g. variable -> yellow.
        value = raw[role]
        while value in raw and value not in data.get("colors", {}):
            value = raw[value]
        return value

    meta = dict(data["meta"])
    meta.setdefault(
        "description",
        "After Mondrian. Three things get color: "
        f"variables ({color_name('variable')}), functions ({color_name('function')}), "
        f"literals ({color_name('literal')}). Everything else is {color_name('fg')}.",
    )
    for key, value in meta.items():
        ctx[f"meta.{key}"] = str(value)
    return ctx


def render(text: str, ctx: dict[str, str], where: Path) -> str:
    def sub(m: re.Match) -> str:
        name, filt = m.group(1), m.group(2)
        line = text.count("\n", 0, m.start()) + 1
        if name not in ctx:
            die(f"templates/{where}:{line}: unknown name '{name}'")
        value = ctx[name]
        if filt:
            if filt not in FILTERS:
                die(f"templates/{where}:{line}: unknown filter '{filt}'")
            value = FILTERS[filt](value)
        return value

    return TOKEN.sub(sub, text)


def package_vsix(ctx: dict[str, str]) -> Path:
    """Zip dist/vscode into a .vsix (it's just a zip), so no vsce or npm is needed."""
    root = DIST / "vscode"
    shutil.copy(ROOT / "LICENSE", root / "extension" / "LICENSE.txt")
    vsix = root / f"{ctx['meta.slug']}-{ctx['meta.version']}.vsix"
    with zipfile.ZipFile(vsix, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(root.rglob("*")):
            if f.is_file() and f.suffix != ".vsix":
                z.write(f, f.relative_to(root).as_posix())
    return vsix


def output_path(rel: Path) -> Path:
    # Neovim plugin managers put the repo itself on the runtimepath, so its files go to the
    # root (colors/neoplasticism.lua) instead of dist/nvim/.
    if rel.parts[0] == "nvim":
        return ROOT.joinpath(*rel.parts[1:])
    return DIST / rel


def main() -> None:
    ctx = load_palette()
    for d in GENERATED:
        if d.exists():
            shutil.rmtree(d)

    for src in sorted(TEMPLATES.rglob("*")):
        if src.is_dir() or src.name == ".DS_Store":
            continue
        rel = src.relative_to(TEMPLATES)
        out = output_path(rel)
        out.parent.mkdir(parents=True, exist_ok=True)
        rendered = render(src.read_text(), ctx, rel)
        if out.suffix == ".json":
            try:
                json.loads(rendered)
            except json.JSONDecodeError as e:
                die(f"templates/{rel} renders to invalid JSON: {e}")
        out.write_text(rendered)
        print(f"  {out.relative_to(ROOT)}")

    vsix = package_vsix(ctx)
    print(f"  {vsix.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
