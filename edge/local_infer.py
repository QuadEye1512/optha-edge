#!/usr/bin/env python3
"""Local fallback runner used by the OpthaEdge platform when the Raspberry Pi
is not reachable. Same pipeline and model as the Pi service (pipeline.py).

  python local_infer.py --health          -> health JSON on stdout
  python local_infer.py < image.jpg       -> prediction JSON on stdout

Model: LOCAL_MODEL_PATH (default models/student_int8.onnx). Exit codes:
0 success, 2 invalid image, 1 any other error (JSON {"error": ...} on stdout).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def emit(payload, code=0):
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()
    sys.exit(code)


def main():
    try:
        import pipeline

        pipe = pipeline.from_env(runtime="local", model_env="LOCAL_MODEL_PATH")
    except Exception as exc:  # missing packages, missing model file
        emit({"error": f"Local model unavailable: {type(exc).__name__}: {exc}"}, 1)

    if "--health" in sys.argv:
        emit(pipe.health({"available": False, "detail": "Local fallback on this computer (no Pi camera)", "flip": "none"}))

    try:
        bgr = pipeline.decode_image(sys.stdin.buffer.read())
    except ValueError as exc:
        emit({"error": str(exc)}, 2)
    emit(pipe.run(bgr, include_preview=True))


if __name__ == "__main__":
    main()
