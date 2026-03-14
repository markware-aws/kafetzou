import { useState, useEffect } from "react";
import { Star, Sun } from "lucide-react";
import { getDailyTarotCard } from "@/lib/api";
import { getCardImagePath, getCardDisplayName } from "@/lib/tarot";

interface DailyCardResult {
  reading_id: string;
  reading_result: {
    cards: string[];
    card_gr: string;
    meaning_upright: string;
    meaning_reversed: string;
  };
}

const DAILY_STORAGE_KEY = "daily_tarot";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadFromStorage(): { card: DailyCardResult; flipped: boolean } | null {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.drawn_at !== todayStr()) return null;
    return { card: parsed.card, flipped: parsed.flipped ?? false };
  } catch {
    return null;
  }
}

function saveToStorage(card: DailyCardResult, flipped: boolean) {
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify({ drawn_at: todayStr(), card, flipped }));
  } catch {}
}

export function DailyCardSection() {
  const [daily, setDaily] = useState<DailyCardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const cached = loadFromStorage();
    if (cached) {
      setDaily(cached.card);
      setFlipped(cached.flipped);
      setLoading(false);
      return;
    }
    getDailyTarotCard()
      .then((d) => {
        setDaily(d);
        saveToStorage(d, false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleFlip() {
    setFlipped(true);
    if (daily) saveToStorage(daily, true);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-5">
        <div className="h-5 shimmer rounded w-40 mb-4" />
        <div className="h-48 shimmer rounded-xl" />
      </div>
    );
  }

  if (!daily) return null;

  const card = daily.reading_result.cards[0];
  const cardGr = daily.reading_result.card_gr;
  const meaningUpright = daily.reading_result.meaning_upright;
  const meaningReversed = daily.reading_result.meaning_reversed;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
        <h2 className="text-sm font-semibold text-amber-300">Η Ημερήσια Κάρτα σου</h2>
        <span className="ml-auto text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">Δωρεάν</span>
      </div>

      {!flipped ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <button
            onClick={handleFlip}
            className="group relative w-32 cursor-pointer"
            style={{ paddingBottom: "192px" }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-800 to-[#24242E] border-2 border-violet-600/50 group-hover:border-amber-500/50 transition-all duration-300 flex flex-col items-center justify-center gap-3 shadow-2xl shadow-violet-900/50">
              <div className="w-12 h-12 rounded-full border-2 border-violet-600/40 group-hover:border-amber-500/40 transition-colors flex items-center justify-center">
                <Star className="w-6 h-6 text-violet-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <span className="text-[11px] text-violet-500 group-hover:text-amber-400 transition-colors font-medium">Άγγιξε</span>
            </div>
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-violet-200">Δες την τύχη σου σήμερα</p>
            <p className="text-xs text-violet-500 mt-0.5">Η κάρτα σε περιμένει — άγγιξέ την για αποκάλυψη</p>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in flex gap-5 items-start">
          <div className="shrink-0 rounded-xl overflow-hidden border border-amber-500/40 shadow-lg shadow-amber-500/10" style={{ width: "90px" }}>
            <div style={{ paddingBottom: "150%", position: "relative" }}>
              <img src={getCardImagePath(card)} alt={card} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-200 mb-0.5">{cardGr}</p>
            <p className="text-xs text-violet-400 mb-3">{getCardDisplayName(card)}</p>
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wide text-violet-500 font-medium">Ορθή</span>
                <p className="text-xs text-violet-200 mt-0.5">{meaningUpright}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wide text-violet-500 font-medium">Ανεστραμμένη</span>
                <p className="text-xs text-violet-400 mt-0.5">{meaningReversed}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
