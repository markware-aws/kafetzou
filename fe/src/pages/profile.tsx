import { useState, useEffect } from "react";
import { User, Calendar, Clock, MapPin, Save, RefreshCw, Sun, Moon, ArrowUp, AlertCircle, CheckCircle2, Eye, Coins, Plus } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { getBirthProfile, saveBirthProfile, getMe, BirthProfile } from "@/lib/api";
import { SIGN_BY_ID } from "@/lib/astrology";
import { InsufficientCreditsDialog } from "@/components/credits-dialog";

const SEX_OPTIONS = ["Άνδρας", "Γυναίκα", "Άλλο"];
const EYE_COLORS = ["Μαύρα", "Καφέ", "Φουντουκί", "Πράσινα", "Μπλε", "Γκρι"];

function ChartCard({ label, icon: Icon, sign, degree, note }: {
  label: string; icon: any; sign: string; degree: number; note?: string;
}) {
  const signData = SIGN_BY_ID[sign];
  return (
    <div className="rounded-2xl border border-violet-800/30 bg-surface p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-violet-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-xl">{signData?.symbol ?? "✦"}</span>
          <span className="text-sm font-semibold text-violet-100">{signData?.nameGr ?? sign}</span>
          <span className="text-xs text-violet-500">{degree}°</span>
        </div>
        {note && <p className="text-[10px] text-amber-600 mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  const [dob, setDob] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [sex, setSex] = useState("");
  const [eyeColor, setEyeColor] = useState("");

  useEffect(() => {
    getMe().then((u) => setCredits(Number(u.credits ?? 0))).catch(() => {});
    getBirthProfile()
      .then((p) => {
        setProfile(p);
        if (p) {
          setDob(p.date_of_birth ?? "");
          setTimeUnknown(!p.time_known);
          setBirthTime(p.time_of_birth ?? "");
          setBirthPlace(p.birth_place ?? "");
          setSex(p.sex ?? "");
          setEyeColor(p.eye_color ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dob || !birthPlace) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const saved = await saveBirthProfile({
        date_of_birth: dob,
        time_of_birth: timeUnknown ? null : (birthTime || null),
        birth_place: birthPlace,
        sex: sex || undefined,
        eye_color: eyeColor || undefined,
      });
      setProfile(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => { setCreditDialogOpen(false); getMe().then((u) => setCredits(Number(u.credits ?? 0))).catch(() => {}); }}
        requiredCredits={0}
        featureName="Αγόρασε credits"
      />
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <User className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-violet-100">Αστρολογικό Προφίλ</h1>
              <p className="text-sm text-violet-400">Τα στοιχεία γέννησής σου για ακριβέστερες αναγνώσεις</p>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-800/30 bg-surface p-5 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-violet-400 font-medium uppercase tracking-wide">Υπόλοιπο Credits</p>
                <p className="text-xl font-bold text-amber-300">
                  {credits === null ? "—" : credits}
                  <span className="text-sm font-normal text-violet-400 ml-1">credits</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setCreditDialogOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-4 py-2 text-sm transition-all shadow-lg shadow-amber-500/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Αγόρασε
            </button>
          </div>

          {profile?.chart && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-violet-800/30" />
                <span className="text-xs text-violet-500 uppercase tracking-widest font-medium">Γεννητικός Χάρτης</span>
                <div className="h-px flex-1 bg-violet-800/30" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ChartCard label="Ήλιος ☉" icon={Sun} sign={profile.chart.sun_sign} degree={profile.chart.sun_degree} note="Ψυχή & ταυτότητα" />
                <ChartCard label="Σελήνη ☽" icon={Moon} sign={profile.chart.moon_sign} degree={profile.chart.moon_degree} note={profile.chart.time_known ? "Εσωτερικός κόσμος" : "Κατά προσέγγιση (ώρα άγνωστη)"} />
                {profile.chart.ascendant_sign ? (
                  <ChartCard label="Ωροσκόπος ↑" icon={ArrowUp} sign={profile.chart.ascendant_sign} degree={profile.chart.ascendant_degree!} note="Εξωτερική εικόνα" />
                ) : (
                  <div className="rounded-2xl border border-violet-800/20 bg-surface/50 p-4 flex items-center gap-3">
                    <ArrowUp className="w-4 h-4 text-violet-600 shrink-0" />
                    <div>
                      <p className="text-xs text-violet-500 font-medium uppercase tracking-wide mb-0.5">Ωροσκόπος ↑</p>
                      <p className="text-xs text-violet-600">Απαιτεί ώρα γέννησης</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-violet-500 mt-3 text-center">Αυτά τα δεδομένα χρησιμοποιούνται αυτόματα στις εξατομικευμένες αστρολογικές αναγνώσεις σου.</p>
            </div>
          )}

          <div className="rounded-2xl border border-violet-800/30 bg-surface p-6">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-10 shimmer rounded-xl" />)}
              </div>
            ) : (
              <form onSubmit={handleSave} className="flex flex-col gap-5">
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-violet-400 mb-2 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    Ημερομηνία Γέννησης
                  </label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required
                    className="w-full bg-bg border border-violet-800/40 rounded-xl px-4 py-2.5 text-sm text-violet-100 focus:outline-none focus:border-violet-600/60 [color-scheme:dark]" />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs text-violet-400 mb-2 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    Ώρα Γέννησης
                  </label>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={timeUnknown} onChange={(e) => { setTimeUnknown(e.target.checked); if (e.target.checked) setBirthTime(""); }}
                        className="w-4 h-4 rounded accent-amber-500" />
                      <span className="text-xs text-violet-400">Δεν γνωρίζω την ώρα</span>
                    </label>
                  </div>
                  {!timeUnknown ? (
                    <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
                      className="w-full bg-bg border border-violet-800/40 rounded-xl px-4 py-2.5 text-sm text-violet-100 focus:outline-none focus:border-violet-600/60 [color-scheme:dark]" />
                  ) : (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300 leading-relaxed">Θα χρησιμοποιηθεί 12:00 μεσημέρι. Το ζώδιο Σελήνης ενδέχεται να διαφέρει κατά ±1 ζώδιο και ο Ωροσκόπος δεν θα υπολογιστεί.</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs text-violet-400 mb-2 font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    Τόπος Γέννησης
                  </label>
                  <input type="text" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} required placeholder="π.χ. Αθήνα, Ελλάδα"
                    className="w-full bg-bg border border-violet-800/40 rounded-xl px-4 py-2.5 text-sm text-violet-100 placeholder-violet-600 focus:outline-none focus:border-violet-600/60" />
                  <p className="text-[11px] text-violet-600 mt-1">Χρησιμοποιείται για τον υπολογισμό του Ωροσκόπου</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-violet-800/30" />
                  <span className="text-[10px] text-violet-600 uppercase tracking-widest">Για αστρολογικές αναγνώσεις</span>
                  <div className="h-px flex-1 bg-violet-800/30" />
                </div>

                <div>
                  <label className="text-xs text-violet-400 mb-2 block font-medium">Φύλο</label>
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
                  <label className="flex items-center gap-1.5 text-xs text-violet-400 mb-2 font-medium">
                    <Eye className="w-3.5 h-3.5" />
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

                {error && (
                  <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-300">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={saving || !dob || !birthPlace}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-amber-500/20">
                  {saving ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Υπολογισμός χάρτη…</>
                  ) : success ? (
                    <><CheckCircle2 className="w-4 h-4" /> Αποθηκεύτηκε!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Αποθήκευση & Υπολογισμός Χάρτη</>
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
