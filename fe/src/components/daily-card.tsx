import { useState, useEffect } from "react";
import { Star } from "lucide-react";
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
      <div className="rounded-lg border border-violet-800 bg-surface p-5">
        <div className="h-4 shimmer rounded w-40 mb-4" />
        <div className="h-36 shimmer rounded-md" />
      </div>
    );
  }

  if (!daily) return null;

  const card = daily.reading_result.cards[0];
  const cardGr = daily.reading_result.card_gr;
  const meaningUpright = daily.reading_result.meaning_upright;
  const meaningReversed = daily.reading_result.meaning_reversed;

  return (
    <div className="rounded-lg border border-violet-800 bg-surface p-5">
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h2 className="text-base font-semibold text-violet-50">Η ημερήσια κάρτα σου</h2>
        <span className="text-xs text-violet-300">Δωρεάν</span>
      </div>

      {!flipped ? (
        <div className="flex items-center gap-5">
          <button
            onClick={handleFlip}
            aria-label="Αποκάλυψη κάρτας"
            className="shrink-0 w-[90px] aspect-[2/3] rounded-md border border-violet-700 bg-violet-950 hover:border-amber-500 transition-colors flex items-center justify-center"
          >
            <Star className="w-5 h-5 text-violet-300" />
          </button>
          <div>
            <p className="text-sm text-violet-100">Η κάρτα της ημέρας σε περιμένει.</p>
            <button
              onClick={handleFlip}
              className="mt-3 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-3 py-1.5 transition-colors"
            >
              Γύρισε την κάρτα
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in flex gap-5 items-start">
          <img
            src={getCardImagePath(card)}
            alt={cardGr}
            className="shrink-0 w-[90px] aspect-[2/3] rounded-md object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-50">{cardGr}</p>
            <p className="text-xs text-violet-300 mb-3">{getCardDisplayName(card)}</p>
            <dl className="flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-xs font-medium text-violet-300">Ορθή</dt>
                <dd className="text-violet-100 mt-0.5">{meaningUpright}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-violet-300">Ανεστραμμένη</dt>
                <dd className="text-violet-200 mt-0.5">{meaningReversed}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
