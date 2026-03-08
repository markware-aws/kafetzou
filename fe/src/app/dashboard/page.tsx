"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coffee, Sparkles, Clock, ChevronRight, Upload, Eye, Star, Globe } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { getReadings, getTarotReadings, getPersonalizedAstrologyHistory } from "@/lib/api";
import { getCardDisplayName } from "@/lib/tarot";
import { SIGN_BY_ID } from "@/lib/astrology";

interface Reading {
  reading_id: string;
  created_at: string;
  symbols_detected: string[];
  reading_result: {
    general_message: string;
    prediction_summary: string;
  };
}

interface TarotItem {
  reading_id: string;
  created_at: string;
  spread: string;
  reading_result: {
    cards: string[];
    summary: string;
  };
}

interface AstrologyItem {
  reading_id: string;
  created_at: string;
  sign: string;
  sex: string;
  eye_color: string;
  reading_result: {
    summary: string;
    warning: string;
  };
}

type Tab = "coffee" | "tarot" | "astrology";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "μόλις τώρα";
  if (m < 60) return `πριν ${m}λ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `πριν ${h}ω`;
  return `πριν ${Math.floor(h / 24)} μέρες`;
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("coffee");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [tarotReadings, setTarotReadings] = useState<TarotItem[]>([]);
  const [astrologyReadings, setAstrologyReadings] = useState<AstrologyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getReadings(), getTarotReadings(), getPersonalizedAstrologyHistory()])
      .then(([coffee, tarot, astrology]) => {
        setReadings(coffee);
        setTarotReadings(tarot);
        setAstrologyReadings(astrology);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-violet-100">Οι Αναγνώσεις μου</h1>
              <p className="text-sm text-violet-500 mt-1">Το ιστορικό σου</p>
            </div>
            <Link
              href={tab === "coffee" ? "/upload" : tab === "tarot" ? "/tarot" : "/astrology"}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              <Upload className="w-4 h-4" />
              Νέα ανάγνωση
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-[#12102a] border border-violet-800/30 mb-6">
            <button
              onClick={() => setTab("coffee")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                tab === "coffee"
                  ? "bg-violet-800/60 text-amber-300"
                  : "text-violet-400 hover:text-violet-200"
              }`}
            >
              <Coffee className="w-4 h-4" />
              Καφές
            </button>
            <button
              onClick={() => setTab("tarot")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                tab === "tarot"
                  ? "bg-violet-800/60 text-amber-300"
                  : "text-violet-400 hover:text-violet-200"
              }`}
            >
              <Star className="w-4 h-4" />
              Ταρό
            </button>
            <button
              onClick={() => setTab("astrology")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                tab === "astrology"
                  ? "bg-violet-800/60 text-amber-300"
                  : "text-violet-400 hover:text-violet-200"
              }`}
            >
              <Globe className="w-4 h-4" />
              Αστρολογία
            </button>
          </div>

          {loading && (
            <div className="flex flex-col gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl shimmer" />
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-4 text-sm text-rose-300">
              {error}
            </div>
          )}

          {/* Coffee readings */}
          {!loading && tab === "coffee" && (
            <>
              {readings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-violet-900/40 flex items-center justify-center mb-4">
                    <Coffee className="w-8 h-8 text-violet-500" />
                  </div>
                  <p className="text-violet-300 font-medium mb-1">Δεν υπάρχουν αναγνώσεις ακόμα</p>
                  <p className="text-violet-500 text-sm mb-6">Ανέβασε την πρώτη φωτογραφία για να ξεκινήσεις</p>
                  <Link
                    href="/upload"
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold rounded-xl px-5 py-2.5 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Έναρξη ανάγνωσης
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {readings.map((r, i) => (
                    <Link
                      key={r.reading_id}
                      href={`/reading?id=${r.reading_id}`}
                      className="animate-fade-in group rounded-2xl border border-violet-800/30 bg-[#12102a] p-5 hover:border-violet-700/50 hover:bg-[#16132e] transition-all"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <p className="text-sm text-violet-100 line-clamp-1 font-medium">
                              {r.reading_result?.general_message ?? "Ανάγνωση καφέ"}
                            </p>
                          </div>
                          <p className="text-xs text-violet-400 line-clamp-2 mb-3">
                            {r.reading_result?.prediction_summary}
                          </p>
                          <div className="flex items-center gap-3 flex-wrap">
                            {(r.symbols_detected ?? []).slice(0, 4).map((sym) => (
                              <span key={sym} className="flex items-center gap-1 text-xs text-violet-400">
                                <Eye className="w-3 h-3" />
                                <span className="capitalize">{sym}</span>
                              </span>
                            ))}
                            {(r.symbols_detected ?? []).length > 4 && (
                              <span className="text-xs text-violet-600">+{r.symbols_detected.length - 4} ακόμα</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 text-xs text-violet-500">
                            <Clock className="w-3 h-3" />
                            {timeAgo(r.created_at)}
                          </div>
                          <ChevronRight className="w-4 h-4 text-violet-600 group-hover:text-amber-400 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Astrology personalized readings */}
          {!loading && tab === "astrology" && (
            <>
              {astrologyReadings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-violet-900/40 flex items-center justify-center mb-4">
                    <Globe className="w-8 h-8 text-violet-500" />
                  </div>
                  <p className="text-violet-300 font-medium mb-1">Δεν υπάρχουν εξατομικευμένες αναγνώσεις ακόμα</p>
                  <p className="text-violet-500 text-sm mb-6">Δοκίμασε την εξατομικευμένη αστρολογική ανάγνωση</p>
                  <Link
                    href="/astrology"
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 text-white font-semibold rounded-xl px-5 py-2.5 text-sm"
                  >
                    <Globe className="w-4 h-4" />
                    Πήγαινε στην Αστρολογία
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {astrologyReadings.map((r, i) => {
                    const sign = SIGN_BY_ID[r.sign];
                    return (
                      <div
                        key={r.reading_id}
                        className="animate-fade-in rounded-2xl border border-violet-800/30 bg-[#12102a] p-5"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg leading-none">{sign?.symbol ?? "✦"}</span>
                              <p className="text-sm text-violet-100 font-medium">
                                {sign?.nameGr ?? r.sign}
                              </p>
                              <span className="text-xs text-violet-500">· {r.sex} · {r.eye_color}</span>
                            </div>
                            <p className="text-xs text-violet-400 line-clamp-2">
                              {r.reading_result?.summary}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-violet-500 shrink-0">
                            <Clock className="w-3 h-3" />
                            {timeAgo(r.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Tarot readings */}
          {!loading && tab === "tarot" && (
            <>
              {tarotReadings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-violet-900/40 flex items-center justify-center mb-4">
                    <Star className="w-8 h-8 text-violet-500" />
                  </div>
                  <p className="text-violet-300 font-medium mb-1">Δεν υπάρχουν αναγνώσεις ταρό ακόμα</p>
                  <p className="text-violet-500 text-sm mb-6">Τράβηξε τις πρώτες σου κάρτες</p>
                  <Link
                    href="/tarot"
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 text-white font-semibold rounded-xl px-5 py-2.5 text-sm"
                  >
                    <Star className="w-4 h-4" />
                    Έναρξη ανάγνωσης ταρό
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {tarotReadings.map((r, i) => (
                    <div
                      key={r.reading_id}
                      className="animate-fade-in rounded-2xl border border-violet-800/30 bg-[#12102a] p-5"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <p className="text-sm text-violet-100 line-clamp-1 font-medium">
                              {r.reading_result?.summary ?? "Ανάγνωση Ταρό"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(r.reading_result?.cards ?? []).map((card) => (
                              <span
                                key={card}
                                className="text-xs bg-violet-900/40 border border-violet-700/30 text-violet-300 rounded-full px-2 py-0.5"
                              >
                                {getCardDisplayName(card)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 text-xs text-violet-500">
                            <Clock className="w-3 h-3" />
                            {timeAgo(r.created_at)}
                          </div>
                          <span className="text-xs text-violet-600">
                            {r.spread === "one_card" ? "1 κάρτα" : "3 κάρτες"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
