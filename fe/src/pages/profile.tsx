import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import {
  getBirthProfile,
  saveBirthProfile,
  getMe,
} from "@/lib/api";
import { SIGN_BY_ID } from "@/lib/astrology";
import { InsufficientCreditsDialog } from "@/components/credits-dialog";
import { NatalChartWheel } from "@/components/natal-chart-wheel";
import { NatalChartDetails } from "@/components/natal-chart-details";
import { BIRTH_PROFILE_SWR_KEY, NatalReadingButton } from "@/components/natal-reading-button";
import { useAuthedSWR } from "@/lib/use-authed-swr";

const SEX_OPTIONS = ["Άνδρας", "Γυναίκα", "Άλλο"];
const EYE_COLORS = ["Μαύρα", "Καφέ", "Καφέ σκούρο", "Πράσινα", "Μπλε", "Γκρι"];

function ChartCard({
  label,
  sign,
  degree,
  note,
}: {
  label: string;
  sign: string;
  degree: number;
  note?: string;
}) {
  const signData = SIGN_BY_ID[sign];
  return (
    <div className="rounded-lg border border-violet-800 bg-surface p-4">
      <p className="text-xs text-violet-300">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <span className="text-lg leading-none text-violet-50">
          {signData?.symbol ?? "✦"}
        </span>
        <span className="text-sm font-medium text-violet-50">
          {signData?.nameGr ?? sign}
        </span>
        <span className="text-xs text-violet-300 tabular-nums">{degree}°</span>
      </p>
      {note && <p className="mt-1 text-xs text-violet-300">{note}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  const [dob, setDob] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [sex, setSex] = useState("");
  const [eyeColor, setEyeColor] = useState("");

  const { data: meData, mutate: mutateMe } = useAuthedSWR(["me"], () => getMe());
  const {
    data: profile,
    error: profileLoadError,
    isLoading: profileLoading,
    mutate: mutateProfile,
  } = useAuthedSWR(BIRTH_PROFILE_SWR_KEY, () => getBirthProfile());

  const credits = meData ? Number(meData.credits ?? 0) : null;
  const loading = profile === undefined && profileLoading;
  const loadErrorMessage =
    profileLoadError instanceof Error ? profileLoadError.message : "";

  useEffect(() => {
    if (!profile) return;
    setDob(profile.date_of_birth ?? "");
    setTimeUnknown(!profile.time_known);
    setBirthTime(profile.time_of_birth ?? "");
    setBirthPlace(profile.birth_place ?? "");
    setSex(profile.sex ?? "");
    setEyeColor(profile.eye_color ?? "");
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dob || !birthPlace) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const saved = await saveBirthProfile({
        date_of_birth: dob,
        time_of_birth: timeUnknown ? null : birthTime || null,
        birth_place: birthPlace,
        sex: sex || undefined,
        eye_color: eyeColor || undefined,
      });
      await mutateProfile(saved, { revalidate: false });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Αποτυχία αποθήκευσης προφίλ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard title="Προφίλ">
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => {
          setCreditDialogOpen(false);
          mutateMe();
        }}
        requiredCredits={0}
        featureName="Αγόρασε credits"
      />
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-violet-50">
              Αστρολογικό προφίλ
            </h1>
            <p className="mt-1 text-sm text-violet-300">
              Τα στοιχεία γέννησής σου για ακριβέστερες αναγνώσεις
            </p>
          </div>

          <div className="rounded-lg border border-violet-800 bg-surface p-5 mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-violet-300">Υπόλοιπο credits</p>
              <p className="mt-0.5 text-xl font-semibold text-violet-50 tabular-nums">
                {credits === null ? "—" : credits}
                <span className="ml-1 text-sm font-normal text-violet-300">
                  credits
                </span>
              </p>
            </div>
            <button
              onClick={() => setCreditDialogOpen(true)}
              className="flex items-center gap-2 shrink-0 rounded-md border border-violet-700 text-violet-100 hover:border-violet-600 hover:bg-violet-900/50 text-sm px-4 py-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Αγόρασε
            </button>
          </div>

          {profile?.chart && (
            <div className="mb-8 animate-fade-in">
              <h2 className="text-lg font-semibold text-violet-50 mb-3">
                Γεννητικός χάρτης
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ChartCard
                  label="Ήλιος ☉"
                  sign={profile.chart.sun_sign}
                  degree={profile.chart.sun_degree}
                  note="Ψυχή & ταυτότητα"
                />
                <ChartCard
                  label="Σελήνη ☽"
                  sign={profile.chart.moon_sign}
                  degree={profile.chart.moon_degree}
                  note={
                    profile.chart.time_known
                      ? "Εσωτερικός κόσμος"
                      : "Κατά προσέγγιση (ώρα άγνωστη)"
                  }
                />
                {profile.chart.ascendant_sign ? (
                  <ChartCard
                    label="Ωροσκόπος ↑"
                    sign={profile.chart.ascendant_sign}
                    degree={profile.chart.ascendant_degree!}
                    note="Εξωτερική εικόνα"
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-violet-800 p-4">
                    <p className="text-xs text-violet-300">Ωροσκόπος ↑</p>
                    <p className="mt-1.5 text-sm text-violet-200">
                      Απαιτεί ώρα γέννησης
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-violet-300 mt-3">
                Αυτά τα δεδομένα χρησιμοποιούνται αυτόματα στις εξατομικευμένες
                αστρολογικές αναγνώσεις σου.
              </p>

              {profile.chart.planets && profile.chart.planets.length > 0 && (
                <div className="mt-6 flex flex-col gap-6">
                  <NatalChartWheel chart={profile.chart} />
                  <NatalChartDetails chart={profile.chart} />
                </div>
              )}

              <section className="mt-6 rounded-lg border border-amber-600/60 bg-surface p-5">
                <h3 className="text-base font-semibold text-violet-50">
                  Η ανάγνωση του χάρτη σου
                </h3>
                <p className="mt-1 mb-4 text-sm text-violet-200 leading-relaxed">
                  Η καφετζού διαβάζει ολόκληρο τον χάρτη σου: τον χαρακτήρα, τα
                  συναισθήματα, τον έρωτα, την καριέρα, τα δυνατά σου σημεία και τον
                  δρόμο σου.
                </p>
                <NatalReadingButton returnTo="/profile/" />
              </section>
            </div>
          )}

          <div className="rounded-lg border border-violet-800 bg-surface p-5">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 shimmer rounded-md" />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSave} className="flex flex-col gap-5">
                <div>
                  <label
                    htmlFor="profile-dob"
                    className="block text-sm font-medium text-violet-100 mb-1.5"
                  >
                    Ημερομηνία γέννησης
                  </label>
                  <input
                    id="profile-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="w-full rounded-md border border-violet-700 bg-bg px-3 py-2 text-base text-violet-50 focus:outline-none focus:border-amber-500 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-birth-time"
                    className="block text-sm font-medium text-violet-100 mb-1.5"
                  >
                    Ώρα γέννησης
                  </label>
                  <label className="inline-flex items-center gap-2 mb-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={timeUnknown}
                      onChange={(e) => {
                        setTimeUnknown(e.target.checked);
                        if (e.target.checked) setBirthTime("");
                      }}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span className="text-sm text-violet-200">
                      Δεν γνωρίζω την ώρα
                    </span>
                  </label>
                  {!timeUnknown ? (
                    <input
                      id="profile-birth-time"
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="w-full rounded-md border border-violet-700 bg-bg px-3 py-2 text-base text-violet-50 focus:outline-none focus:border-amber-500 [color-scheme:dark]"
                    />
                  ) : (
                    <div className="flex items-start gap-2 rounded-md border border-violet-700 bg-bg p-3">
                      <AlertCircle className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
                      <p className="text-sm text-violet-200 leading-relaxed">
                        Θα χρησιμοποιηθεί 12:00 μεσημέρι. Το ζώδιο Σελήνης
                        ενδέχεται να διαφέρει κατά ±1 ζώδιο, ενώ ο Ωροσκόπος και
                        οι οίκοι δεν θα υπολογιστούν.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-violet-100 mb-1.5">
                    Τόπος γέννησης
                  </label>
                  <PlaceAutocomplete
                    value={birthPlace}
                    onChange={setBirthPlace}
                  />
                  <p className="text-xs text-violet-300 mt-1.5">
                    Χρησιμοποιείται για τον υπολογισμό του Ωροσκόπου και των οίκων
                  </p>
                </div>

                <h3 className="border-t border-violet-800 pt-5 text-sm font-medium text-violet-50">
                  Για αστρολογικές αναγνώσεις
                </h3>

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
                        className={`flex-1 rounded-md border py-2 text-sm transition-colors ${sex === opt ? "border-amber-500 bg-violet-900/60 text-violet-50" : "border-violet-700 text-violet-200 hover:border-violet-600 hover:text-violet-50"}`}
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
                        className={`rounded-md border py-2 text-sm transition-colors ${eyeColor === c ? "border-amber-500 bg-violet-900/60 text-violet-50" : "border-violet-700 text-violet-200 hover:border-violet-600 hover:text-violet-50"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {(error || loadErrorMessage) && (
                  <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-200">{error || loadErrorMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || !dob || !birthPlace}
                  className="self-start flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Υπολογισμός
                      χάρτη…
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Αποθηκεύτηκε!
                    </>
                  ) : (
                    "Αποθήκευση & υπολογισμός χάρτη"
                  )}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
