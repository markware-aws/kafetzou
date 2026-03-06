"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coffee, Sparkles, Clock, ChevronRight, Upload, Eye } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { getReadings } from "@/lib/api";

interface Reading {
  reading_id: string;
  created_at: string;
  symbols_detected: string[];
  reading_result: {
    general_message: string;
    prediction_summary: string;
  };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getReadings()
      .then(setReadings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-violet-100">My Readings</h1>
              <p className="text-sm text-violet-500 mt-1">Your coffee cup history</p>
            </div>
            <Link
              href="/upload"
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              <Upload className="w-4 h-4" />
              New reading
            </Link>
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

          {!loading && !error && readings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-violet-900/40 flex items-center justify-center mb-4">
                <Coffee className="w-8 h-8 text-violet-500" />
              </div>
              <p className="text-violet-300 font-medium mb-1">No readings yet</p>
              <p className="text-violet-500 text-sm mb-6">Upload your first coffee cup photo to begin</p>
              <Link
                href="/upload"
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold rounded-xl px-5 py-2.5 text-sm"
              >
                <Upload className="w-4 h-4" />
                Start reading
              </Link>
            </div>
          )}

          {!loading && readings.length > 0 && (
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
                          {r.reading_result?.general_message ?? "Coffee reading"}
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
                          <span className="text-xs text-violet-600">+{r.symbols_detected.length - 4} more</span>
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
        </main>
      </div>
    </AuthGuard>
  );
}
