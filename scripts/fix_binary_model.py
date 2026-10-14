"""
fix_binary_model.py
--------------------
The `retinal_binary_model.onnx` file references an external sidecar file
(`retinal_binary_model.onnx.data`) that contains the actual weight tensors.
ONNX Runtime cannot load the model without that sidecar.

This script loads BOTH files (the .onnx and the .data) and re-saves the model
as a single self-contained ONNX file with all weights inlined.

REQUIREMENTS
    pip install onnx

USAGE
    1. Make sure `retinal_binary_model.onnx` AND `retinal_binary_model.onnx.data`
       are both in the models/ directory.
    2. Run:  python scripts/fix_binary_model.py
    3. Restart the Next.js dev server.

The fixed model will be saved as:
    models/retinal_binary_model.onnx   (overwrites in-place after backup)
"""

import os
import shutil
import onnx
from onnx.external_data_helper import load_external_data_for_model

MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
SRC_PATH   = os.path.join(MODELS_DIR, 'retinal_binary_model.onnx')
BAK_PATH   = os.path.join(MODELS_DIR, 'retinal_binary_model.onnx.bak')
OUT_PATH   = os.path.join(MODELS_DIR, 'retinal_binary_model.onnx')

def main():
    data_file = SRC_PATH + '.data'

    # ── Sanity checks ─────────────────────────────────────────────────────────
    if not os.path.exists(SRC_PATH):
        raise FileNotFoundError(f'Model file not found: {SRC_PATH}')

    if not os.path.exists(data_file):
        raise FileNotFoundError(
            f'\n\n  ERROR: External data file not found:\n'
            f'    {data_file}\n\n'
            f'  This file contains the model weights. Without it the model\n'
            f'  cannot be loaded or fixed. Locate it in your training\n'
            f'  environment (where the model was originally exported) and\n'
            f'  copy it into the models/ directory, then re-run this script.\n'
        )

    print(f'Loading model from: {SRC_PATH}')
    model = onnx.load(SRC_PATH, load_external_data=False)

    # ── Inline all external tensors ────────────────────────────────────────────
    print('Inlining external data from:', data_file)
    load_external_data_for_model(model, MODELS_DIR)

    # ── Backup original, then overwrite ───────────────────────────────────────
    shutil.copy2(SRC_PATH, BAK_PATH)
    print(f'Backed up original to: {BAK_PATH}')

    onnx.save(model, OUT_PATH)
    print(f'\n✅ Fixed model saved to: {OUT_PATH}')
    print(   '   All weights are now inlined — no .data sidecar needed.')
    print(   '\n   Restart the Next.js dev server (`npm run dev`) to pick up the change.')


if __name__ == '__main__':
    main()
