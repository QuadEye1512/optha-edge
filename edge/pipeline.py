"""Shared OpthaEdge inference pipeline: quality gate -> pi_infer preprocessing -> ONNX.

Used by server.py (the Raspberry Pi service) and local_infer.py (the platform's
local fallback when the Pi is not connected), so both produce identical
results from identical code. Preprocessing is always pi_infer.preprocess_array.
"""
import base64
import hashlib
import os
import socket
import time

import cv2
import numpy as np

import pi_infer

HERE = os.path.dirname(os.path.abspath(__file__))
PREPROC_VERSION = "stage1-roi-224-v1"
DEFAULT_MODEL = os.path.join(HERE, "models", "student_int8.onnx")


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


class Pipeline:
    def __init__(self, model_path, threads=4, blur_min=30.0, bright_range=(25.0, 220.0), runtime="edge"):
        self.model_path = model_path
        self.model_file = os.path.basename(model_path)
        self.model_version = "student-mnv3-litecbam-" + self.model_file
        self.threads = threads
        self.blur_min = blur_min
        self.bright_range = bright_range
        self.runtime = runtime
        self.host = socket.gethostname()
        self.artifact_sha256 = sha256_file(model_path)
        self.sess = pi_infer.load_session(model_path, threads)
        # Warm-up so the first clinical request is not slow (guide, section 9).
        self.sess.run(None, {"input": np.zeros((1, 3, 224, 224), np.float32)})

    def quality(self, bgr):
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        sharp = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        bright = float(gray.mean())
        return {
            "gradable": True,
            "sharpness": round(sharp, 1),
            "brightness": round(bright, 1),
            "reasons": [],
            "thresholds": {"blur_min": self.blur_min, "brightness_range": list(self.bright_range)},
        }

    @staticmethod
    def model_input_png(x):
        """The exact 224x224 image the model saw, for clinician inspection."""
        rgb = (x[0].transpose(1, 2, 0) * 255.0).clip(0, 255).astype(np.uint8)
        ok, buf = cv2.imencode(".png", cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
        return base64.b64encode(buf.tobytes()).decode() if ok else None

    def health(self, camera=None):
        return {
            "status": "ok",
            "model": self.model_version,
            "model_file": self.model_file,
            "artifact_sha256": self.artifact_sha256,
            "preprocessing": PREPROC_VERSION,
            "labels": pi_infer.CLASS_NAMES,
            "threads": self.threads,
            "camera": camera or {"available": False, "detail": "No camera on this runtime", "flip": "none"},
            "auth_required": False,
            "runtime": self.runtime,
            "host": self.host,
        }

    def run(self, bgr, include_preview=True):
        base = {
            "model_version": self.model_version,
            "model_file": self.model_file,
            "artifact_sha256": self.artifact_sha256,
            "preprocessing_version": PREPROC_VERSION,
            "image_width": int(bgr.shape[1]),
            "image_height": int(bgr.shape[0]),
            "research_only": True,
            "runtime": self.runtime,
            "host": self.host,
        }
        q = self.quality(bgr)

        t0 = time.perf_counter()
        x = pi_infer.preprocess_array(bgr)
        t1 = time.perf_counter()
        grade, p = pi_infer.predict(self.sess, x)
        t2 = time.perf_counter()
        probs = [float(v) for v in p]
        return {
            **base,
            "gradable": True,
            "quality": q,
            "grade": grade,
            "label": pi_infer.CLASS_NAMES[grade],
            "confidence": probs[grade],
            "probabilities": dict(zip(pi_infer.CLASS_NAMES, probs)),
            "probability_vector": probs,
            "any_dr_probability": 1.0 - probs[0],          # DR / non-DR mode (grade >= 1)
            "referable_probability": sum(probs[2:]),        # moderate or worse
            "preprocess_ms": round((t1 - t0) * 1000, 1),
            "latency_ms": round((t2 - t1) * 1000, 1),
            "model_input_png": self.model_input_png(x) if include_preview else None,
        }


def from_env(runtime, model_env="MODEL_PATH"):
    return Pipeline(
        model_path=os.environ.get(model_env) or DEFAULT_MODEL,
        threads=int(os.environ.get("THREADS", "4")),
        blur_min=float(os.environ.get("BLUR_MIN", "0")),
        bright_range=(float(os.environ.get("BRIGHT_MIN", "0")), float(os.environ.get("BRIGHT_MAX", "255"))),
        runtime=runtime,
    )


def decode_image(data, max_bytes=15 * 1024 * 1024):
    """Returns a BGR image or raises ValueError with a user-facing reason."""
    if not data:
        raise ValueError("Empty image")
    if len(data) > max_bytes:
        raise ValueError("Image too large")
    bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Not a valid image")
    return bgr
