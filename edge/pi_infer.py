#!/usr/bin/env python3
"""OpthaEdge-DED  -  Raspberry Pi 4 inference for the INT8 MobileNetV3+LiteCBAM student.

  python3 pi_infer.py samples/                       # run on a folder
  python3 pi_infer.py fundus.png --threads 4         # single image
  python3 pi_infer.py samples/ --benchmark 50        # latency
  python3 pi_infer.py --camera --model student_int8.onnx   # Pi camera (picamera2)

Model contract: input  float32 (N,3,224,224) RGB in [0,1]  (ImageNet mean/std baked in)
                output float32 (N,5) logits -> argmax = DR grade 0..4
"""
import argparse, glob, os, sys, time
import cv2
import numpy as np
import onnxruntime as ort

CLASS_NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative DR"]


# ---- preprocessing: IDENTICAL to the training notebook (section 2) ---------
def stage1_denoise(img, sigma=10, alpha=4, beta=-4, C=128):
    smoothed = cv2.GaussianBlur(img, (0, 0), sigma)
    return cv2.addWeighted(img, alpha, smoothed, beta, C)


def stage2_roi_selection(img):
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    ys, xs = np.where(mask > 0)
    if len(xs) == 0 or len(ys) == 0:
        return img
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max(), ys.max()
    if x1 <= x0 or y1 <= y0:
        return img
    return img[y0:y1, x0:x1]


def preprocess_array(bgr):
    """BGR uint8 image -> (1,3,224,224) float32 in [0,1]."""
    img = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    img = stage1_denoise(img)
    img = stage2_roi_selection(img)
    img = cv2.resize(img, (384, 384), interpolation=cv2.INTER_AREA)   # as in training PNGs
    img = cv2.resize(img, (224, 224), interpolation=cv2.INTER_AREA)   # student input size
    return (img.astype(np.float32) / 255.0).transpose(2, 0, 1)[None]


def preprocess(path):
    bgr = cv2.imread(path)
    if bgr is None:
        raise FileNotFoundError(path)
    return preprocess_array(bgr)


def load_session(model, threads=4):
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = threads
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    return ort.InferenceSession(model, opts, providers=["CPUExecutionProvider"])


def predict(sess, x):
    logits = sess.run(None, {"input": x})[0][0]
    p = np.exp(logits - logits.max())
    p /= p.sum()
    return int(p.argmax()), p


def capture_camera(path="capture.png"):
    from picamera2 import Picamera2          # sudo apt install python3-picamera2
    cam = Picamera2()
    cam.configure(cam.create_still_configuration())
    cam.start(); time.sleep(2)               # let exposure settle
    cam.capture_file(path); cam.stop()
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="*", help="image file(s) or folder(s)")
    ap.add_argument("--model", default="student_int8.onnx")
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--benchmark", type=int, default=0, help="N timed runs per model")
    ap.add_argument("--camera", action="store_true")
    a = ap.parse_args()

    files = []
    for p in a.inputs:
        files += sorted(glob.glob(os.path.join(p, "*"))) if os.path.isdir(p) else [p]
    if a.camera:
        files.append(capture_camera())
    files = [f for f in files if f.lower().endswith((".png", ".jpg", ".jpeg"))]

    sess = load_session(a.model, a.threads)
    print(f"model={a.model} threads={a.threads}")
    for f in files:
        t0 = time.perf_counter()
        x = preprocess(f)
        t1 = time.perf_counter()
        grade, p = predict(sess, x)
        t2 = time.perf_counter()
        print(f"{os.path.basename(f):32s} -> grade {grade} ({CLASS_NAMES[grade]})  "
              f"conf={p[grade]:.2f}  prep={1000*(t1-t0):.0f}ms  infer={1000*(t2-t1):.1f}ms")

    if a.benchmark and files:
        x = preprocess(files[0])
        for name in ("student_int8.onnx", "student_fp32.onnx"):
            if not os.path.exists(name):
                continue
            s = load_session(name, a.threads)
            for _ in range(5):
                s.run(None, {"input": x})
            t0 = time.perf_counter()
            for _ in range(a.benchmark):
                s.run(None, {"input": x})
            ms = (time.perf_counter() - t0) / a.benchmark * 1000
            print(f"benchmark {name:20s} {ms:7.1f} ms/img  ({a.threads} threads, model only)")


if __name__ == "__main__":
    main()
