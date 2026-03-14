import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Sparkles, Heart, Briefcase, Star, AlertTriangle,
  ChevronLeft, RefreshCw, Lock, User, Calendar, Eye, Coins,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import {
  getHoroscope,
  createPersonalizedAstrologyReading,
  getBirthProfile,
  AstrologyReading,
} from "@/lib/api";
import {
  SIGNS,
  SIGN_BY_ID,
  ELEMENT_COLORS,
  ELEMENT_BG,
  getSignFromDob,
} from "@/lib/astrology";
import { getIdToken } from "@/lib/auth";
import { notifyCreditsChanged } from "@/lib/user";
import { InsufficientCreditsDialog } from "@/components/credits-dialog";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Ημερήσια",
  weekly: "Εβδομαδιαία",
  monthly: "Μηνιαία",
};

const GREEK_MONTHS = [
  "Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου",
  "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου",
];
const GREEK_MONTHS_NOM = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος",
];
const GREEK_DAYS = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
const SEX_OPTIONS = ["Άνδρας", "Γυναίκα", "Άλλο"];
const EYE_COLORS = ["Μαύρα", "Καφέ", "Φουντουκί", "Πράσινα", "Μπλε", "Γκρι"];

function getPeriodLabel(period: Period): string {
  const now = new Date();
  if (period === "daily") {
    return `${GREEK_DAYS[now.getDay()]}, ${now.getDate()} ${GREEK_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }
  if (period === "weekly") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.getDate()} ${GREEK_MONTHS[monday.getMonth()]} – ${sunday.getDate()} ${GREEK_MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
  }
  return `${GREEK_MONTHS_NOM[now.getMonth()]} ${now.getFullYear()}`;
}

function ReadingSection({ icon: Icon, label, text, accent = false, warning = false }: {
  icon: any; label: string; text: string; accent?: boolean; warning?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${warning ? "border-rose-800/30 bg-rose-900/10" : accent ? "border-amber-500/20 bg-amber-500/5" : "border-violet-800/30 bg-[#2e2a3a]"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 shrink-0 ${warning ? "text-rose-400" : accent ? "text-amber-400" : "text-violet-400"}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${warning ? "text-rose-400" : accent ? "text-amber-300" : "text-violet-400"}`}>{label}</span>
      </div>
      <p className="text-sm text-violet-100 leading-relaxed">{text}</p>
    </div>
  );
}

