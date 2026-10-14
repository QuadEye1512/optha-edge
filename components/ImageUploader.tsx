'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploaderProps {
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onFileSelected, disabled }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setFileName(file.name);
        const url = URL.createObjectURL(file);
        setPreview(url);
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const clearImage = () => {
    setPreview(null);
    setFileName(null);
    onFileSelected(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled,
  });

  return (
    <div className="w-full">
      {!preview ? (
        <div
          {...getRootProps()}
          id="dropzone"
          className={`
            relative border-2 border-dashed rounded-2xl p-8
            flex flex-col items-center justify-center min-h-[320px]
            cursor-pointer transition-all duration-300 ease-out
            ${isDragActive
              ? 'border-cyan-400 bg-cyan-400/10 scale-[1.02]'
              : 'border-slate-600 bg-slate-800/30 hover:border-cyan-500/60 hover:bg-slate-800/50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Upload icon */}
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center
              transition-all duration-300
              ${isDragActive ? 'bg-cyan-500/20 scale-110' : 'bg-slate-700/50'}
            `}>
              <svg className={`w-8 h-8 transition-colors duration-300 ${isDragActive ? 'text-cyan-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium text-slate-200">
                {isDragActive ? 'Drop your retinal image here' : 'Drag & drop retinal image'}
              </p>
              <p className="text-sm text-slate-400 mt-1">or click to browse</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-slate-700/60">JPG</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-700/60">PNG</span>
              <span className="text-slate-600">•</span>
              <span>Max 10MB</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-slate-800/50 border border-slate-700">
          {/* Image preview */}
          <div className="relative aspect-square max-h-[400px] flex items-center justify-center bg-black/30">
            <Image
              src={preview}
              alt="Retinal scan preview"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              unoptimized
              className="object-contain"
            />
          </div>
          {/* File info bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-t border-slate-700">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-sm text-slate-300 truncate">{fileName}</span>
            </div>
            <button
              onClick={clearImage}
              disabled={disabled}
              id="clear-image-btn"
              className="ml-3 shrink-0 text-sm px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
