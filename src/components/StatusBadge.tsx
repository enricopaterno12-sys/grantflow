interface Props {
  stato: string;
  probabilita?: number | null;
}

const colors: Record<string, { bg: string; text: string; dot: string }> = {
  VERDE: { bg: "bg-green-900/30", text: "text-green-400", dot: "bg-green-400" },
  GIALLO: { bg: "bg-yellow-900/30", text: "text-yellow-400", dot: "bg-yellow-400" },
  ROSSO: { bg: "bg-red-900/30", text: "text-red-400", dot: "bg-red-400" },
  "N/D": { bg: "bg-gray-700", text: "text-gray-400", dot: "bg-gray-400" },
};

export default function StatusBadge({ stato, probabilita }: Props) {
  const c = colors[stato] ?? colors["N/D"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {stato}
      {probabilita != null && <span className="opacity-70">· {probabilita}%</span>}
    </span>
  );
}
