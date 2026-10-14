import type { ApiResponse } from '@/types/prediction';

export async function analyzeImage(file: File, mode: 'binary' | 'severity' = 'binary'): Promise<ApiResponse> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('mode', mode);

  const response = await fetch('/api/predict', {
    method: 'POST',
    body: formData,
  });

  return response.json() as Promise<ApiResponse>;
}
