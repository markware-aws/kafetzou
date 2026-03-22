import { useEffect, useState } from "react";
import Link from "next/link";
import { Coffee, Sparkles, Clock, ChevronRight, Upload, Eye, Star, Globe, Moon } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { getReadings, getTarotReadings, getPersonalizedAstrologyHistory, getDreamReadings } from "@/lib/api";
import { getCardDisplayName } from "@/lib/tarot";
import { SIGN_BY_ID } from "@/lib/astrology";

interface Reading {
  reading_id: string;
  created_at: string;
  symbols_detected: string[];
  reading_result: { general_message: string; prediction_summary: string; };
}

interface TarotItem {
  reading_id: string;
  created_at: string;
  spread: string;
  reading_result: { cards: string[]; summary: string; };
}

interface AstrologyItem {
  reading_id: string;
  created_at: string;
  sign: string;
  sex: string;
  eye_color: string;
  reading_result: { summary: string; warning: string; };
}

interface DreamItem {
  reading_id: string;
  created_at: string;
  dream_text: string;
  reading_result: { summary: string; symbols: string[]; interpretation: string; };
}

type Tab = "coffee" | "tarot" | "astrology" | "dreams";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "μόλις τώρα";
  if (m < 60) return `πριν ${m}λ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `πριν ${h}ω`;
  return `πριν ${Math.floor(h / 24)} μέρες`;
}

const NEW_READING_HREF: Record<Tab, string> = {
  coffee: "/upload", tarot: "/tarot", astrology: "/astrology", dreams: "/dream",
};

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("coffee");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [tarotReadings, setTarotReadings] = useState<TarotItem[]>([]);
  const [astrologyReadings, setAstrologyReadings] = useState<AstrologyItem[]>([]);
  const [dreamReadings, setDreamReadings] = useState<DreamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getReadings(), getTarotReadings(), getPersonalizedAstrologyHistory(), getDreamReadings()])
      .then(([coffee, tarot, astrology, dreams]) => {
        setReadings(coffee);
        setTarotReadings(tarot);
        setAstrologyReadings(astrology);
        setDreamReadings(dreams);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "coffee", label: "Καφές", icon: Coffee },
    { id: "tarot", label: "Ταρό", icon: Star },
    { id: "astrology", label: "Αστρολογία", icon: Globe },
    { id: "dreams", label: "Όνειρα", icon: Moon },
  ];

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
              href={NEW_READING_HREF[tab]}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              <Upload className="w-4 h-4" />
              Νέα ανάγνωση
            </Link>
          </div>

          <div className="flex gap-1 p-1 rounded-xl bg-[#2e2a3a] border border-violet-800/30 mb-6">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                  tab === id ? "bg-violet-800/60 text-amber-300" : "text-violet-400 hover:text-violet-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex flex-col gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded shimmer shrink-0" />
                    <div className="h-4 w-48 rounded shimmer" />
                  </div>
                  <div className="h-3 w-full rounded shimmer" />
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-16 rounded shimmer" />
                    <div className="h-3 w-16 rounded shimmer" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-4 text-sm text-rose-300">{error}</div>
          )}

          {!loading && tab === "coffee" && (
            readings.length === 0 ? (
              <EmptyState icon={Coffee} label="Δεν υπάρχουν αναγνώσεις ακόμα" sub="Ανέβασε την πρώτη φωτογραφία για να ξεκινήσεις" href="/upload" btnLabel="Έναρξη ανάγνωσης" />
            ) : (
              <div className="flex flex-col gap-3">
                {readings.map((r, i) => (
                  <Link
                    key={r.reading_id}
                    href={`/reading?id=${r.reading_id}`}
                    className="animate-fade-in group rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-5 hover:border-violet-700/50 hover:bg-[#352f43] transition-all"
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
                        <p className="text-xs text-violet-400 line-clamp-2 mb-3">{r.reading_result?.prediction_summary}</p>
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
            )
          )}

          {!loading && tab === "tarot" && (
            tarotReadings.length === 0 ? (
              <EmptyState icon={Star} label="Δεν υπάρχουν αναγνώσεις ταρό ακόμα" sub="Τράβηξε τις πρώτες σου κάρτες" href="/tarot" btnLabel="Έναρξη ανάγνωσης ταρό" />
            ) : (
              <div className="flex flex-col gap-3">
                {tarotReadings.map((r, i) => (
                  <Link
                    key={r.reading_id}
                    href={`/tarot-reading?id=${r.reading_id}`}
                    className="animate-fade-in group rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-5 hover:border-violet-700/50 hover:bg-[#352f43] transition-all"
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
                            <span key={card} className="text-xs bg-violet-900/40 border border-violet-700/30 text-violet-300 rounded-full px-2 py-0.5">
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
                        <ChevronRight className="w-4 h-4 text-violet-600 group-hover:text-amber-400 transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}

          {!loading && tab === "astrology" && (
            astrologyReadings.length === 0 ? (
              <EmptyState icon={Globe} label="Δεν υπάρχουν εξατομικευμένες αναγνώσεις ακόμα" sub="Δοκίμασε την εξατομικευμένη αστρολογική ανάγνωση" href="/astrology" btnLabel="Πήγαινε στην Αστρολογία" />
            ) : (
              <div className="flex flex-col gap-3">
                {astrologyReadings.map((r, i) => {
                  const sign = SIGN_BY_ID[r.sign];
                  return (
                    <Link
                      key={r.reading_id}
                      href={`/astrology-reading?id=${r.reading_id}`}
                      className="animate-fade-in group rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-5 hover:border-violet-700/50 hover:bg-[#352f43] transition-all"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg leading-none">{sign?.symbol ?? "✦"}</span>
                            <p className="text-sm text-violet-100 font-medium">{sign?.nameGr ?? r.sign}</p>
                            <span className="text-xs text-violet-500">· {r.sex} · {r.eye_color}</span>
                          </div>
                          <p className="text-xs text-violet-400 line-clamp-2">{r.reading_result?.summary}</p>
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
                  );
                })}
              </div>
            )
          )}

          {!loading && tab === "dreams" && (
            dreamReadings.length === 0 ? (
              <EmptyState icon={Moon} label="Δεν υπάρχουν ερμηνείες ονείρων ακόμα" sub="Περίγραψε ένα όνειρό σου και αποκάλυψε το μήνυμά του" href="/dream" btnLabel="Ερμήνευσε Όνειρο" />
            ) : (
              <div className="flex flex-col gap-3">
                {dreamReadings.map((r, i) => (
                  <Link
                    key={r.reading_id}
                    href={`/dream-reading?id=${r.reading_id}`}
                    className="animate-fade-in group rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-5 hover:border-violet-700/50 hover:bg-[#352f43] transition-all"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Moon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <p className="text-sm text-violet-100 line-clamp-1 font-medium italic">
                            "{r.reading_result?.summary ?? "Ερμηνεία ονείρου"}"
                          </p>
                        </div>
                        <p className="text-xs text-violet-400 line-clamp-2 mb-2">{r.dream_text}</p>
                        {(r.reading_result?.symbols ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {(r.reading_result.symbols ?? []).slice(0, 4).map((s, idx) => (
                              <span key={idx} className="text-xs bg-violet-900/40 border border-violet-700/30 text-violet-300 rounded-full px-2 py-0.5">{s}</span>
                            ))}
                            {(r.reading_result.symbols ?? []).length > 4 && (
                              <span className="text-xs text-violet-600">+{r.reading_result.symbols.length - 4} ακόμα</span>
                            )}
                          </div>
                        )}
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
            )
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

function EmptyState({ icon: Icon, label, sub, href, btnLabel }: {
  icon: any; label: string; sub: string; href: string; btnLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-violet-900/40 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-violet-500" />
      </div>
      <p className="text-violet-300 font-medium mb-1">{label}</p>
      <p className="text-violet-500 text-sm mb-6">{sub}</p>
      <Link href={href} className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold rounded-xl px-5 py-2.5 text-sm">
        <Icon className="w-4 h-4" />
        {btnLabel}
      </Link>
    </div>
  );
}
