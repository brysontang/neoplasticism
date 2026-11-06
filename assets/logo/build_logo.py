"""Build the neoplasticism logo as vector art.

Geometry matches the v6 explorer: three fans 120 degrees apart. Where fans
overlap, the fan whose line index (u, 0..1 across its base) is higher wins,
which is the continuous version of the interleaved drawing order in the
original p5 sketch. The seams between colors get a white band.
"""
import math
import sys
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
from shapely import affinity

SZ = 1024.0
PARAMS = dict(twist=0.0, spread=0.52, reach=1.00, pad=0.08)
BG = "#030303"
WHITE = "#ffffff"
COLS = ["#e9df90", "#8fd0ff", "#ffadb9"]
WEDGES = 1600  # thin slices per fan used to build the curved seams


def fans(p):
    c, R = SZ / 2, SZ * 0.4
    out = []
    for k in range(3):
        th = -math.pi / 2 + k * 2 * math.pi / 3
        bx, by = c + R * math.cos(th), c + R * math.sin(th)
        ax, ay = math.cos(th + math.pi / 2), math.sin(th + math.pi / 2)
        h = SZ * p["spread"] / 2
        a, d = th + math.pi + p["twist"], R * p["reach"]
        p1 = (bx - ax * h, by - ay * h)
        p2 = (bx + ax * h, by + ay * h)
        apex = (c + d * math.cos(a), c + d * math.sin(a))
        out.append((p1, p2, apex))
    return out


def base_pt(f, u):
    (x1, y1), (x2, y2), _ = f
    return (x1 + (x2 - x1) * u, y1 + (y2 - y1) * u)


def subfan(f, u0, u1):
    """Part of fan f whose lines have index between u0 and u1."""
    return Polygon([f[2], base_pt(f, u0), base_pt(f, u1)]).buffer(0)


def build(p, seam_w):
    F = fans(p)
    tris = [subfan(f, 0, 1) for f in F]

    regions = []
    for k in range(3):
        beaten = []
        for j in range(3):
            if j == k:
                continue
            overlap = tris[j].intersection(tris[k])
            if overlap.is_empty:
                continue
            # points of fan j (wedge with index around u) where fan k's index is lower
            pieces = []
            for w in range(WEDGES):
                a, b = w / WEDGES, (w + 1) / WEDGES
                mid = (a + b) / 2
                if j < k:  # tie-break matches the explorer (later colour wins exact ties)
                    mid -= 1e-9
                wedge = subfan(F[j], a, b)
                if not wedge.intersects(overlap):
                    continue
                piece = wedge.intersection(subfan(F[k], 0, mid))
                if not piece.is_empty:
                    pieces.append(piece)
            if pieces:
                beaten.append(unary_union(pieces))
        region = tris[k].difference(unary_union(beaten)) if beaten else tris[k]
        regions.append(region.buffer(0))

    coloured = unary_union(regions)
    seams = []
    hw = seam_w / 2
    for a in range(3):
        for b in range(a + 1, 3):
            band = regions[a].buffer(hw).intersection(regions[b].buffer(hw))
            if not band.is_empty:
                seams.append(band)
    white = unary_union(seams).intersection(coloured) if seams else None
    return regions, white


def fit(p):
    """Scale and center the whole mark inside the square, nothing clipped."""
    union = unary_union([subfan(f, 0, 1) for f in fans(p)])
    x0, y0, x1, y1 = union.bounds
    s = SZ * (1 - 2 * p["pad"]) / max(x1 - x0, y1 - y0)
    tx = SZ / 2 - s * (x0 + x1) / 2
    ty = SZ / 2 - s * (y0 + y1) / 2
    return s, tx, ty


def build_fitted(p, seam_w):
    s, tx, ty = fit(p)
    regions, white = build(p, seam_w / s)
    move = lambda g: affinity.translate(affinity.scale(g, s, s, origin=(0, 0)), tx, ty).simplify(0.15)
    return [move(r) for r in regions], (move(white) if white is not None else None)


def to_path(geom):
    polys = getattr(geom, "geoms", [geom])
    parts = []
    for poly in polys:
        if poly.is_empty or poly.geom_type != "Polygon":
            continue
        for ring in [poly.exterior, *poly.interiors]:
            pts = list(ring.coords)
            parts.append("M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts[:-1]) + "Z")
    return " ".join(parts)


def svg(regions, white, with_bg=True, rounded=False):
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SZ:.0f} {SZ:.0f}" width="{SZ:.0f}" height="{SZ:.0f}">',
           "<title>neoplasticism</title>"]
    if with_bg:
        r = f' rx="{SZ*0.18:.0f}"' if rounded else ""
        out.append(f'<rect width="{SZ:.0f}" height="{SZ:.0f}"{r} fill="{BG}"/>')
    for reg, col in zip(regions, COLS):
        out.append(f'<path fill="{col}" fill-rule="evenodd" d="{to_path(reg)}"/>')
    if white is not None and not white.is_empty:
        out.append(f'<path fill="{WHITE}" fill-rule="evenodd" d="{to_path(white)}"/>')
    out.append("</svg>")
    return "\n".join(out)


if __name__ == "__main__":
    outdir = sys.argv[1]
    # main mark: seam width 5 at 800px, scaled to 1024
    regions, white = build_fitted(PARAMS, seam_w=5 * SZ / 800)
    open(f"{outdir}/neoplasticism-logo.svg", "w").write(svg(regions, white))
    open(f"{outdir}/neoplasticism-logo-transparent.svg", "w").write(svg(regions, white, with_bg=False))
    print("ok", [r.area for r in regions], white.area if white else 0)
