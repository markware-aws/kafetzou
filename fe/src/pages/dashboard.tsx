import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { getReadings, getTarotReadings, getPersonalizedAstrologyHistory, getDreamReadings } from "@/lib/api";
import { getCardDisplayName } from "@/lib/tarot";
import { SIGN_BY_ID } from "@/lib/astrology";
import { useAuthedSWR } from "@/lib/use-authed-swr";
import { timeAgo } from "@/lib/time-ago";

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

const NEW_READING_HREF: Record<Tab, string> = {
  coffee: "/upload", tarot: "/tarot", astrology: "/astrology", dreams: "/dream",
};

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("coffee");
  const { data, error, isLoading } = useAuthedSWR(
    ["dashboard-data"],
    async () => {
      const [coffee, tarot, astrology, dreams] = await Promise.all([
        getReadings(),
        getTarotReadings(),
        getPersonalizedAstrologyHistory(),
        getDreamReadings(),
      ]);
      return {
        coffee: coffee as Reading[],
        tarot: tarot as TarotItem[],
        astrology: astrology as AstrologyItem[],
        dreams: dreams as DreamItem[],
      };
    },
  );

  const readings = data?.coffee ?? [];
  const tarotReadings = data?.tarot ?? [];
  const astrologyReadings = data?.astrology ?? [];
  const dreamReadings = data?.dreams ?? [];
  const errorMessage = error instanceof Error ? error.message : "";

  const tabs: { id: Tab; label: string }[] = [
    { id: "coffee", label: "Καφές" },
    { id: "tarot", label: "Ταρό" },
    { id: "astrology", label: "Αστρολογία" },
    { id: "dreams", label: "Όνειρα" },
  ];

  return (
    <AuthGuard title="Ιστορικό Αναγνώσεων">
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-violet-50">Οι αναγνώσεις μου</h1>
              <p className="mt-1 text-sm text-violet-300">Το ιστορικό σου</p>
            </div>
            <Link
              href={NEW_READING_HREF[tab]}
              className="flex items-center gap-2 shrink-0 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Νέα ανάγνωση
            </Link>
          </div>

          <div role="tablist" className="flex gap-6 border-b border-violet-800 mb-5">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 pb-2 text-sm transition-colors ${
                  tab === id
                    ? "border-amber-500 text-violet-50"
                    : "border-transparent text-violet-300 hover:text-violet-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="rounded-lg border border-violet-800 bg-surface divide-y divide-violet-800">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="px-4 py-3 flex flex-col gap-2">
                  <div className="h-4 w-48 rounded shimmer" />
                  <div className="h-3 w-full rounded shimmer" />
                </div>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-4 text-sm text-rose-200">{errorMessage}</div>
          )}

          {!isLoading && tab === "coffee" && (
            readings.length === 0 ? (
              <EmptyState label="Δεν υπάρχουν αναγνώσεις ακόμα." href="/upload" btnLabel="Έναρξη ανάγνωσης" />
            ) : (
              <HistoryList>
                {readings.map((r, i) => (
                  <HistoryRow
                    key={r.reading_id}
                    href={`/reading?id=${r.reading_id}`}
                    index={i}
                    createdAt={r.created_at}
                    title={r.reading_result?.general_message ?? "Ανάγνωση καφέ"}
                  >
                    <p className="mt-1 text-sm text-violet-200 line-clamp-2">{r.reading_result?.prediction_summary}</p>
                    {(r.symbols_detected ?? []).length > 0 && (
                      <p className="mt-1 text-xs text-violet-300">
                        {r.symbols_detected.slice(0, 4).join(", ")}
                        {r.symbols_detected.length > 4 && ` +${r.symbols_detected.length - 4} ακόμα`}
                      </p>
                    )}
                  </HistoryRow>
                ))}
              </HistoryList>
            )
          )}

          {!isLoading && tab === "tarot" && (
            tarotReadings.length === 0 ? (
              <EmptyState label="Δεν υπάρχουν αναγνώσεις ταρό ακόμα." href="/tarot" btnLabel="Έναρξη ανάγνωσης ταρό" />
            ) : (
              <HistoryList>
                {tarotReadings.map((r, i) => (
                  <HistoryRow
                    key={r.reading_id}
                    href={`/tarot-reading?id=${r.reading_id}`}
                    index={i}
                    createdAt={r.created_at}
                    title={r.reading_result?.summary ?? "Ανάγνωση Ταρό"}
                  >
                    {(r.reading_result?.cards ?? []).length > 0 && (
                      <p className="mt-1 text-xs text-violet-300">
                        {r.reading_result.cards.map((card) => getCardDisplayName(card)).join(", ")}
                      </p>
                    )}
                  </HistoryRow>
                ))}
              </HistoryList>
            )
          )}

          {!isLoading && tab === "astrology" && (
            astrologyReadings.length === 0 ? (
              <EmptyState label="Δεν υπάρχουν εξατομικευμένες αναγνώσεις ακόμα." href="/astrology" btnLabel="Πήγαινε στην Αστρολογία" />
            ) : (
              <HistoryList>
                {astrologyReadings.map((r, i) => {
                  const sign = SIGN_BY_ID[r.sign];
                  return (
                    <HistoryRow
                      key={r.reading_id}
                      href={`/astrology-reading?id=${r.reading_id}`}
                      index={i}
                      createdAt={r.created_at}
                      title={
                        <>
                          <span className="mr-1.5">{sign?.symbol ?? "✦"}</span>
                          {sign?.nameGr ?? r.sign}
                          <span className="ml-2 text-xs font-normal text-violet-300">{r.sex} · {r.eye_color}</span>
                        </>
                      }
                    >
                      <p className="mt-1 text-sm text-violet-200 line-clamp-2">{r.reading_result?.summary}</p>
                    </HistoryRow>
                  );
                })}
              </HistoryList>
            )
          )}

          {!isLoading && tab === "dreams" && (
            dreamReadings.length === 0 ? (
              <EmptyState label="Δεν υπάρχουν ερμηνείες ονείρων ακόμα." href="/dream" btnLabel="Ερμήνευσε όνειρο" />
            ) : (
              <HistoryList>
                {dreamReadings.map((r, i) => (
                  <HistoryRow
                    key={r.reading_id}
                    href={`/dream-reading?id=${r.reading_id}`}
                    index={i}
                    createdAt={r.created_at}
                    title={r.reading_result?.summary ?? "Ερμηνεία ονείρου"}
                  >
                    <p className="mt-1 text-sm text-violet-200 line-clamp-2">{r.dream_text}</p>
                    {(r.reading_result?.symbols ?? []).length > 0 && (
                      <p className="mt-1 text-xs text-violet-300">
                        {r.reading_result.symbols.slice(0, 4).join(", ")}
                        {r.reading_result.symbols.length > 4 && ` +${r.reading_result.symbols.length - 4} ακόμα`}
                      </p>
                    )}
                  </HistoryRow>
                ))}
              </HistoryList>
            )
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

function HistoryList({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-violet-800 bg-surface divide-y divide-violet-800 overflow-hidden">
      {children}
    </div>
  );
}

function HistoryRow({ href, index, createdAt, title, children }: {
  href: string; index: number; createdAt: string; title: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="animate-fade-in block px-4 py-3 hover:bg-surface-hover transition-colors"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 text-sm font-medium text-violet-50 line-clamp-1">{title}</p>
        <span className="shrink-0 text-xs text-violet-300 tabular-nums">{timeAgo(createdAt)}</span>
      </div>
      {children}
    </Link>
  );
}

function EmptyState({ label, href, btnLabel }: {
  label: string; href: string; btnLabel: string;
}) {
  return (
    <div className="rounded-lg border border-violet-800 bg-surface p-5">
      <p className="text-sm text-violet-200">{label}</p>
      <Link href={href} className="mt-2 inline-block text-sm text-amber-400 hover:text-amber-300 transition-colors">
        {btnLabel} →
      </Link>
    </div>
  );
}
