# Deploying OpthaEdge on a Raspberry Pi 4

This follows the *OpthaEdge-DED UI Deployment Guide* (FastAPI inference service,
Next.js platform calling it server-side, model registry, systemd, FP32/INT8
choice, safety checklist) and extends it with the Pi camera, patient records,
LLM education and phone access.

## 1. Hardware and OS

- Raspberry Pi 4 Model B, **4 GB or 8 GB** (the Next.js build needs the memory), 32 GB+ microSD or USB SSD.
- Raspberry Pi Camera Module (v2/v3/HQ) on the CSI port, mounted behind the **20D lens**.
- **64-bit Raspberry Pi OS (Bookworm)**. `uname -m` must print `aarch64` — ONNX Runtime has no 32-bit wheel.
- Enable SSH in Raspberry Pi Imager; give the Pi a fixed DHCP lease on the clinic router if possible.

## 2. Install everything (one command)

```bash
sudo apt install -y git
git clone <this repository> ~/opthaedge
cd ~/opthaedge
sudo ./deploy/install_pi.sh
```

The script:

1. installs PostgreSQL, Node.js 22, `python3-picamera2`/libcamera;
2. generates secrets in `/etc/opthaedge/opthaedge.env` (database password, session secret,
   image-encryption key, inference shared key) and `/etc/opthaedge/inference.env` (model, camera, thresholds);
3. creates the database, a Python venv (with system packages, for picamera2) and installs `edge/requirements.txt`;
4. runs `npm ci`, `prisma migrate deploy`, `npm run build` (≈10 minutes on a Pi 4) and the seed;
5. asks for the first administrator's email and password;
6. installs and starts `opthaedge-inference` (127.0.0.1:8001) and `opthaedge-web` (0.0.0.0:3000).

**Back up `/etc/opthaedge/opthaedge.env`.** Without `IMAGE_ENCRYPTION_KEY` the stored retinal images cannot be decrypted.

Enable AI education by adding your key and restarting:

```bash
sudo nano /etc/opthaedge/opthaedge.env      # OPENROUTER_API_KEY="sk-or-v1-..."
sudo systemctl restart opthaedge-web
```

The Pi needs internet only for this step; screening, records and the curated guidance work fully offline.

## 3. Connect the phones

- Same Wi-Fi as the Pi: open `http://<pi-ip>:3000` or `http://<hostname>.local:3000`.
- In Chrome (Android) choose **Add to Home screen**; in Safari (iOS) **Share → Add to Home Screen**.
- Sign in as the administrator, then create accounts under **Administration** for each clinician
  (can sign reviews and share) and screening technician (registers patients and captures images).

### No clinic Wi-Fi (screening camps): make the Pi a hotspot

```bash
sudo nmcli device wifi hotspot ifname wlan0 ssid OpthaEdge password 'choose-a-strong-passphrase'
sudo nmcli connection modify Hotspot connection.autoconnect yes
```

Phones join the `OpthaEdge` network and open `http://10.42.0.1:3000`.

### HTTPS (recommended before real patient data)

Over plain HTTP the session cookie cannot be `Secure`, so `SESSION_COOKIE_SECURE="false"` is set by
default. To add TLS on the LAN, put Caddy in front:

