"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";

interface Props {
  onFileSelected: (file: File) => void;
}

export default function UploadBando({ onFileSelected }: Props) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        setFile(files[0]);
        onFileSelected(files[0]);
      }
    },
    [onFileSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  return (
    <div className="max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={`group relative cursor-pointer p-12 text-center transition-all duration-300 dashed-border ${
          isDragActive
            ? "bg-emerald-500/[0.06]"
            : file
              ? "bg-emerald-500/[0.04]"
              : "bg-white/[0.02] hover:bg-white/[0.04]"
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(file.size / 1024).toFixed(0)} KB — Pronto per l&apos;analisi
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              Bando caricato
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-500/15">
              <Upload className="w-7 h-7 text-emerald-400/70 group-hover:text-emerald-400 transition-colors duration-300" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                Carica il Bando PDF
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Trascina qui il documento ufficiale per iniziare l&apos;analisi
              </p>
            </div>
            <span className="text-xs text-gray-600">o clicca per selezionare</span>
          </div>
        )}
      </div>
    </div>
  );
}
