import { Trash2, FileText } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface Props {
  nomeAzienda: string;
  esito: string;
  probabilita?: number;
  onSelect: () => void;
  onDelete: () => void;
}

export default function HistoryItem({ nomeAzienda, esito, probabilita, onSelect, onDelete }: Props) {
  return (
    <div className="flex items-stretch group">
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-3 px-3 py-2.5 min-h-[48px] hover:bg-white/[0.03] transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-emerald-400/60" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{nomeAzienda}</div>
          <div className="mt-0.5">
            <StatusBadge stato={esito} probabilita={probabilita} />
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="flex-shrink-0 px-3 flex items-center text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
        title="Elimina"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
