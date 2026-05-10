import { Trash2 } from "lucide-react";
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
        className="flex-1 text-left px-3 py-2.5 min-h-[48px] hover:bg-gray-700/50 transition-colors"
      >
        <div className="text-sm font-medium text-white truncate">{nomeAzienda}</div>
        <div className="mt-1">
          <StatusBadge stato={esito} probabilita={probabilita} />
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="flex-shrink-0 px-3 flex items-center text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
        title="Elimina"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
