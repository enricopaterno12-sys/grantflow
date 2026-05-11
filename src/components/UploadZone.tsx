"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";

interface Props {
  onFileSelected: (file: File) => void;
  onVisuraSelected?: (file: File) => void;
}

function UploadCard({
  icon: Icon,
  title,
  subtitle,
  accent,
  file,
  isDragActive,
  getRootProps,
  getInputProps,
}: {
  icon: typeof Upload;
  title: string;
  subtitle: string;
  accent: "emerald" | "slate";
  file: File | null;
  isDragActive: boolean;
  getRootProps: () => any;
  getInputProps: () => any;
}) {
  const borderClass =
    accent === "emerald" ? "dashed-border" : "dashed-border-gray";

  return (
    <div
      {...getRootProps()}
      className={`group relative cursor-pointer p-8 text-center transition-all duration-300 ${borderClass} ${
        isDragActive
          ? "bg-emerald-500/[0.04]"
          : "bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        {file ? (
          <>
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                accent === "emerald"
                  ? "bg-emerald-500/10 group-hover:bg-emerald-500/15"
                  : "bg-white/[0.06] group-hover:bg-white/[0.08]"
              }`}
            >
              <FileText
                className={`w-7 h-7 ${
                  accent === "emerald" ? "text-emerald-400" : "text-gray-400"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-white truncate max-w-[200px]">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </>
        ) : (
          <>
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                accent === "emerald"
                  ? "bg-emerald-500/10 group-hover:bg-emerald-500/15"
                  : "bg-white/[0.06] group-hover:bg-white/[0.08]"
              }`}
            >
              <Icon
                className={`w-6 h-6 transition-colors duration-300 ${
                  accent === "emerald"
                    ? "text-emerald-400/70 group-hover:text-emerald-400"
                    : "text-gray-500 group-hover:text-gray-400"
                }`}
              />
            </div>
            <div>
              <p className="text-base font-semibold text-white">{title}</p>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function UploadZone({ onFileSelected, onVisuraSelected }: Props) {
  const [bandoFile, setBandoFile] = useState<File | null>(null);
  const [visuraFile, setVisuraFile] = useState<File | null>(null);

  const onDropBando = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        setBandoFile(files[0]);
        onFileSelected(files[0]);
      }
    },
    [onFileSelected]
  );

  const onDropVisura = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        setVisuraFile(files[0]);
        onVisuraSelected?.(files[0]);
      }
    },
    [onVisuraSelected]
  );

  const bandoDrop = useDropzone({
    onDrop: onDropBando,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const visuraDrop = useDropzone({
    onDrop: onDropVisura,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <UploadCard
        icon={Upload}
        title="Caricamento Bando PDF"
        subtitle="Trascina qui il documento ufficiale per l'analisi"
        accent="emerald"
        file={bandoFile}
        isDragActive={bandoDrop.isDragActive}
        getRootProps={bandoDrop.getRootProps}
        getInputProps={bandoDrop.getInputProps}
      />
      <UploadCard
        icon={Upload}
        title="Visura Camerale (Opzionale)"
        subtitle="Carica la visura per estrazione automatica dati"
        accent="slate"
        file={visuraFile}
        isDragActive={visuraDrop.isDragActive}
        getRootProps={visuraDrop.getRootProps}
        getInputProps={visuraDrop.getInputProps}
      />
    </div>
  );
}
