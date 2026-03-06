"use client";

import { Heart, Briefcase, Star, Sparkles, Eye } from "lucide-react";
import type { CoffeeReading } from "@/lib/api";

interface ReadingCardProps {
  reading: CoffeeReading;
  symbolsDetected: string[];
  imagePreview?: string;
  index?: number;
}

const sections = [
  { key: "love" as const, label: "Love", icon: Heart, color: "text-rose-400", bg: "bg-rose-900/20 border-rose-800/30" },
  { key: "career" as const, label: "Career", icon: Briefcase, color: "text-sky-400", bg: "bg-sky-900/20 border-sky-800/30" },
  { key: "luck" as const, label: "Luck", icon: Star, color: "text-amber-400", bg: "bg-amber-900/20 border-amber-800/30" },
];

export function ReadingCard({ reading, symbolsDetected, imagePreview, index = 0 }: ReadingCardProps) {
  return (
    <div
      className="animate-fade-in rounded-2xl border border-violet-800/40 bg-[#12102a] overflow-hidden"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-violet-900/30 flex items-start gap-4">
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Coffee cup"
            className="w-16 h-16 rounded-xl object-cover border border-violet-800/50 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-400 font-medium uppercase tracking-widest">Your Fortune</span>
          </div>
          <p className="text-violet-100 text-sm leading-relaxed">{reading.general_message}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {sections.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className={`rounded-xl border p-4 ${bg}`}>
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-sm text-violet-200 leading-relaxed">{reading[key]}</p>
          </div>
        ))}
      </div>

      {/* Symbols */}
      {symbolsDetected.length > 0 && (
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-violet-400 font-medium uppercase tracking-wider">Symbols Seen</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {symbolsDetected.map((sym) => (
              <span
                key={sym}
                className="px-3 py-1 rounded-full text-xs bg-violet-900/40 border border-violet-700/40 text-violet-200 capitalize"
              >
                {sym}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prediction summary */}
      <div className="px-6 pb-6">
        <div className="rounded-xl bg-gradient-to-r from-violet-900/30 to-amber-900/20 border border-violet-800/30 p-4">
          <p className="text-xs text-amber-300/70 font-medium uppercase tracking-widest mb-1">Prediction</p>
          <p className="text-sm text-violet-100 italic leading-relaxed">"{reading.prediction_summary}"</p>
        </div>
      </div>
    </div>
  );
}
