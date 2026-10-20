# OpthaEdge edge inference service

Runs on the Raspberry Pi 4. `pi_infer.py` and the two ONNX models are copied
unchanged from the training notebook's `pi_deploy` export (section 22);
`server.py` wraps them in FastAPI as described in the UI Deployment Guide §3.

| Endpoint | Purpose |
|---|---|
| `GET /health` | model file, artifact SHA-256, preprocessing version, camera status |
| `POST /predict` (multipart `file`) | quality gate → preprocessing → 5-grade prediction (+ 224 px model-input PNG) |
| `POST /capture` | Pi camera still through the 20D lens, same pipeline, returns the captured JPEG |
| `GET /preview.mjpg` | live low-resolution stream for aligning the lens |

All except `/health` require the `X-Inference-Key` header when `INFERENCE_API_KEY` is set.

## Environment

| Variable | Default | |
|---|---|---|
| `MODEL_PATH` | `models/student_int8.onnx` | or `models/student_fp32.onnx` |
| `THREADS` | `4` | ONNX Runtime intra-op threads |
| `INFERENCE_API_KEY` | empty | shared secret with the platform |
| `CAMERA` | `auto` | `auto`, `on` (fail if missing), `off` |
| `CAMERA_FLIP` | `none` | `h`, `v`, `both` (20D image is inverted) |
| `BLUR_MIN` | `30` | Laplacian-variance threshold — calibrate |
| `BRIGHT_MIN` / `BRIGHT_MAX` | `25` / `220` | mean grey-level range — calibrate |

## Run

```bash
python3 -m venv --system-site-packages ~/ded && source ~/ded/bin/activate   # system packages for picamera2
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001
python3 test_parity.py samples/     # CLI and API grades must match
```

The original CLI still works; run it from `models/` so it finds both artifacts:
`cd models && python3 ../pi_infer.py ../samples/ --benchmark 50`.
