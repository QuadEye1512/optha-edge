# OpthaEdge-DED - Raspberry Pi 4 deployment

Requires 64-bit Raspberry Pi OS (aarch64) - ONNX Runtime has no 32-bit wheel on PyPI.
  uname -m        # must print aarch64

  python3 -m venv ~/ded && source ~/ded/bin/activate
  pip install onnxruntime numpy opencv-python-headless

  python3 pi_infer.py samples/                 # predictions
  python3 pi_infer.py samples/ --benchmark 50  # FP32 vs INT8 latency on the Pi

Pi camera (Module v2) - needs the system picamera2 package:
  sudo apt install -y python3-picamera2
  python3 -m venv --system-site-packages ~/ded   # recreate venv with system packages
  python3 pi_infer.py --camera
