"use client";

import { Heart, Briefcase, Star } from "lucide-react";
import type { CoffeeReading } from "@/lib/api";

interface ReadingCardProps {
  reading: CoffeeReading;
  symbolsDetected: string[];
  lettersDetected?: string[];
  imagePreview?: string;
  index?: number;
}

const sections = [
  { key: "love" as const, label: "Αγάπη", icon: Heart },
  { key: "career" as const, label: "Καριέρα", icon: Briefcase },
  { key: "luck" as const, label: "Τύχη", icon: Star },
];

export function ReadingCard({
  reading,
  symbolsDetected,
  lettersDetected = [],
  imagePreview,
  index = 0,
}: ReadingCardProps) {
  const allSymbols = [...new Set([...symbolsDetected, ...(reading.symbols ?? [])])];

  return (
    <article
      className="animate-fade-in rounded-lg border border-violet-800 bg-surface"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="p-5 flex items-start gap-4 border-b border-violet-800">
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Φλιτζάνι"
            className="w-16 h-16 rounded-md object-cover shrink-0"
          />
        )}
        <p className="text-sm text-violet-50 leading-relaxed">{reading.general_message}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-y sm:divide-y-0 divide-violet-800 border-b border-violet-800">
        {sections.map(({ key, label, icon: Icon }) => (
          <section key={key} className="p-5">
            <h3 className="flex items-center gap-2 mb-2 text-sm font-medium text-violet-50">
              <Icon className="w-4 h-4 text-violet-300" />
              {label}
            </h3>
            <p className="text-sm text-violet-200 leading-relaxed">{reading[key]}</p>
          </section>
        ))}
      </div>

      <div className="p-5 flex flex-col gap-4">
        {(allSymbols.length > 0 || lettersDetected.length > 0) && (
          <dl className="flex flex-col gap-2 text-sm">
            {allSymbols.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-violet-300 shrink-0">Σύμβολα:</dt>
                <dd className="text-violet-100">{allSymbols.join(", ")}</dd>
              </div>
            )}
            {lettersDetected.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-violet-300 shrink-0">Γράμματα:</dt>
                <dd className="text-violet-100 font-medium">{lettersDetected.join(", ")}</dd>
              </div>
            )}
          </dl>
        )}

        <div>
          <h3 className="text-sm font-medium text-violet-50 mb-1">Πρόβλεψη</h3>
          <p className="text-sm text-violet-200 leading-relaxed">{reading.prediction_summary}</p>
        </div>
      </div>
    </article>
  );
}
