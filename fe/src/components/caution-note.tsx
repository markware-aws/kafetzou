import { Eye } from "lucide-react";

/**
 * The horoscope's `warning` field. Styled as advice, not an alarm: the bad news belongs in
 * the reading itself, this is one thing to keep in mind.
 */
export function CautionNote({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-amber-700/50 bg-amber-950/30 p-4">
      <h3 className="flex items-center gap-2 mb-1 text-sm font-medium text-amber-200">
        <Eye className="w-4 h-4 text-amber-400 shrink-0" />
        Προσοχή
      </h3>
      <p className="text-sm text-amber-50 leading-relaxed">{text}</p>
    </div>
  );
}