function HoroscopePanel({ signId }: { signId: string }) {
  const sign = SIGN_BY_ID[signId];
  const [period, setPeriod] = useState<Period>("daily");
  const [reading, setReading] = useState<AstrologyReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReading(null);
    setError("");
    setLoading(true);
    getHoroscope(signId, period)
      .then((r) => setReading(r.reading))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [signId, period]);

  if (!sign) return null;

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${ELEMENT_BG[sign.element]}`}>
        <span className="text-5xl leading-none">{sign.symbol}</span>
        <div>
          <h2 className="text-xl font-bold text-violet-100">{sign.nameGr}</h2>
          <p className="text-xs text-violet-400 mt-0.5">{sign.dates}</p>
          <span className={`text-xs font-medium mt-1 inline-block ${ELEMENT_COLORS[sign.element]}`}>{sign.element}</span>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-[#2e2a3a] border border-violet-800/30">
        {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${period === key ? "bg-violet-800/60 text-amber-300" : "text-violet-400 hover:text-violet-200"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5 -mt-1">
        <Calendar className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-xs text-violet-500">{getPeriodLabel(period)}</span>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}
        </div>
      )}
      {error && <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-4 text-sm text-rose-300">{error}</div>}
      {reading && !loading && (
        <div className="animate-fade-in flex flex-col gap-3">
          <ReadingSection icon={Sparkles} label="Γενικό Μήνυμα" text={reading.general} accent />
          <ReadingSection icon={Heart} label="Αγάπη" text={reading.love} />
          <ReadingSection icon={Briefcase} label="Καριέρα" text={reading.career} />
          <ReadingSection icon={Star} label="Τύχη" text={reading.luck} />
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-violet-500/5 p-4">
            <p className="text-sm text-amber-200 italic leading-relaxed">"{reading.summary}"</p>
          </div>
          <ReadingSection icon={AlertTriangle} label="Προσοχή" text={reading.warning} warning />
        </div>
      )}
    </div>
  );
}

function PersonalizedForm({ onInsufficientCredits }: { onInsufficientCredits: () => void }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [sign, setSign] = useState("");
  const [sex, setSex] = useState("");
  const [dob, setDob] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AstrologyReading | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getIdToken()
      .then((t) => {
        setIsLoggedIn(!!t);
        if (t) {
          getBirthProfile()
            .then((p) => {
              if (p) {
                if (p.chart?.sun_sign) setSign(p.chart.sun_sign);
                if (p.sex) setSex(p.sex);
                if (p.date_of_birth) setDob(p.date_of_birth);
                if (p.eye_color) setEyeColor(p.eye_color);
                setProfileLoaded(true);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sign || !sex || !eyeColor) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await createPersonalizedAstrologyReading({ sign, sex, date_of_birth: dob, eye_color: eyeColor });
      setResult(data.reading);
      notifyCreditsChanged();
    } catch (e: any) {
      const msg = e.message ?? "Κάτι πήγε στραβά";
      const isLowCredits = msg.includes("credits") || msg.includes("402");
      if (isLowCredits) onInsufficientCredits();
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (isLoggedIn === null) return null;

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-violet-900/40 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-5 h-5 text-violet-400" />
        </div>
        <h3 className="text-base font-semibold text-violet-100 mb-1">Εξατομικευμένη Ανάγνωση</h3>
        <p className="text-sm text-violet-400 mb-4">Συνδέσου για να λάβεις μια ανάγνωση φτιαγμένη αποκλειστικά για σένα</p>
        <button onClick={() => router.push("/login")} className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold rounded-xl px-5 py-2.5 text-sm">
          Σύνδεση / Εγγραφή
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
          <User className="w-4 h-4 text-black" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-violet-100">Εξατομικευμένη Ανάγνωση</h3>
          <p className="text-xs text-violet-400">
            {profileLoaded ? "Προ-συμπληρώθηκε από το αστρολογικό σου προφίλ" : "Βασισμένη στα δικά σου χαρακτηριστικά"}
          </p>
        </div>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-violet-400 mb-1 block">Ζώδιο</label>
            <select value={sign} onChange={(e) => setSign(e.target.value)} required
              className="w-full bg-[#24242E] border border-violet-800/40 rounded-xl px-4 py-2.5 text-sm text-violet-100 focus:outline-none focus:border-violet-600/60">
              <option value="">— Επίλεξε ζώδιο —</option>
              {SIGNS.map((s) => <option key={s.id} value={s.id}>{s.symbol} {s.nameGr}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-violet-400 mb-1 block">
              Ημερομηνία Γέννησης <span className="text-violet-600 ml-1">(προαιρετικό — συμπληρώνει το ζώδιο αυτόματα)</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
              <input type="date" value={dob}
                onChange={(e) => { const val = e.target.value; setDob(val); if (val) setSign(getSignFromDob(val)); }}
                className="w-full bg-[#24242E] border border-violet-800/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-violet-100 focus:outline-none focus:border-violet-600/60 [color-scheme:dark]" />
            </div>
          </div>

          <div>
            <label className="text-xs text-violet-400 mb-1 block">Φύλο</label>
            <div className="flex gap-2">
              {SEX_OPTIONS.map((opt) => (
                <button key={opt} type="button" onClick={() => setSex(opt)}
                  className={`flex-1 rounded-xl border py-2 text-sm transition-all ${sex === opt ? "border-amber-500/60 bg-amber-500/10 text-amber-300" : "border-violet-800/40 text-violet-400 hover:border-violet-600/50"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-violet-400 mb-1 block">
              <Eye className="w-3 h-3 inline mr-1" />
              Χρώμα Ματιών
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EYE_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setEyeColor(c)}
                  className={`rounded-xl border py-2 text-xs transition-all ${eyeColor === c ? "border-amber-500/60 bg-amber-500/10 text-amber-300" : "border-violet-800/40 text-violet-400 hover:border-violet-600/50"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-rose-300 text-center">{error}</p>}

          <button type="submit" disabled={loading || !sign || !sex || !eyeColor}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-semibold rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2 mt-1">
            {loading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Οι αστέρες μιλούν…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Δημιούργησε Εξατομικευμένη Ανάγνωση</>
            )}
          </button>
          {!loading && (
            <div className="flex items-center justify-center gap-1 text-xs text-amber-600">
              <Coins className="w-3 h-3" />
              <span>1 credit</span>
            </div>
          )}
        </form>
      ) : (
        <div className="animate-fade-in flex flex-col gap-3">
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-violet-500/5 p-4 mb-1">
            <p className="text-sm text-amber-200 italic">"{result.summary}"</p>
          </div>
          <ReadingSection icon={Sparkles} label="Γενικό Μήνυμα" text={result.general} accent />
          <ReadingSection icon={Heart} label="Αγάπη" text={result.love} />
          <ReadingSection icon={Briefcase} label="Καριέρα" text={result.career} />
          <ReadingSection icon={Star} label="Τύχη" text={result.luck} />
          <ReadingSection icon={AlertTriangle} label="Προσοχή" text={result.warning} warning />
          <button onClick={() => setResult(null)}
            className="w-full border border-violet-700/40 hover:border-violet-600/60 text-violet-300 hover:text-violet-100 rounded-xl py-2.5 text-sm transition-all flex items-center justify-center gap-2 mt-1">
            <RefreshCw className="w-4 h-4" />
            Νέα Ανάγνωση
          </button>
        </div>
      )}
    </div>
  );
}

export default function AstrologyPage() {
  const router = useRouter();
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  // Wait for router to be ready before reading query params
  const selectedSign = router.isReady ? (router.query.sign as string) || "" : "";

  function selectSign(id: string) {
    router.push(`/astrology?sign=${id}`);
  }

  function clearSign() {
    router.push("/astrology");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        requiredCredits={1}
        featureName="Αστρολογία"
      />
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20 glow-pulse">
            <span className="text-2xl">✦</span>
          </div>
          <h1 className="text-2xl font-bold text-violet-100 mb-1">Αστρολογία</h1>
          <p className="text-sm text-violet-400">Ημερήσιες, εβδομαδιαίες και μηνιαίες προβλέψεις για όλα τα ζώδια</p>
        </div>

        {!selectedSign ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-10">
              {SIGNS.map((sign) => (
                <button key={sign.id} onClick={() => selectSign(sign.id)}
                  className="group rounded-2xl border bg-[#2e2a3a] hover:bg-[#352f43] p-4 flex flex-col items-center gap-2 transition-all border-violet-800/30 hover:border-violet-600/50 hover:shadow-lg hover:shadow-violet-900/30">
                  <span className="text-3xl leading-none group-hover:scale-110 transition-transform">{sign.symbol}</span>
                  <span className="text-xs font-medium text-violet-200">{sign.nameGr}</span>
                  <span className={`text-[10px] ${ELEMENT_COLORS[sign.element]}`}>{sign.element}</span>
                </button>
              ))}
            </div>
            <PersonalizedForm onInsufficientCredits={() => setCreditDialogOpen(true)} />
          </>
        ) : (
          <div className="flex flex-col gap-6">
            <button onClick={clearSign} className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-200 transition-colors w-fit">
              <ChevronLeft className="w-4 h-4" />
              Όλα τα ζώδια
            </button>
            <HoroscopePanel signId={selectedSign} />
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-violet-800/30" />
                <span className="text-xs text-violet-500 uppercase tracking-widest">Εξατομικευμένη</span>
                <div className="flex-1 h-px bg-violet-800/30" />
              </div>
              <PersonalizedForm onInsufficientCredits={() => setCreditDialogOpen(true)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
