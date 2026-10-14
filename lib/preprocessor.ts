import 'server-only';

import sharp from 'sharp';
import * as ort from 'onnxruntime-node';

// ImageNet normalization (for the binary model)
const MEAN = [0.485, 0.456, 0.406];
const STD  = [0.229, 0.224, 0.225];

/** 224×224 with ImageNet normalization — for the binary DR model */
export async function preprocessImage(imageBuffer: Buffer): Promise<ort.Tensor> {
  const { data, info } = await sharp(imageBuffer)
    .resize(224, 224, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixelCount = width * height;
  const float32Data = new Float32Array(channels * pixelCount);

  for (let c = 0; c < channels; c++) {
    for (let i = 0; i < pixelCount; i++) {
      const v = data[i * channels + c] / 255.0;
      float32Data[c * pixelCount + i] = (v - MEAN[c]) / STD[c];
    }
  }

  return new ort.Tensor('float32', float32Data, [1, 3, 224, 224]);
}

/**
 * 299×299 with Keras InceptionV3 normalization (pixel / 127.5 − 1.0, range [−1, 1]).
 * Keras `preprocess_input` for InceptionV3/Xception uses this exact formula.
 */
export async function preprocessImageInception(imageBuffer: Buffer): Promise<ort.Tensor> {
  const { data, info } = await sharp(imageBuffer)
    .resize(299, 299, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixelCount = width * height;
  const float32Data = new Float32Array(channels * pixelCount);

  for (let c = 0; c < channels; c++) {
    for (let i = 0; i < pixelCount; i++) {
      // Keras InceptionV3 preprocess_input: normalise to [-1, 1]
      float32Data[c * pixelCount + i] = data[i * channels + c] / 127.5 - 1.0;
    }
  }

  return new ort.Tensor('float32', float32Data, [1, 3, 299, 299]);
}
