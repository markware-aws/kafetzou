import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR from "swr";
import {
  Sparkles,
  Heart,
  Briefcase,
  Star,
  ChevronLeft,
  RefreshCw,
  Calendar,
  Coins,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import {
  getHoroscope,
  createPersonalizedAstrologyReading,
  getBirthProfile,
  AstrologyReading,
} from "@/lib/api";
import { SIGNS, SIGN_BY_ID, getSignFromDob } from "@/lib/astrology";
import { BIRTH_CHART_PATH } from "@/lib/zodiac";
import { getIdToken } from "@/lib/auth";
import { notifyCreditsChanged } from "@/lib/user";
import { InsufficientCreditsDialog } from "@/components/credits-dialog";
import { CautionNote } from "@/components/caution-note";
import { BIRTH_PROFILE_SWR_KEY, NatalReadingButton } from "@/components/natal-reading-button";
import { useAuthedSWR } from "@/lib/use-authed-swr";
import { Seo } from "@/components/seo";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Ημερήσια",
  weekly: "Εβδομαδιαία",
  monthly: "Μηνιαία",
};

const GREEK_MONTHS = [
  "Ιανουαρίου",
  "Φεβρουαρίου",
  "Μαρτίου",
  "Απριλίου",
  "Μαΐου",
  "Ιουνίου",
  "Ιουλίου",
  "Αυγούστου",
  "Σεπτεμβρίου",
  "Οκτωβρίου",
  "Νοεμβρίου",
  "Δεκεμβρίου",
];
const GREEK_MONTHS_NOM = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];
const GREEK_DAYS = [
  "Κυριακή",
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
];
const SEX_OPTIONS = ["Άνδρας", "Γυναίκα", "Άλλο"];
const EYE_COLORS = ["Μαύρα", "Καφέ", "Καφέ σκούρο", "Πράσινα", "Μπλε", "Γκρι"];

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

function ReadingSection({
  icon: Icon,
  label,
  text,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-violet-800 bg-surface p-4">
      <h3 className="flex items-center gap-2 mb-2 text-sm font-medium text-violet-50">
        <Icon className="w-4 h-4 text-violet-300 shrink-0" />
        {label}
      </h3>
      <p className="text-sm text-violet-200 leading-relaxed">{text}</p>
    </div>
  );
}

