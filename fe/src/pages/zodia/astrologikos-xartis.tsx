import { useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Seo } from "@/components/seo";
import { ContentLayout, ContentSection, RelatedLinks } from "@/components/content-layout";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { SignupPromptDialog } from "@/components/signup-prompt-dialog";
import { NatalChartWheel } from "@/components/natal-chart-wheel";
import { NatalChartDetails } from "@/components/natal-chart-details";
import { BIRTH_PROFILE_SWR_KEY, NatalReadingButton } from "@/components/natal-reading-button";
import {
  calculateChart,
  getBirthProfile,
  saveBirthProfile,
  type ChartData,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import { SIGN_BY_ID } from "@/lib/astrology";
import { ASPECTS, PLANETS, planetGlyph } from "@/lib/planets";
import type { PlaceOption } from "@/lib/place-search";
import { useAuthedSWR } from "@/lib/use-authed-swr";
import { SLUG_BY_SIGN_ID, zodiacSignPath } from "@/lib/zodiac";

const PAGE_PATH = "/zodia/astrologikos-xartis/";
const EARLIEST_BIRTH_YEAR = 1900;
const NOT_AUTHENTICATED = "Not authenticated";
const SAVED_NOTICE_MS = 4000;

const HOUSE_TOPICS = [
  "Ο εαυτός σου, η εμφάνιση και η πρώτη εντύπωση",
  "Τα χρήματα, τα υπάρχοντα και ό,τι εκτιμάς",
  "Η επικοινωνία, τα αδέλφια και τα μικρά ταξίδια",
  "Το σπίτι, η οικογένεια και οι ρίζες σου",
  "Ο έρωτας, η δημιουργία, τα παιδιά και η χαρά",
  "Η καθημερινή δουλειά, η υγεία και οι συνήθειες",
  "Ο γάμος, οι σύντροφοι και οι συνεργασίες",
  "Τα κοινά χρήματα, η οικειότητα και οι μεγάλες αλλαγές",
  "Τα ταξίδια, οι σπουδές και η πίστη",
  "Η καριέρα, η φήμη και οι στόχοι σου",
  "Οι φίλοι, οι παρέες και τα σχέδια για το μέλλον",
  "Ο εσωτερικός κόσμος, τα μυστικά και η ξεκούραση",
];

const RELATED_LINKS = [
  { href: "/zodia/oroskopos/", label: "Υπολογισμός ωροσκόπου" },
  { href: "/zodia/", label: "Τα 12 ζώδια" },
  { href: "/zodia/symvatotita/", label: "Συμβατότητα ζωδίων" },
  { href: "/astrology/", label: "Ζώδια σήμερα" },
];

const labelClassName = "block mb-1 text-xs text-violet-300";
const inputClassName =
  "w-full rounded-md border border-violet-700 bg-bg px-3 py-2 text-base text-violet-50 focus:outline-none focus:border-amber-500 [color-scheme:dark]";
const linkClassName = "text-amber-400 hover:text-amber-300";

/** The input a chart was drawn from, kept so it can be saved to the profile as it was. */
interface ChartInput {
  dateOfBirth: string;
  timeOfBirth: string | null;
  placeLabel: string;
}

interface ChartResult {
  chart: ChartData;
  input: ChartInput;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("el") + text.slice(1);
}

function formatInput(input: ChartInput): string {
  const [year, month, day] = input.dateOfBirth.split("-");
  const date = `${day}/${month}/${year}`;
  return [date, input.timeOfBirth, input.placeLabel].filter(Boolean).join(", ");
}

function SignLink({
  label,
  signId,
  anchor = "",
}: {
  label: string;
  signId: string;
  anchor?: string;
}) {
  const slug = SLUG_BY_SIGN_ID[signId];
  const sign = SIGN_BY_ID[signId];
  if (!slug || !sign) return null;
  return (
    <Link href={`${zodiacSignPath(slug)}${anchor}`} className={linkClassName}>
      {label}: {sign.nameGr}
    </Link>
  );
}

export default function BirthChartPage() {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [place, setPlace] = useState<PlaceOption | null>(null);
  const [result, setResult] = useState<ChartResult | null>(null);
  const [error, setError] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [signupPromptOpen, setSignupPromptOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { mutate } = useSWRConfig();

  // Same SWR key as the site header, so the auth check is shared.
  const { data: user } = useSWR(["home-user"], () => getUser(), {
    revalidateOnFocus: false,
  });
  const isSignedOut = user === null;
  const { data: profile } = useAuthedSWR(user ? BIRTH_PROFILE_SWR_KEY : null, () =>
    getBirthProfile(),
  );

  function fail(message: string) {
    setError(message);
    setResult(null);
  }

  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    if (!(await getUser())) {
      setSignupPromptOpen(true);
      return;
    }
    const [year, month, day] = birthDate.split("-").map(Number);
    if (!year || !month || !day || (!timeUnknown && !birthTime)) {
      fail("Συμπλήρωσε ημερομηνία, ώρα και τόπο γέννησης.");
      return;
    }
    if (!place) {
      fail("Διάλεξε τον τόπο γέννησης από τη λίστα.");
      return;
    }
    if (year < EARLIEST_BIRTH_YEAR || birthDate > todayIso()) {
      fail(`Δώσε μια ημερομηνία από το ${EARLIEST_BIRTH_YEAR} έως σήμερα.`);
      return;
    }

    const input: ChartInput = {
      dateOfBirth: birthDate,
      timeOfBirth: timeUnknown ? null : birthTime,
      placeLabel: place.label,
    };
    setCalculating(true);
    setError("");
    setSaved(false);
    setSaveError("");
    try {
      const chart = await calculateChart({
        date_of_birth: input.dateOfBirth,
        time_of_birth: input.timeOfBirth,
        latitude: place.latitude,
        longitude: place.longitude,
      });
      setResult({ chart, input });
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "";
      if (message === NOT_AUTHENTICATED) setSignupPromptOpen(true);
      else fail(message || "Κάτι πήγε στραβά. Δοκίμασε ξανά.");
    } finally {
      setCalculating(false);
    }
  }

  async function saveToProfile() {
    if (!result) return;
    setSaving(true);
    setSaveError("");
    try {
      // Read the profile right before saving, so its sex and eye colour are kept.
      const existing = await getBirthProfile();
      const savedProfile = await saveBirthProfile({
        date_of_birth: result.input.dateOfBirth,
        time_of_birth: result.input.timeOfBirth,
        birth_place: result.input.placeLabel,
        sex: existing?.sex ?? undefined,
        eye_color: existing?.eye_color ?? undefined,
      });
      await mutate(BIRTH_PROFILE_SWR_KEY, savedProfile, { revalidate: false });
      setSaved(true);
      setTimeout(() => setSaved(false), SAVED_NOTICE_MS);
    } catch (caught: unknown) {
      setSaveError(
        caught instanceof Error && caught.message
          ? caught.message
          : "Η αποθήκευση απέτυχε. Δοκίμασε ξανά.",
      );
    } finally {
      setSaving(false);
    }
  }

  const chart = result?.chart;

  return (
    <ContentLayout
      breadcrumbs={[
        { label: "Ζώδια", path: "/zodia/" },
        { label: "Αστρολογικός χάρτης", path: PAGE_PATH },
      ]}
    >
      <Seo
        title="Αστρολογικός Χάρτης: Υπολόγισε τον Γενέθλιο Χάρτη σου"
        description="Υπολόγισε δωρεάν τον αστρολογικό σου χάρτη από την ημερομηνία, την ώρα και τον τόπο γέννησης: πλανήτες, ζώδια, οίκοι και όψεις σε έναν τροχό."
        path={PAGE_PATH}
      />

      <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
        Αστρολογικός χάρτης
      </h1>
      <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">
        Ο αστρολογικός χάρτης δείχνει πού βρισκόταν ο Ήλιος, η Σελήνη και όλοι οι πλανήτες τη
        στιγμή που γεννήθηκες. Δώσε ημερομηνία, ώρα και τόπο γέννησης και δες τον δικό σου
        χάρτη: σε ποιο ζώδιο είναι κάθε πλανήτης, σε ποιον οίκο πέφτει και ποιες όψεις
        σχηματίζει με τους άλλους.
      </p>

      <SignupPromptDialog
        open={signupPromptOpen}
        onClose={() => setSignupPromptOpen(false)}
        returnTo={PAGE_PATH}
        featureText="Ο αστρολογικός χάρτης είναι διαθέσιμος για τα μέλη."
      />

      <form
        onSubmit={calculate}
        className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-violet-800 bg-surface p-4"
      >
        <div>
          <label htmlFor="chart-date" className={labelClassName}>
            Ημερομηνία γέννησης
          </label>
          <input
            id="chart-date"
            type="date"
            required
            min={`${EARLIEST_BIRTH_YEAR}-01-01`}
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor={timeUnknown ? undefined : "chart-time"} className={labelClassName}>
            Ώρα γέννησης
          </label>
          {timeUnknown ? (
            <p className="flex min-h-[42px] items-center gap-2 rounded-md border border-violet-700 bg-bg px-3 py-2 text-sm text-violet-200">
              <AlertCircle className="w-4 h-4 text-violet-300 shrink-0" />
              Χωρίς οίκους και ωροσκόπο
            </p>
          ) : (
            <input
              id="chart-time"
              type="time"
              required
              value={birthTime}
              onChange={(event) => setBirthTime(event.target.value)}
              className={inputClassName}
            />
          )}
          <label className="mt-2 inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(event) => setTimeUnknown(event.target.checked)}
              className="w-4 h-4 rounded accent-amber-500"
            />
            <span className="text-sm text-violet-200">Δεν ξέρω την ώρα</span>
          </label>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="chart-place" className={labelClassName}>
            Τόπος γέννησης
          </label>
          <PlaceAutocomplete
            id="chart-place"
            value={placeQuery}
            onChange={(value) => {
              setPlaceQuery(value);
              setPlace(null);
            }}
            onSelect={setPlace}
          />
        </div>
        {error && (
          <p role="alert" className="sm:col-span-2 text-sm text-rose-300">
            {error}
          </p>
        )}
        <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-2">
          <button
            type="submit"
            disabled={calculating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md px-5 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {calculating && <Loader2 className="w-4 h-4 animate-spin" />}
            {calculating ? "Υπολογισμός…" : "Υπολόγισε τον χάρτη"}
          </button>
          {isSignedOut && (
            <p className="text-xs text-violet-300 text-center sm:text-left">
              Χρειάζεται δωρεάν λογαριασμό.
            </p>
          )}
        </div>
      </form>

      {result && chart && (
        <section aria-live="polite" className="mt-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-violet-50">Ο χάρτης σου</h2>
          <p className="mt-1 text-sm text-violet-300">{formatInput(result.input)}</p>
          <div className="mt-5">
            <NatalChartWheel chart={chart} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <SignLink label="Ήλιος" signId={chart.sun_sign} />
            <SignLink label="Σελήνη" signId={chart.moon_sign} />
            {chart.ascendant_sign && (
              <SignLink label="Ωροσκόπος" signId={chart.ascendant_sign} anchor="#oroskopos" />
            )}
          </div>
          <div className="mt-6">
            <NatalChartDetails chart={chart} />
          </div>
        </section>
      )}

      <section className="mt-8 rounded-lg border border-amber-600/60 bg-surface p-5">
        <h2 className="text-base font-semibold text-violet-50">Η ανάγνωση του χάρτη σου</h2>
        <p className="mt-1 text-sm text-violet-200 leading-relaxed">
          Η καφετζού διαβάζει ολόκληρο τον χάρτη σου: τον χαρακτήρα, τα συναισθήματα, τον
          έρωτα, την καριέρα, τα δυνατά σου σημεία και τον δρόμο σου. Η ανάγνωση γίνεται από
          τον χάρτη που είναι αποθηκευμένος στο προφίλ σου.
        </p>

        {result && user && (
          <div className="mt-4 rounded-md border border-violet-700 bg-bg p-3">
            <p className="text-sm text-violet-200 leading-relaxed">
              Είναι αυτός ο δικός σου χάρτης; Αποθήκευσέ τον στο προφίλ για να τον διαβάσει η
              καφετζού.
            </p>
            {profile && (
              <p className="mt-1 text-xs text-violet-300">
                Η αποθήκευση αντικαθιστά τα στοιχεία γέννησης που έχει ήδη το προφίλ σου.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={saveToProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md border border-violet-700 hover:border-violet-600 hover:bg-violet-900/50 text-violet-100 text-sm px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Αποθήκευση στο προφίλ
              </button>
              {saved && (
                <span role="status" className="flex items-center gap-1.5 text-sm text-violet-100">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  Αποθηκεύτηκε
                </span>
              )}
            </div>
            {saveError && <p className="mt-2 text-sm text-rose-300">{saveError}</p>}
          </div>
        )}

        <div className="mt-4">
          <NatalReadingButton returnTo={PAGE_PATH} />
        </div>
      </section>

      <ContentSection title="Τι είναι ο αστρολογικός χάρτης">
        <p>
          Ο αστρολογικός χάρτης, ή γενέθλιος χάρτης, είναι μια φωτογραφία του ουρανού τη στιγμή
          που γεννήθηκες, όπως φαινόταν από τον τόπο της γέννησής σου. Δείχνει σε ποιο ζώδιο
          βρισκόταν ο Ήλιος, η Σελήνη και κάθε πλανήτης, ποιο ζώδιο ανέτειλε στον ορίζοντα και
          πώς μοιράζονται οι πλανήτες στους δώδεκα οίκους.
        </p>
        <p>
          Το ζώδιο που ξέρουν όλοι είναι η θέση του Ήλιου, δηλαδή ένα μόνο κομμάτι του χάρτη.
          Γι’ αυτό δύο άνθρωποι του ίδιου ζωδίου μπορεί να μοιάζουν τόσο λίγο: η Σελήνη, ο
          ωροσκόπος και οι πλανήτες τους είναι αλλού.
        </p>
        <p>
          Ο τροχός διαβάζεται αριστερόστροφα. Αριστερά, στη θέση των εννιά, είναι ο ωροσκόπος
          (ASC) και ψηλά το μεσουράνημα (MC). Στο εξωτερικό δαχτυλίδι είναι τα δώδεκα ζώδια,
          μέσα του οι πλανήτες με τη μοίρα τους, και στο κέντρο οι γραμμές των όψεων.
        </p>
      </ContentSection>

      <ContentSection title="Οι πλανήτες">
        <p>
          Κάθε πλανήτης μιλά για ένα κομμάτι του εαυτού σου. Το ζώδιο όπου βρίσκεται δείχνει
          τον τρόπο που το εκφράζεις και ο οίκος το πεδίο της ζωής όπου φαίνεται περισσότερο.
        </p>
        <dl className="flex flex-col divide-y divide-violet-800 rounded-lg border border-violet-800 bg-surface">
          {PLANETS.map((planet) => (
            <div key={planet.id} className="px-4 py-3 sm:flex sm:gap-6">
              <dt className="text-sm font-medium text-violet-50 sm:w-40 shrink-0">
                <span aria-hidden className="inline-block w-6 text-violet-300">
                  {planetGlyph(planet.id)}
                </span>
                {planet.name}
              </dt>
              <dd className="mt-1 sm:mt-0 text-sm text-violet-200">{capitalize(planet.theme)}</dd>
            </div>
          ))}
        </dl>
        <p>
          Ανάδρομος (℞) λέγεται ο πλανήτης που, όπως τον βλέπουμε από τη Γη, μοιάζει να
          κινείται προς τα πίσω. Η δύναμή του στρέφεται περισσότερο προς τα μέσα.
        </p>
      </ContentSection>

      <ContentSection title="Οι δώδεκα οίκοι">
        <p>
          Ο χάρτης χωρίζεται σε δώδεκα οίκους, έναν για κάθε πεδίο της ζωής. Ο πρώτος ξεκινά
          από τον ωροσκόπο και οι υπόλοιποι ακολουθούν αριστερόστροφα. Ένας πλανήτης στον
          πέμπτο οίκο, για παράδειγμα, φέρνει τη δύναμή του στον έρωτα και στη δημιουργία.
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {HOUSE_TOPICS.map((topic, index) => (
            <li
              key={topic}
              className="flex items-baseline gap-3 rounded-md border border-violet-800 bg-surface px-3 py-2 text-sm"
            >
              <span className="w-5 shrink-0 text-right font-medium text-violet-50 tabular-nums">
                {index + 1}
              </span>
              <span>{topic}</span>
            </li>
          ))}
        </ol>
        <p>
          Μέσα σε μια μέρα ο ουρανός κάνει έναν ολόκληρο γύρο, οπότε οι οίκοι αλλάζουν κάθε
          λίγα λεπτά. Γι’ αυτό χρειάζονται την ακριβή ώρα γέννησης.
        </p>
      </ContentSection>

      <ContentSection title="Οι όψεις">
        <p>
          Οι όψεις είναι οι γωνίες που σχηματίζουν οι πλανήτες μεταξύ τους. Δείχνουν ποια
          κομμάτια του εαυτού σου συνεργάζονται εύκολα και ποια τραβούν το καθένα προς τη δική
          του μεριά. Στον τροχό οι αρμονικές όψεις φαίνονται με μπλε γραμμές και οι εντάσεις
          με κόκκινες.
        </p>
        <dl className="flex flex-col divide-y divide-violet-800 rounded-lg border border-violet-800 bg-surface">
          {Object.values(ASPECTS).map((aspect) => (
            <div key={aspect.name} className="px-4 py-3 sm:flex sm:gap-6">
              <dt className="text-sm font-medium text-violet-50 sm:w-40 shrink-0">
                {aspect.name}{" "}
                <span className="font-normal text-violet-300 tabular-nums">{aspect.angle}°</span>
              </dt>
              <dd className="mt-1 sm:mt-0 text-sm text-violet-200">{capitalize(aspect.meaning)}</dd>
            </div>
          ))}
        </dl>
        <p>
          Οι εντάσεις δεν είναι κακό σημάδι. Δείχνουν πού σε σπρώχνει ο χάρτης να μεγαλώσεις,
          και συχνά εκεί κρύβεται η μεγαλύτερη δύναμή σου.
        </p>
      </ContentSection>

      <ContentSection title="Αν δεν ξέρεις την ώρα γέννησης">
        <p>
          Η ώρα γέννησης αναγράφεται συνήθως στη ληξιαρχική πράξη γέννησης. Γράψε την ώρα όπως
          την έδειχνε το ρολόι τη στιγμή της γέννησης.
        </p>
        <p>
          Αν δεν την ξέρεις, επίλεξε «Δεν ξέρω την ώρα». Οι πλανήτες και τα ζώδιά τους βγαίνουν
          κανονικά, ενώ οι οίκοι και ο ωροσκόπος μένουν έξω. Η Σελήνη αλλάζει ζώδιο κάθε
          δυόμισι μέρες περίπου, οπότε αν άλλαξε τη μέρα που γεννήθηκες, ο χάρτης θα σου το
          πει.
        </p>
      </ContentSection>

      <RelatedLinks title="Δες επίσης" links={RELATED_LINKS} />
    </ContentLayout>
  );
}