```bash
sudo apt install -y caddy
echo 'opthaedge.local {
  tls internal
  reverse_proxy 127.0.0.1:3000
}' | sudo tee /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

Install Caddy's root certificate on the phones, then set `SESSION_COOKIE_SECURE="true"` and
`PUBLIC_BASE_URL="https://opthaedge.local"` in `/etc/opthaedge/opthaedge.env` and restart `opthaedge-web`.

## 4. Camera and 20D lens

- Check the camera: `rpicam-hello -t 5000` (older OS: `libcamera-hello`).
- `/health` reports `camera.available`; the platform's dashboard shows *Pi camera: Ready*.
- The indirect-ophthalmoscopy image through a 20D lens is inverted. To display and store it upright set
  `CAMERA_FLIP="both"` in `/etc/opthaedge/inference.env` (`h` or `v` for one axis), then
  `sudo systemctl restart opthaedge-inference`.
- On the *New Screening* page use **Start live view** to align: lens about 5 cm from the eye, camera
  moved back until the retina fills the lens, optic disc and macula centred, no reflections.
- The capture is processed by exactly the same pipeline as uploads; the clinician sees both the
  original and the 224 px image the model received.

## 5. Calibrate the quality gate

`BLUR_MIN` (Laplacian variance, default 30) and `BRIGHT_MIN`/`BRIGHT_MAX` (mean grey level, 25–220)
are starting values from the guide. Capture 20 good and 20 poor images with the prototype, read the
`sharpness`/`brightness` values shown on each examination page, and set thresholds that separate them.

## 6. FP32 or INT8 (guide §7)

```bash
source /opt/opthaedge/venv/bin/activate
cd ~/opthaedge/edge/models            # pi_infer.py looks for both .onnx files in the current directory
python3 ../pi_infer.py ../samples/ --benchmark 50 --threads 4         # latency of both models
/usr/bin/time -v python3 ../pi_infer.py ../samples/ --model student_int8.onnx 2>&1 | grep Maximum
/usr/bin/time -v python3 ../pi_infer.py ../samples/ --model student_fp32.onnx 2>&1 | grep Maximum
cd .. && python3 test_parity.py samples/                              # CLI vs /predict must match
```

Ship FP32 if its latency is acceptable (≈3 points more accurate); INT8 only if clearly faster or memory-bound.
Switch with `MODEL_PATH` in `/etc/opthaedge/inference.env`. Each prediction records the artifact SHA-256,
and the Model Information page shows which artifact is active.

## 7. Split deployment (platform on a laptop or server)

1. On the Pi run only the inference service, bound to its LAN address: edit
   `/etc/systemd/system/opthaedge-inference.service` to `--host <pi-lan-ip>` and keep `INFERENCE_API_KEY` set.
   Disable the web unit: `sudo systemctl disable --now opthaedge-web`.
2. On the server set `INFERENCE_URL="http://<pi-lan-ip>:8001"` and the same `INFERENCE_API_KEY`.
3. Keep port 8001 on the private network only.

## 8. Operations

| Task | Command |
|---|---|
| Logs | `journalctl -u opthaedge-web -u opthaedge-inference -f` |
| Restart | `sudo systemctl restart opthaedge-web opthaedge-inference` |
| Health | `curl -s localhost:8001/health \| python3 -m json.tool` |
| Update | `git pull && sudo ./deploy/install_pi.sh` (keeps secrets and data) |
| Database backup | `sudo -u postgres pg_dump opthaedge > opthaedge-$(date +%F).sql` |
| Image backup | `sudo tar czf images-$(date +%F).tgz /var/lib/opthaedge/storage` (encrypted at rest) |

## 9. Safety checklist (guide §8)

- [x] Permanent "research use only" banner and clinician confirmation before a result is final or shared.
- [x] Server-side authentication, role permissions and patient consent before inference; audit event for every access.
- [x] Images stored encrypted; model version, artifact digest and preprocessing version stored with every result.
- [x] Never an invented value: when the Pi is down the platform shows *unavailable* and stores nothing.
- [x] Inference service reachable only from the platform (localhost, or LAN with a shared key).
- [ ] HTTPS in front of the platform (section 3).
- [ ] Quality thresholds calibrated on Pi images (section 5).
- [ ] Clinician sign-off of the curated education text and of a sample of AI-generated education.
- [ ] Prospective validation on 20D-lens images (use the AI vs clinician report).

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `pip install onnxruntime` fails | OS is 32-bit; reinstall 64-bit Raspberry Pi OS |
| Dashboard: *Pi inference service unavailable* | `systemctl status opthaedge-inference`; check `INFERENCE_API_KEY` matches in both env files |
| Camera *Not detected* | Check the ribbon cable, `rpicam-hello`, and that the user is in the `video` group (`sudo reboot` after install) |
| Sign-in does nothing on the phone | Plain HTTP with `SESSION_COOKIE_SECURE="true"`; set it to `false` or add HTTPS |
| Odd or identical grades | Preprocessing differs from training; images must go through `pi_infer.preprocess_array` only (the service does this) |
| Every image ungradable | Lower `BLUR_MIN` after calibration (section 5) |
| Education shows *curated guidance* | `OPENROUTER_API_KEY` missing, out of credits, or no internet; screening is unaffected |
| Build runs out of memory | Use a 4 GB+ Pi, or build on a laptop (`npm run build`) and copy `.next/` to the Pi |
