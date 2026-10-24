# -*- coding: utf-8 -*-
"""Build the standard asset set for one «Праздник» figurine (FIGURINE_ADDING_SKILL.md).

Usage:
  python3 scripts/build_figurine.py <slug> <source_dir_with_1..24.png> <config.json> [--home-only]

config.json (measured by hand on the source photo, see §3 of the standard):
  {"home_frame": 24, "y_head": 1170, "y_base": 5396,
   "stills": [1, 4, 7, 13, 19, 22],
   "spin_frames": [1, 2, ...]}   # optional: drop broken/duplicate source frames, never synthesise

Outputs into assets/<slug>/:
  studio-home.webp      257x771, body 680 px, equal top/bottom margins
  recent-thumb.webp     230x551, body 480 px, equal top/bottom margins
  photo-0N-showcase.webp 720x960 (6 views), photo-0N-large.webp 1086x1448
  spin-01..24.webp      720x960, one fixed transform for all 24 frames
  build-audit.json      all measurements
Originals are never modified. No generative processing.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

HOME_BG = (234, 230, 223)          # #eae6df — фон слота на главной
ALPHA_T = 8                        # порог видимости силуэта

def load(src, n):
    im = Image.open(src / f"{n}.png")
    im.load()
    if im.mode != "RGBA":
        raise SystemExit(f"{n}.png: нет прозрачности ({im.mode})")
    return im

def bbox(im):
    a = np.array(im.getchannel("A")) > ALPHA_T
    ys, xs = np.where(a.any(1))[0], np.where(a.any(0))[0]
    return int(xs[0]), int(ys[0]), int(xs[-1]) + 1, int(ys[-1]) + 1

def scale_rgba(im, k):
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    return im.convert("RGBa").resize((w, h), Image.LANCZOS).convert("RGBA")

def place(im, box, k, canvas, top):
    """Crop box, scale by k, centre horizontally, put box top at `top`."""
    part = scale_rgba(im.crop(box), k)
    cv = Image.new("RGBA", canvas, (0, 0, 0, 0))
    cv.alpha_composite(part, ((canvas[0] - part.width) // 2, top))
    return cv

def contact_shadow(fig_rgba, base_y):
    """Soft natural contact shadow under the base, only below base_y."""
    a = np.array(fig_rgba.getchannel("A")).astype(float) / 255
    xs = np.where(a[max(0, base_y - 4):base_y].max(0) > 0.5)[0]
    sh = Image.new("L", fig_rgba.size, 0)
    if len(xs):
        from PIL import ImageDraw
        d = ImageDraw.Draw(sh)
        x0, x1 = xs[0], xs[-1]
        d.ellipse((x0 - 4, base_y - 5, x1 + 4, base_y + 5), fill=70)
        sh = sh.filter(ImageFilter.GaussianBlur(4))
    return sh

def studio_light(fig, base_y):
    """Deterministic 'studio' look for home / recent images only (approved by Oleg 2026-10-24):
    local contrast + gentle S-curve + soft key light from upper left, tight contact shadow
    and wide soft cast shadow, faint glow behind the figure fading exactly to HOME_BG at the edges.
    Shape, face, paint and colours of the work are not altered."""
    W, H = fig.size
    s = H / 771                                   # scale constants to the canvas
    f = np.array(fig).astype(float); rgb = f[..., :3]
    lum = rgb.mean(2)
    blur = np.array(Image.fromarray(lum.clip(0, 255).astype("uint8"))
                    .filter(ImageFilter.GaussianBlur(14 * s))).astype(float)
    rgb = rgb + ((lum - blur) * 0.45)[..., None]
    x = rgb / 255; x = x + 0.10 * (x - 0.5) * (1 - abs(2 * x - 1)); rgb = x * 255
    yy, xx = np.mgrid[0:H, 0:W]
    rgb = rgb * (1.07 - 0.14 * ((xx / W) * 0.35 + (yy / H) * 0.65))[..., None]
    f[..., :3] = rgb.clip(0, 255)
    lit = Image.fromarray(f.astype("uint8"), "RGBA")
    d = np.sqrt(((xx - W * 0.5) / (W * 0.62)) ** 2 + ((yy - H * 0.42) / (H * 0.55)) ** 2)
    bg = np.array(HOME_BG, float)[None, None, :] + (np.clip(1 - d, 0, 1) ** 1.6)[..., None] * np.array([12, 12, 11])
    edge = np.minimum.reduce([xx, W - 1 - xx, yy, H - 1 - yy])
    bg = np.where((edge < 6)[..., None], np.array(HOME_BG, float), bg)
    out = Image.fromarray(bg.clip(0, 255).astype("uint8")).convert("RGBA")
    a = np.array(fig.getchannel("A")).astype(float) / 255
    by = int(round(base_y))
    xs = np.where(a[max(0, by - 6):by].max(0) > 0.5)[0]
    if len(xs):
        from PIL import ImageDraw
        x0, x1 = xs[0], xs[-1]; cx = (x0 + x1) / 2; wd = x1 - x0
        wide = Image.new("L", fig.size, 0)
        ImageDraw.Draw(wide).ellipse((cx - wd * .75, by - 6 * s, cx + wd * .75 + 14 * s, by + 12 * s), fill=55)
        wide = wide.filter(ImageFilter.GaussianBlur(9 * s))
        tight = Image.new("L", fig.size, 0)
        ImageDraw.Draw(tight).ellipse((x0 - 2, by - 3 * s, x1 + 2, by + 3 * s), fill=120)
        tight = tight.filter(ImageFilter.GaussianBlur(2.5 * s))
        sh = Image.fromarray(np.maximum(np.array(wide), np.array(tight)))
        out.paste(Image.new("RGBA", fig.size, (55, 45, 35, 255)), (0, 0), sh)
    out.alpha_composite(lit)
    return out

def home_image(im, cfg, body, canvas, out):
    H_src = cfg["y_base"] - cfg["y_head"]
    k = body / H_src
    b = bbox(im)
    sil_h = round((b[3] - b[1]) * k)
    top = (canvas[1] - sil_h) // 2
    fig = place(im, b, k, canvas, top)
    fb = bbox(fig)
    y_head_out = top + (cfg["y_head"] - b[1]) * k
    y_base_out = top + (cfg["y_base"] - b[1]) * k
    if cfg.get("studio", True):
        bg = studio_light(fig, y_base_out)
    else:
        bg = Image.new("RGBA", canvas, HOME_BG + (255,))
        shadow = contact_shadow(fig, round(y_base_out))
        bg.paste(Image.new("RGBA", canvas, (60, 50, 40, 255)), (0, 0), shadow)
        bg.alpha_composite(fig)
    bg.convert("RGB").save(out, "WEBP", quality=90, method=6)
    return {
        "file": out.name, "canvas": list(canvas), "H_body_source": H_src,
        "k": round(k, 6), "H_body_output": round(y_base_out - y_head_out, 1),
        "y_head_output": round(y_head_out, 1), "y_base_output": round(y_base_out, 1),
        "silhouette_bbox_output": list(fb),
        "top_margin": fb[1], "bottom_margin": canvas[1] - fb[3],
        "left_margin": fb[0], "right_margin": canvas[0] - fb[2],
    }

def main():
    slug, src, cfg_path = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
    cfg = json.loads(cfg_path.read_text())
    out = Path("assets") / slug
    out.mkdir(parents=True, exist_ok=True)
    spin_frames = cfg.get("spin_frames", list(range(1, 25)))   # original frame numbers, in turn order
    frames = {n: load(src, n) for n in spin_frames}
    sizes = {im.size for im in frames.values()}
    if len(sizes) != 1:
        raise SystemExit(f"разные размеры кадров: {sizes}")
    boxes = {n: bbox(im) for n, im in frames.items()}
    U = (min(b[0] for b in boxes.values()), min(b[1] for b in boxes.values()),
         max(b[2] for b in boxes.values()), max(b[3] for b in boxes.values()))
    audit = {"slug": slug, "source_size": list(sizes.pop()), "union_bbox_24": list(U),
             "config": cfg, "frame_bboxes": {n: list(b) for n, b in boxes.items()}}

    # 1) studio-home and recent-thumb — measured body height
    home = frames[cfg["home_frame"]]
    audit["studio_home"] = home_image(home, cfg, 680, (257, 771), out / "studio-home.webp")
    audit["recent_thumb"] = home_image(home, cfg, 480, (230, 551), out / "recent-thumb.webp")

    if "--home-only" in sys.argv:
        prev = out / "build-audit.json"
        if prev.exists():
            keep = json.loads(prev.read_text())
            keep.update({k: audit[k] for k in ("studio_home", "recent_thumb", "config")})
            audit = keep
        prev.write_text(json.dumps(audit, ensure_ascii=False, indent=1))
        print(json.dumps({k: audit[k] for k in ("studio_home", "recent_thumb")}, ensure_ascii=False, indent=1))
        return

    # 2) 360° — one fixed transform for all 24 frames (camera and turntable axis fixed)
    k_spin = (960 - 2 * 50) / (U[3] - U[1])
    for i, n in enumerate(spin_frames, 1):
        place(frames[n], U, k_spin, (720, 960), 50).save(
            out / f"spin-{i:02d}.webp", "WEBP", quality=84, method=6)
    audit["spin"] = {"canvas": [720, 960], "k": round(k_spin, 6), "top": 50,
                     "count": len(spin_frames), "source_frames": spin_frames,
                     "union_height_output": round((U[3] - U[1]) * k_spin, 1)}

    # 3) six card views + loupe — same fixed transform, larger figure
    k_show = (960 - 2 * 18) / (U[3] - U[1])
    k_large = k_show * 1086 / 720
    for i, n in enumerate(cfg["stills"], 1):
        place(frames[n], U, k_show, (720, 960), 18).save(
            out / f"photo-{i:02d}-showcase.webp", "WEBP", quality=88, method=6)
        place(frames[n], U, k_large, (1086, 1448), round(18 * 1086 / 720)).save(
            out / f"photo-{i:02d}-large.webp", "WEBP", quality=90, method=6)
    audit["stills"] = {"frames": cfg["stills"], "angles": ["0°", "+45°", "+90°", "180°", "−90°", "−45°"],
                       "showcase_k": round(k_show, 6), "large_k": round(k_large, 6)}
    (out / "build-audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=1))
    print(json.dumps({k: audit[k] for k in ("studio_home", "recent_thumb", "spin", "stills")},
                     ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
