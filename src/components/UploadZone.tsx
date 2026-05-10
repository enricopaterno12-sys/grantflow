"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";

interface Props {
  onFileSelected: (file: File) => void;
  onVisuraSelected?: (file: File) => void;
}

export default function UploadZone({ onFileSelected, onVisuraSelected }: Props) {
  const [bandoFile, setBandoFile] = useState<File | null>(null);
  const [visuraFile, setVisuraFile] = useState<File | null>(null);

  const onDropBando = useCallback((files: File[]) => {
    if (files.length > 0) {
      setBandoFile(files[0]);
      onFileSelected(files[0]);
    }
  }, [onFileSelected]);

  const onDropVisura = useCallback((files: File[]) => {
    if (files.length > 0) {
      setVisuraFile(files[0]);
      onVisuraSelected?.(files[0]);
    }
  }, [onVisuraSelected]);

  const bandoDrop = useDropzone({ onDrop: onDropBando, accept: { "application/pdf": [".pdf"] }, maxFiles: 1 });
  const visuraDrop = useDropzone({ onDrop: onDropVisura, accept: { "application/pdf": [".pdf"] }, maxFiles: 1 });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div {...bandoDrop.getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${bandoDrop.isDragActive ? "border-blue-400 bg-blue-900/20" : "border-gray-600 hover:border-gray-400"}`}>
        <input {...bandoDrop.getInputProps()} />
        {bandoFile ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-10 h-10 text-blue-400" />
            <p className="text-white font-medium">{bandoFile.name}</p>
            <p className="text-xs text-gray-400">{(bandoFile.size / 1024).toFixed(0)} KB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-gray-400" />
            <p className="text-gray-300 font-medium">Trascina il bando PDF qui</p>
            <p className="text-xs text-gray-500">o clicca per selezionare</p>
          </div>
        )}
      </div>

      <div {...visuraDrop.getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${visuraDrop.isDragActive ? "border-blue-400 bg-blue-900/20" : "border-gray-600 hover:border-gray-400"}`}>
        <input {...visuraDrop.getInputProps()} />
        {visuraFile ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-10 h-10 text-green-400" />
            <p className="text-white font-medium">{visuraFile.name}</p>
            <p className="text-xs text-gray-400">Visura caricata</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-gray-400" />
            <p className="text-gray-300 font-medium">Visura camerale (opzionale)</p>
            <p className="text-xs text-gray-500">per estrazione automatica dati</p>
          </div>
        )}
      </div>
    </div>
  );
}