function HoroscopePanel({ signId }: { signId: string }) {
  const sign = SIGN_BY_ID[signId];
  const [period, setPeriod] = useState<Period>("daily");
  const { data, error, isLoading, isValidating } = useSWR(
    ["astrology-horoscope", signId, period],
    ([, resolvedSign, selectedPeriod]) =>
      getHoroscope(String(resolvedSign), selectedPeriod as Period),
    { keepPreviousData: true, revalidateOnFocus: false },
  );
  const reading: AstrologyReading | null = data?.reading ?? null;
  const errorMessage = error instanceof Error ? error.message : "";

  if (!sign) return null;

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="text-4xl leading-none text-violet-50">{sign.symbol}</span>
        <div>
          <h2 className="text-lg font-semibold text-violet-50">{sign.nameGr}</h2>
          <p className="text-sm text-violet-300">
            {sign.dates} · {sign.element}
          </p>
        </div>
      </div>

      <div>
        <div role="tablist" className="flex gap-6 border-b border-violet-800">
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={period === key}
                onClick={() => setPeriod(key)}
                className={`-mb-px border-b-2 pb-2 text-sm transition-colors ${
                  period === key
                    ? "border-amber-500 text-violet-50"
                    : "border-transparent text-violet-300 hover:text-violet-100"
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-violet-300">
          <Calendar className="w-3.5 h-3.5" />
          {getPeriodLabel(period)}
        </p>
      </div>

      {isLoading && !reading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-violet-800 bg-surface p-4 flex flex-col gap-2"
            >
              <div className="h-3 w-24 rounded shimmer" />
              <div className="h-12 rounded shimmer" />
            </div>
          ))}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-4 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}
      {reading && (
        <div className="animate-fade-in flex flex-col gap-3">
          <p className="text-sm text-violet-100 leading-relaxed">
            {reading.summary}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ReadingSection
              icon={Sparkles}
              label="Γενικό μήνυμα"
              text={reading.general}
            />
            <ReadingSection icon={Heart} label="Αγάπη" text={reading.love} />
            <ReadingSection
              icon={Briefcase}
              label="Καριέρα"
              text={reading.career}
            />
            <ReadingSection icon={Star} label="Τύχη" text={reading.luck} />
          </div>
          <CautionNote text={reading.warning} />
        </div>
      )}
      {isValidating && reading && (
        <p className="text-xs text-violet-300">Ανανέωση ωροσκοπίου...</p>
      )}
    </div>
  );
}

function PersonalizedForm({
  onInsufficientCredits,
}: {
  onInsufficientCredits: () => void;
}) {
  const router = useRouter();
  const [sign, setSign] = useState("");
  const [sex, setSex] = useState("");
  const [dob, setDob] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AstrologyReading | null>(null);
  const [error, setError] = useState("");

  const { data: token } = useSWR(["astrology-auth-token"], () => getIdToken(), {
    revalidateOnFocus: false,
  });
  const isLoggedIn = token === undefined ? null : !!token;
  // Same key as the chart reading section below, so the profile is fetched once.
  const { data: birthProfile } = useAuthedSWR(
    token ? BIRTH_PROFILE_SWR_KEY : null,
    () => getBirthProfile(),
  );

  useEffect(() => {
    if (!birthProfile) return;
    if (birthProfile.chart?.sun_sign) setSign(birthProfile.chart.sun_sign);
    if (birthProfile.sex) setSex(birthProfile.sex);
    if (birthProfile.date_of_birth) setDob(birthProfile.date_of_birth);
    if (birthProfile.eye_color) setEyeColor(birthProfile.eye_color);
    setProfileLoaded(true);
  }, [birthProfile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sign || !sex || !eyeColor) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await createPersonalizedAstrologyReading({
        sign,
        sex,
        date_of_birth: dob,
        eye_color: eyeColor,
      });
      setResult(data.reading);
      notifyCreditsChanged();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Κάτι πήγε στραβά";
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
      <section className="rounded-lg border border-violet-800 bg-surface p-5">
        <h2 className="text-lg font-semibold text-violet-50">
          Εξατομικευμένη ανάγνωση
        </h2>
        <p className="mt-1 mb-4 text-sm text-violet-300">
          Συνδέσου για να λάβεις μια ανάγνωση φτιαγμένη αποκλειστικά για σένα.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Σύνδεση / Εγγραφή
        </button>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-violet-50">
        Εξατομικευμένη ανάγνωση
      </h2>
      <p className="mt-1 mb-4 text-sm text-violet-300">
        {profileLoaded
          ? "Προ-συμπληρώθηκε από το αστρολογικό σου προφίλ"
          : "Βασισμένη στα δικά σου χαρακτηριστικά"}
      </p>

      {!result ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-violet-800 bg-surface p-5 flex flex-col gap-4"
        >
          <div>
            <label
              htmlFor="astro-sign"
              className="block text-sm font-medium text-violet-100 mb-1.5"
            >
              Ζώδιο
            </label>
            <select
              id="astro-sign"
              value={sign}
              onChange={(e) => setSign(e.target.value)}
              required
              className="w-full rounded-md border border-violet-700 bg-bg px-3 py-2 text-base text-violet-50 focus:outline-none focus:border-amber-500"
            >
              <option value="">— Επέλεξε ζώδιο —</option>
              {SIGNS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.symbol} {s.nameGr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="astro-dob"
              className="block text-sm font-medium text-violet-100 mb-1.5"
            >
              Ημερομηνία γέννησης{" "}
              <span className="font-normal text-violet-300">
                (προαιρετικό — συμπληρώνει το ζώδιο αυτόματα)
              </span>
            </label>
            <input
              id="astro-dob"
              type="date"
              value={dob}
              onChange={(e) => {
                const val = e.target.value;
                setDob(val);
                if (val) setSign(getSignFromDob(val));
              }}
              className="w-full rounded-md border border-violet-700 bg-bg px-3 py-2 text-base text-violet-50 placeholder:text-violet-400 focus:outline-none focus:border-amber-500 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-violet-100 mb-1.5">
              Φύλο
            </label>
            <div className="flex gap-2">
              {SEX_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSex(opt)}
                  aria-pressed={sex === opt}
                  className={`flex-1 rounded-md border py-2 text-sm transition-colors ${
                    sex === opt
                      ? "border-amber-500 bg-violet-900/60 text-violet-50"
                      : "border-violet-700 text-violet-200 hover:border-violet-600 hover:text-violet-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-violet-100 mb-1.5">
              Χρώμα ματιών
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EYE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEyeColor(c)}
                  aria-pressed={eyeColor === c}
                  className={`rounded-md border py-2 text-sm transition-colors ${
                    eyeColor === c
                      ? "border-amber-500 bg-violet-900/60 text-violet-50"
                      : "border-violet-700 text-violet-200 hover:border-violet-600 hover:text-violet-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
            <button
              type="submit"
              disabled={loading || !sign || !sex || !eyeColor}
              className="flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Οι αστέρες μιλούν…
                </>
              ) : (
                "Δημιούργησε εξατομικευμένη ανάγνωση"
              )}
            </button>
            {!loading && (
              <span className="flex items-center gap-1.5 text-xs text-violet-300">
                <Coins className="w-3.5 h-3.5" />1 credit
              </span>
            )}
          </div>
        </form>
      ) : (
        <div className="animate-fade-in flex flex-col gap-3">
          <p className="text-sm text-violet-100 leading-relaxed">
            {result.summary}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ReadingSection
              icon={Sparkles}
              label="Γενικό μήνυμα"
              text={result.general}
            />
            <ReadingSection icon={Heart} label="Αγάπη" text={result.love} />
            <ReadingSection
              icon={Briefcase}
              label="Καριέρα"
              text={result.career}
            />
            <ReadingSection icon={Star} label="Τύχη" text={result.luck} />
          </div>
          <CautionNote text={result.warning} />
          <button
            onClick={() => setResult(null)}
            className="self-start mt-1 flex items-center gap-2 rounded-md border border-violet-700 text-violet-100 hover:border-violet-600 hover:bg-violet-900/50 text-sm px-4 py-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Νέα ανάγνωση
          </button>
        </div>
      )}
    </section>
  );
}

function NatalChartSection() {
  return (
    <section
      id="xartis"
      className="scroll-mt-20 rounded-lg border border-amber-600/60 bg-surface p-5"
    >
      <h2 className="text-lg font-semibold text-violet-50">Ο αστρολογικός σου χάρτης</h2>
      <p className="mt-1 mb-4 text-sm text-violet-200 leading-relaxed">
        Μια ανάγνωση όλου του χάρτη γέννησής σου: ο χαρακτήρας, τα συναισθήματα, ο έρωτας, η
        καριέρα και ο δρόμος σου. Γίνεται από τα στοιχεία γέννησης του προφίλ σου.{" "}
        <Link href={BIRTH_CHART_PATH} className="text-amber-400 hover:text-amber-300">
          Δες τον χάρτη σου
        </Link>
      </p>
      <NatalReadingButton returnTo="/astrology/#xartis" />
    </section>
  );
}

export default function AstrologyPage() {
  const router = useRouter();
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  // Wait for router to be ready before reading query params
  const selectedSign = router.isReady
    ? (router.query.sign as string) || ""
    : "";

  function selectSign(id: string) {
    router.push(`/astrology?sign=${id}`);
  }

  function clearSign() {
    router.push("/astrology");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Seo
        title="Ζώδια Σήμερα, Εβδομάδας & Μήνα"
        description="Δωρεάν ημερήσιες, εβδομαδιαίες και μηνιαίες προβλέψεις για όλα τα ζώδια: έρωτας, καριέρα, τύχη. Και εξατομικευμένη ανάγνωση από τον ωροσκόπο σου."
        path="/astrology/"
      />
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        requiredCredits={1}
        featureName="Αστρολογία"
      />
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-violet-50">Αστρολογία</h1>
          <p className="mt-1 text-sm text-violet-300">
            Ημερήσιες, εβδομαδιαίες και μηνιαίες προβλέψεις για όλα τα ζώδια.
          </p>
        </div>

        {!selectedSign ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-10">
              {SIGNS.map((sign) => (
                <button
                  key={sign.id}
                  onClick={() => selectSign(sign.id)}
                  className="rounded-md border border-violet-800 bg-surface text-violet-200 hover:border-violet-600 hover:text-violet-50 py-3 flex flex-col items-center gap-1 transition-colors"
                >
                  <span className="text-2xl leading-none">{sign.symbol}</span>
                  <span className="text-sm">{sign.nameGr}</span>
                  <span className="text-xs text-violet-300">{sign.element}</span>
                </button>
              ))}
            </div>
            <PersonalizedForm
              onInsufficientCredits={() => setCreditDialogOpen(true)}
            />
            <div className="mt-10">
              <NatalChartSection />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-6">
              <button
                onClick={clearSign}
                className="flex items-center gap-1.5 text-sm text-violet-300 hover:text-violet-50 transition-colors w-fit"
              >
                <ChevronLeft className="w-4 h-4" />
                Όλα τα ζώδια
              </button>
              <HoroscopePanel signId={selectedSign} />
            </div>
            <PersonalizedForm
              onInsufficientCredits={() => setCreditDialogOpen(true)}
            />
            <NatalChartSection />
          </div>
        )}
      </div>
    </div>
  );
}
