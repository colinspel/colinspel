"""Render a vertical (4:5, 1080x1350) video of featured goals for LinkedIn.
Frames are rendered deterministically (seek -> screenshot) so the 3D view is smooth
regardless of how fast the machine renders."""
import json, subprocess, sys, shutil
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from player_js import PLAYER_CSS, PLAYER_JS, PLAYER_HTML, PITCH_SVG, THREE_JS
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]; OUT = ROOT / "outputs"
G = json.loads((OUT / "goals.json").read_text())
ids = [int(a) for a in sys.argv[1:] if a.isdigit()] or [41, 61]
FPS = 24
css = """:root{--surface:#fcfcfb;--page:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;--border:transparent;--pitch:#e8eee4;
--pitch-line:#b3c0ad;--lev:#d7192d;--lev-ring:#fff;--opp:#7a7f8a;--trail:#3a3a3a}
body{margin:0;background:var(--page);font-family:system-ui,-apple-system,sans-serif;color:var(--ink)}
.wrap{padding:14px 14px 6px}.k{color:var(--lev);font-weight:800;letter-spacing:.08em;font-size:11px}
.gp{border:none;padding:4px 0 0;margin:4px 0 0}.gp-ctl,.gp-pick,.gp-key,.gp-cap{display:none!important}
.gp-stage{max-width:none}.gp-title{font-size:16px}.gp-sub{font-size:11px}
.foot{font-size:9.5px;color:var(--ink2);text-align:center;margin-top:5px}"""
html = f"""<!doctype html><meta charset=utf-8><style>{PLAYER_CSS}{css}</style><div class=wrap>
<div class=k>LEVERKUSEN 2023-24 · UNBEATEN</div>{PLAYER_HTML.format(start=ids[0], pitch=PITCH_SVG)}
<div class=foot>Rebuilt from Hudl StatsBomb event + 360 data · Colin Spelman</div></div>
<script>{THREE_JS}</script><script>window.GOALS={json.dumps(G)};{PLAYER_JS}</script>"""
page = OUT / "_clip.html"; page.write_text(html, encoding="utf-8")
frames = OUT / "_frames"
RESUME = "--resume" in sys.argv          # keep frames already rendered by an interrupted run
if not RESUME:
    shutil.rmtree(frames, ignore_errors=True)
frames.mkdir(exist_ok=True)
n = 0
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 432, "height": 540}, device_scale_factor=1.5)
    pg.goto(page.as_uri()); pg.wait_for_timeout(1500)
    # stop the autoplay loop so frames are only rendered when we seek
    pg.evaluate("document.querySelector('.gp').dataset.played=1; const b=document.querySelector('.gp-play'); if(b.textContent==='Pause') b.click();")
    pg.wait_for_timeout(300)
    for k, i in enumerate(ids):
        g = G[i]
        t0 = max(0.0, min(tr["pts"][0][0] for tr in g["tracks"]) - 0.4) if g["tracks"] else 0.0
        pg.evaluate(f"window.__gp[0].load({i})")
        t, end = t0, g["dur"] + 1.0          # hold on the GOAL banner for a second
        while t <= end:
            out = frames / f"f{n:05d}.png"
            if not (RESUME and out.exists() and out.stat().st_size > 0):
                pg.evaluate(f"window.__gp[0].seek({min(t, g['dur'])})")
                pg.screenshot(path=str(out))
            n += 1; t += 1 / FPS
    b.close()
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames / "f%05d.png"),
                "-vf", "scale=1080:1350:flags=lanczos", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "medium", str(OUT / "unbeaten_clip.mp4")], check=True)
shutil.rmtree(frames); page.unlink()
print("clip", n, "frames", round((OUT / "unbeaten_clip.mp4").stat().st_size / 1e6, 1), "MB")
