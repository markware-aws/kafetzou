import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Seo } from "@/components/seo";
import {
  ContentLayout,
  ContentSection,
  RelatedLinks,
} from "@/components/content-layout";
import { BirthTimeInput } from "@/components/birth-time-input";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { SignupPromptDialog } from "@/components/signup-prompt-dialog";
import { TimeZoneSelect } from "@/components/time-zone-select";
import { NatalChartWheel } from "@/components/natal-chart-wheel";
import { NatalChartDetails } from "@/components/natal-chart-details";
import { NatalChartTexts } from "@/components/natal-chart-texts";
import {
  BIRTH_PROFILE_SWR_KEY,
  NatalReadingButton,
} from "@/components/natal-reading-button";
import {
  calculateChart,
  getBirthProfile,
  saveBirthProfile,
  type BirthProfile,
  type ChartData,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import { SIGN_BY_ID } from "@/lib/astrology";
import {
  chartFormFromProfile,
  chartInputFromProfile,
  clearChartDraft,
  emptyChartForm,
  formatInput,
  isSameBirthDetails,
  parseChartDraft,
  readFreshChartDraftRaw,
  saveChartDraft,
  type ChartForm,
  type ChartInput,
} from "@/lib/chart-form";
import { ASPECTS, PLANETS, planetGlyph } from "@/lib/planets";
import { useAuthedSWR } from "@/lib/use-authed-swr";
import { SLUG_BY_SIGN_ID, zodiacSignPath } from "@/lib/zodiac";

const PAGE_PATH = "/zodia/astrologikos-xartis/";
const EARLIEST_BIRTH_YEAR = 1900;
const NOT_AUTHENTICATED = "Not authenticated";
const SAVED_NOTICE_MS = 4000;
const SAVE_ERROR_MESSAGE = "Η αποθήκευση απέτυχε. Δοκίμασε ξανά.";
/** Text, the form and the reading box keep the reading width; the chart uses the whole page. */
const READING_WIDTH = "max-w-3xl";

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

interface ChartResult {
  chart: ChartData;
  input: ChartInput;
}

// Nothing else writes the draft while the page is open, so there is nothing to subscribe to.
function subscribeToNothing(): () => void {
  return () => {};
}

// The exported HTML is built without a draft, and the first render in the browser must match it.
function noDraftOnServer(): null {
  return null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("el") + text.slice(1);
}

function saveErrorMessage(caught: unknown): string {
  return caught instanceof Error && caught.message ? caught.message : SAVE_ERROR_MESSAGE;
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
  // Only the fields the user changed; the rest follow the draft or the saved profile.
  const [edited, setEdited] = useState<Partial<ChartForm>>({});
  // undefined: nothing calculated yet, so the saved chart shows. null: cleared by an error.
  const [result, setResult] = useState<ChartResult | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [signupPromptOpen, setSignupPromptOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { mutate } = useSWRConfig();

  // Same SWR key as the site header, so the auth check is shared.
  const { data: user } = useSWR(["home-user"], () => getUser(), {
    revalidateOnFocus: false,
  });
  const isSignedOut = user === null;
  const { data: profile } = useAuthedSWR(
    user ? BIRTH_PROFILE_SWR_KEY : null,
    () => getBirthProfile(),
  );

  // What a visitor typed before leaving to sign up, so they find it here when they come back.
  const draftRaw = useSyncExternalStore(
    subscribeToNothing,
    readFreshChartDraftRaw,
    noDraftOnServer,
  );
  const draft = useMemo(() => parseChartDraft(draftRaw)?.form ?? null, [draftRaw]);

  // Untouched fields follow the draft, else the profile: a profile that loads late still fills them.
  const form: ChartForm = {
    ...(draft ?? chartFormFromProfile(profile) ?? emptyChartForm()),
    ...edited,
  };

  // A signed-out visitor can leave for sign-up from the dialog, the header or the reading box,
  // so every change is kept, not only the one before the dialog opens.
  useEffect(() => {
    if (!isSignedOut || Object.keys(edited).length === 0) return;
    saveChartDraft({ ...(draft ?? emptyChartForm()), ...edited });
  }, [isSignedOut, edited, draft]);

  const profileChart =
    result === undefined && !draft && profile?.chart?.planets ? profile.chart : null;
  const shown: ChartResult | null =
    result ?? (profile && profileChart
      ? { chart: profileChart, input: chartInputFromProfile(profile) }
      : null);
  const isProfileChart = !result && shown !== null;
  const showSaveBox =
    !!result &&
    !!user &&
    !!profile &&
    (saved || !isSameBirthDetails(result.input, profile));

  function updateForm(change: Partial<ChartForm>) {
    // Functional: picking a place sends the label and the place one after the other.
    setEdited((previous) => ({ ...previous, ...change }));
  }

  function fail(message: string) {
    setError(message);
    setResult(null);
  }

  function openSignupPrompt() {
    saveChartDraft(form);
    setSignupPromptOpen(true);
  }

  async function saveChartToProfile(input: ChartInput, existing: BirthProfile | null) {
    const savedProfile = await saveBirthProfile({
      date_of_birth: input.dateOfBirth,
      time_of_birth: input.timeOfBirth,
      birth_place: input.placeLabel,
      birth_time_zone: input.timeZone,
      sex: existing?.sex ?? undefined,
      eye_color: existing?.eye_color ?? undefined,
    });
    await mutate(BIRTH_PROFILE_SWR_KEY, savedProfile, { revalidate: false });
  }

  // An account's first chart becomes its birth profile, which every reading starts from.
  async function saveFirstChart(input: ChartInput) {
    if (profile) return;
    try {
      // The profile may not have loaded yet: ask, so an existing one is never overwritten.
      if (await getBirthProfile()) return;
      await saveChartToProfile(input, null);
      setAutoSaved(true);
    } catch (caught: unknown) {
      setSaveError(saveErrorMessage(caught));
    }
  }

  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    if (!(await getUser())) {
      openSignupPrompt();
      return;
    }
    const [year, month, day] = form.birthDate.split("-").map(Number);
    if (!year || !month || !day || (!form.timeUnknown && !form.birthTime)) {
      fail("Συμπλήρωσε ημερομηνία, ώρα και τόπο γέννησης.");
      return;
    }
    if (!form.place) {
      fail("Διάλεξε τον τόπο γέννησης από τη λίστα.");
      return;
    }
    if (year < EARLIEST_BIRTH_YEAR || form.birthDate > todayIso()) {
      fail(`Δώσε μια ημερομηνία από το ${EARLIEST_BIRTH_YEAR} έως σήμερα.`);
      return;
    }

    const place = form.place;
    const input: ChartInput = {
      dateOfBirth: form.birthDate,
      timeOfBirth: form.timeUnknown ? null : form.birthTime,
      placeLabel: place.label,
      timeZone: form.timeZone,
    };
    // Hold the form as it is: once the draft is cleared it would fall back to the profile.
    setEdited(form);
    clearChartDraft();
    setCalculating(true);
    setError("");
    setSaved(false);
    setAutoSaved(false);
    setSaveError("");
    try {
      const chart = await calculateChart({
        date_of_birth: input.dateOfBirth,
        time_of_birth: input.timeOfBirth,
        latitude: place.latitude,
        longitude: place.longitude,
        time_zone: input.timeZone,
      });
      setResult({ chart, input });
      // Inside the try, so the button stays disabled and a second click can't save twice.
      await saveFirstChart(input);
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "";
      if (message === NOT_AUTHENTICATED) openSignupPrompt();
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
      await saveChartToProfile(result.input, existing);
      setSaved(true);
      setTimeout(() => setSaved(false), SAVED_NOTICE_MS);
    } catch (caught: unknown) {
      setSaveError(saveErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  const chart = shown?.chart;

  return (
    <ContentLayout
      wide
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

      <SignupPromptDialog
        open={signupPromptOpen}
        onClose={() => setSignupPromptOpen(false)}
        returnTo={PAGE_PATH}
        featureText="Ο αστρολογικός χάρτης είναι διαθέσιμος για τα μέλη."
      />

      <div className={READING_WIDTH}>
        <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
          Αστρολογικός χάρτης
        </h1>
        <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">
          Ο αστρολογικός χάρτης δείχνει πού βρισκόταν ο Ήλιος, η Σελήνη και όλοι
          οι πλανήτες τη στιγμή που γεννήθηκες. Δώσε ημερομηνία, ώρα και τόπο
          γέννησης και δες τον δικό σου χάρτη: σε ποιο ζώδιο είναι κάθε πλανήτης,
          σε ποιον οίκο πέφτει και ποιες όψεις σχηματίζει με τους άλλους.
        </p>

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
              value={form.birthDate}
              onChange={(event) => updateForm({ birthDate: event.target.value })}
              className={inputClassName}
            />
          </div>
          <div>
            <label
              htmlFor={form.timeUnknown ? undefined : "chart-time"}
              className={labelClassName}
            >
              Ώρα γέννησης
            </label>
            {form.timeUnknown ? (
              <p className="flex min-h-[42px] items-center gap-2 rounded-md border border-violet-700 bg-bg px-3 py-2 text-sm text-violet-200">
                <AlertCircle className="w-4 h-4 text-violet-300 shrink-0" />
                Χωρίς οίκους και ωροσκόπο
              </p>
            ) : (
              <BirthTimeInput
                id="chart-time"
                value={form.birthTime}
                onChange={(birthTime) => updateForm({ birthTime })}
              />
            )}
            <label className="mt-2 inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.timeUnknown}
                onChange={(event) => updateForm({ timeUnknown: event.target.checked })}
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
              value={form.placeQuery}
              onChange={(placeQuery) => updateForm({ placeQuery, place: null })}
              onSelect={(place) => updateForm({ place })}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="chart-time-zone" className={labelClassName}>
              Ζώνη ώρας γέννησης
            </label>
            <TimeZoneSelect
              id="chart-time-zone"
              value={form.timeZone}
              onChange={(timeZone) => updateForm({ timeZone })}
              describedBy="chart-time-zone-hint"
            />
            <p
              id="chart-time-zone-hint"
              className="mt-1.5 text-xs text-violet-300"
            >
              Αν γεννήθηκες εκτός Ελλάδας, διάλεξε τη χώρα ή την πόλη της
              γέννησης.
            </p>
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
      </div>

      {shown && chart && (
        <section aria-live="polite" className="mt-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-violet-50">Ο χάρτης σου</h2>
          <p className="mt-1 text-sm text-violet-300">
            {formatInput(shown.input)}
            {isProfileChart && " · από το προφίλ σου"}
          </p>
          <div className="mt-5">
            <NatalChartWheel chart={chart} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <SignLink label="Ήλιος" signId={chart.sun_sign} />
            <SignLink label="Σελήνη" signId={chart.moon_sign} />
            {chart.ascendant_sign && (
              <SignLink
                label="Ωροσκόπος"
                signId={chart.ascendant_sign}
                anchor="#oroskopos"
              />
            )}
          </div>
          <div className="mt-6">
            <NatalChartDetails chart={chart} />
          </div>
          <NatalChartTexts chart={chart} className={`mt-8 ${READING_WIDTH}`} />
        </section>
      )}

      <section
        className={`mt-8 ${READING_WIDTH} rounded-lg border border-amber-600/60 bg-surface p-5`}
      >
        <h2 className="text-base font-semibold text-violet-50">
          Η ανάγνωση του χάρτη σου
        </h2>
        <p className="mt-1 text-sm text-violet-200 leading-relaxed">
          Ο υπολογισμός εξηγεί κάθε θέση του χάρτη χωριστά. Διαβάζουμε όλο τον
          χάρτη μαζί και αναλύουμε τον χαρακτήρα σου, τα συναισθήματα, τον
          έρωτα, την καριέρα, τα δυνατά σου σημεία και τον δρόμο σου. Η ανάγνωση
          γίνεται από τον χάρτη που είναι αποθηκευμένος στο προφίλ σου.
        </p>

        {autoSaved && (
          <p
            role="status"
            className="mt-4 flex items-center gap-1.5 text-sm text-violet-100"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            Ο χάρτης αποθηκεύτηκε στο προφίλ σου.
          </p>
        )}

        {showSaveBox && (
          <div className="mt-4 rounded-md border border-violet-700 bg-bg p-3">
            <p className="text-sm text-violet-200 leading-relaxed">
              Είναι αυτός ο δικός σου χάρτης; Αποθήκευσέ τον στο προφίλ για να
              τον διαβάσει η καφετζού.
            </p>
            <p className="mt-1 text-xs text-violet-300">
              Η αποθήκευση αντικαθιστά τα στοιχεία γέννησης που έχει ήδη το
              προφίλ σου.
            </p>
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
                <span
                  role="status"
                  className="flex items-center gap-1.5 text-sm text-violet-100"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  Αποθηκεύτηκε
                </span>
              )}
            </div>
          </div>
        )}

        {saveError && <p className="mt-2 text-sm text-rose-300">{saveError}</p>}

        <div className="mt-4">
          <NatalReadingButton
            returnTo={PAGE_PATH}
            missingProfileText="Υπολόγισε τον χάρτη σου παραπάνω και θα αποθηκευτεί στο προφίλ σου."
          />
        </div>
      </section>

      <div className={READING_WIDTH}>
        <ContentSection title="Τι είναι ο αστρολογικός χάρτης">
          <p>
            Ο αστρολογικός χάρτης, ή γενέθλιος χάρτης, είναι μια φωτογραφία του
            ουρανού τη στιγμή που γεννήθηκες, όπως φαινόταν από τον τόπο της
            γέννησής σου. Δείχνει σε ποιο ζώδιο βρισκόταν ο Ήλιος, η Σελήνη και
            κάθε πλανήτης, ποιο ζώδιο ανέτειλε στον ορίζοντα και πώς μοιράζονται
            οι πλανήτες στους δώδεκα οίκους.
          </p>
          <p>
            Το ζώδιο που ξέρουν όλοι είναι η θέση του Ήλιου, δηλαδή ένα μόνο
            κομμάτι του χάρτη. Γι’ αυτό δύο άνθρωποι του ίδιου ζωδίου μπορεί να
            μοιάζουν τόσο λίγο: η Σελήνη, ο ωροσκόπος και οι πλανήτες τους είναι
            αλλού.
          </p>
          <p>
            Ο τροχός διαβάζεται αριστερόστροφα. Αριστερά, στη θέση των εννιά,
            είναι ο ωροσκόπος (ASC) και ψηλά το μεσουράνημα (MC). Στο εξωτερικό
            δαχτυλίδι είναι τα δώδεκα ζώδια, μέσα του οι πλανήτες με τη μοίρα
            τους, και στο κέντρο οι γραμμές των όψεων.
          </p>
        </ContentSection>

        <ContentSection title="Οι πλανήτες">
          <p>
            Κάθε πλανήτης μιλά για ένα κομμάτι του εαυτού σου. Το ζώδιο όπου
            βρίσκεται δείχνει τον τρόπο που το εκφράζεις και ο οίκος το πεδίο της
            ζωής όπου φαίνεται περισσότερο.
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
                <dd className="mt-1 sm:mt-0 text-sm text-violet-200">
                  {capitalize(planet.theme)}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            Ανάδρομος (℞) λέγεται ο πλανήτης που, όπως τον βλέπουμε από τη Γη,
            μοιάζει να κινείται προς τα πίσω. Η δύναμή του στρέφεται περισσότερο
            προς τα μέσα.
          </p>
        </ContentSection>

        <ContentSection title="Οι δώδεκα οίκοι">
          <p>
            Ο χάρτης χωρίζεται σε δώδεκα οίκους, έναν για κάθε πεδίο της ζωής. Ο
            πρώτος ξεκινά από τον ωροσκόπο και οι υπόλοιποι ακολουθούν
            αριστερόστροφα. Ένας πλανήτης στον πέμπτο οίκο, για παράδειγμα, φέρνει
            τη δύναμή του στον έρωτα και στη δημιουργία.
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
            Μέσα σε μια μέρα ο ουρανός κάνει έναν ολόκληρο γύρο, οπότε οι οίκοι
            αλλάζουν κάθε λίγα λεπτά. Γι’ αυτό χρειάζονται την ακριβή ώρα
            γέννησης.
          </p>
        </ContentSection>

        <ContentSection title="Οι όψεις">
          <p>
            Οι όψεις είναι οι γωνίες που σχηματίζουν οι πλανήτες μεταξύ τους.
            Δείχνουν ποια κομμάτια του εαυτού σου συνεργάζονται εύκολα και ποια
            τραβούν το καθένα προς τη δική του μεριά. Στον τροχό οι αρμονικές
            όψεις φαίνονται με μπλε γραμμές και οι εντάσεις με κόκκινες.
          </p>
          <dl className="flex flex-col divide-y divide-violet-800 rounded-lg border border-violet-800 bg-surface">
            {Object.values(ASPECTS).map((aspect) => (
              <div key={aspect.name} className="px-4 py-3 sm:flex sm:gap-6">
                <dt className="text-sm font-medium text-violet-50 sm:w-40 shrink-0">
                  {aspect.name}{" "}
                  <span className="font-normal text-violet-300 tabular-nums">
                    {aspect.angle}°
                  </span>
                </dt>
                <dd className="mt-1 sm:mt-0 text-sm text-violet-200">
                  {capitalize(aspect.meaning)}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            Οι εντάσεις δεν είναι κακό σημάδι. Δείχνουν πού σε σπρώχνει ο χάρτης
            να μεγαλώσεις, και συχνά εκεί κρύβεται η μεγαλύτερη δύναμή σου.
          </p>
        </ContentSection>

        <ContentSection title="Αν δεν ξέρεις την ώρα γέννησης">
          <p>
            Η ώρα γέννησης αναγράφεται συνήθως στη ληξιαρχική πράξη γέννησης.
            Γράψε την ώρα όπως την έδειχνε το ρολόι τη στιγμή της γέννησης.
          </p>
          <p>
            Αν δεν την ξέρεις, επίλεξε «Δεν ξέρω την ώρα». Οι πλανήτες και τα
            ζώδιά τους βγαίνουν κανονικά, ενώ οι οίκοι και ο ωροσκόπος μένουν έξω.
            Η Σελήνη αλλάζει ζώδιο κάθε δυόμισι μέρες περίπου, οπότε αν άλλαξε τη
            μέρα που γεννήθηκες, ο χάρτης θα σου το πει.
          </p>
        </ContentSection>

        <RelatedLinks title="Δες επίσης" links={RELATED_LINKS} />
      </div>
    </ContentLayout>
  );
}
