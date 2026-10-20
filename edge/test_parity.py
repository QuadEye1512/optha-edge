"""Parity test (UI Deployment Guide, section 7).

Runs every image through pi_infer.py directly and through the FastAPI /predict
endpoint and checks that grades and probabilities match.

  python test_parity.py                 # uses samples/ or synthetic images
  python test_parity.py path/to/images  # use your own fundus photos (recommended)

Synthetic images only prove the plumbing is identical; they say nothing about
accuracy. Put a few real fundus photos (one per grade) in samples/ for the
end-to-end check.
"""
import glob
import os
import sys
import tempfile

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ.setdefault("CAMERA", "off")
os.environ.pop("INFERENCE_API_KEY", None)

from fastapi.testclient import TestClient  # noqa: E402

import pi_infer  # noqa: E402
import server  # noqa: E402


def synthetic_fundus(path, seed):
    rng = np.random.default_rng(seed)
    h = w = 768
    img = np.zeros((h, w, 3), np.uint8)
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt((xx - w / 2) ** 2 + (yy - h / 2) ** 2)
    disc = r < 340
    shade = np.clip(1.0 - r / 420, 0, 1)
    img[..., 2] = (disc * (120 + 120 * shade)).astype(np.uint8)  # red
    img[..., 1] = (disc * (40 + 60 * shade)).astype(np.uint8)    # green
    img[..., 0] = (disc * (10 + 20 * shade)).astype(np.uint8)    # blue
    cx, cy = int(w / 2 + rng.integers(-150, 150)), int(h / 2 + rng.integers(-60, 60))
    cv2.circle(img, (cx, cy), 45, (170, 220, 250), -1)            # optic disc
    for _ in range(14):                                            # vessels
        angle = rng.uniform(0, 2 * np.pi)
        end = (int(cx + 330 * np.cos(angle)), int(cy + 330 * np.sin(angle)))
        cv2.line(img, (cx, cy), end, (20, 30, 110), int(rng.integers(2, 6)))
    for _ in range(int(rng.integers(0, 40))):                      # lesion-like dots
        p = (int(rng.integers(200, 570)), int(rng.integers(200, 570)))
        cv2.circle(img, p, int(rng.integers(2, 6)), (30, 30, 160) if seed % 2 else (150, 230, 240), -1)
    noise = rng.normal(0, 6, img.shape)
    img = np.clip(img.astype(np.float32) + noise * disc[..., None], 0, 255).astype(np.uint8)
    cv2.imwrite(path, img)
    return path


def collect(folder):
    if folder and os.path.isdir(folder):
        files = [f for f in sorted(glob.glob(os.path.join(folder, "*")))
                 if f.lower().endswith((".png", ".jpg", ".jpeg"))]
        if files:
            return files, False
    tmp = tempfile.mkdtemp(prefix="opthaedge-parity-")
    return [synthetic_fundus(os.path.join(tmp, f"synthetic_{i}.png"), i) for i in range(6)], True


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "samples")
    files, synthetic = collect(folder)
    client = TestClient(server.app)

    health = client.get("/health").json()
    print(f"model={health['model']} sha256={health['artifact_sha256'][:12]} "
          f"preprocessing={health['preprocessing']} camera={health['camera']['available']}")
    if synthetic:
        print("No sample images found - using synthetic images (plumbing check only).")

    failures = 0
    for f in files:
        grade, p = pi_infer.predict(server.sess, pi_infer.preprocess(f))
        with open(f, "rb") as fh:
            r = client.post("/predict", files={"file": (os.path.basename(f), fh, "image/png")})
        assert r.status_code == 200, r.text
        out = r.json()
        if not out["gradable"]:
            print(f"{os.path.basename(f):28s} ungradable by quality gate {out['quality']}")
            continue
        same = out["grade"] == grade and np.allclose(out["probability_vector"], p, atol=1e-6)
        failures += 0 if same else 1
        print(f"{os.path.basename(f):28s} cli={grade} api={out['grade']} "
              f"conf={out['confidence']:.3f} infer={out['latency_ms']}ms {'OK' if same else 'MISMATCH'}")
        assert out["model_input_png"], "model input preview missing"

    bad = client.post("/predict", files={"file": ("x.png", b"not an image", "image/png")})
    assert bad.status_code == 400, bad.text
    print("invalid image -> 400 OK")

    if failures:
        print(f"FAILED: {failures} mismatches")
        sys.exit(1)
    print("PARITY OK")


if __name__ == "__main__":
    main()
