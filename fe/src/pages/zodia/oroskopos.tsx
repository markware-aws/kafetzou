import { useState } from "react";
import type { GetStaticProps } from "next";
import Link from "next/link";
import useSWR from "swr";
import { Seo } from "@/components/seo";
import { ContentLayout, ContentSection, FeatureCta } from "@/components/content-layout";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { SignupPromptDialog } from "@/components/signup-prompt-dialog";
import { getUser } from "@/lib/auth";
import {
  ascendantLongitude,
  longitudeToSign,
  sunLongitude,
  zonedTimeToUtc,
} from "@/lib/birth-chart";
import type { PlaceOption } from "@/lib/place-search";
import { zodiacSignPath } from "@/lib/zodiac";
import { getZodiacSigns } from "@/lib/content-data";

const EARLIEST_BIRTH_YEAR = 1900;
/** Birth times are read as Greek clock time, whatever place is picked. */
const BIRTH_TIME_ZONE = "Europe/Athens";

interface SignInfo {
  slug: string;
  name: string;
  symbol: string;
  ascendant: string;
}

interface CalculatorProps {
  /** Zodiac order, so index = sign index from longitudeToSign. */
  signs: SignInfo[];
}

interface ChartResult {
  ascendantIndex: number;
  ascendantDegree: number;
  sunIndex: number;
}

export const getStaticProps: GetStaticProps<CalculatorProps> = async () => ({
  props: {
    signs: getZodiacSigns().map(({ slug, name, symbol, ascendant }) => ({
      slug,
      name,
      symbol,
      ascendant,
    })),
  },
});

const labelClassName = "block mb-1 text-xs text-violet-300";
const inputClassName =
  "w-full rounded-md border border-violet-700 bg-bg px-3 py-2 text-base text-violet-50 focus:outline-none focus:border-amber-500 [color-scheme:dark]";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AscendantCalculator({ signs }: CalculatorProps) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [place, setPlace] = useState<PlaceOption | null>(null);
  const [result, setResult] = useState<ChartResult | null>(null);
  const [error, setError] = useState("");
  const [signupPromptOpen, setSignupPromptOpen] = useState(false);
  // Same SWR key as the site header, so the auth check is shared.
  const { data: user } = useSWR(["home-user"], () => getUser(), {
    revalidateOnFocus: false,
  });
  const isSignedOut = user === null;

  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    // The calculator is for members. It runs in the browser, so this is a prompt, not a lock.
    if (!(await getUser())) {
      setSignupPromptOpen(true);
      return;
    }
    const [year, month, day] = birthDate.split("-").map(Number);
    const [hour, minute] = birthTime.split(":").map(Number);
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
      setError("Συμπλήρωσε ημερομηνία, ώρα και τόπο γέννησης.");
      setResult(null);
      return;
    }
    if (!place) {
      setError("Διάλεξε τον τόπο γέννησης από τη λίστα.");
      setResult(null);
      return;
    }
    if (year < EARLIEST_BIRTH_YEAR || birthDate > todayIso()) {
      setError(`Δώσε μια ημερομηνία από το ${EARLIEST_BIRTH_YEAR} έως σήμερα.`);
      setResult(null);
      return;
    }
    const utc = zonedTimeToUtc(year, month, day, hour, minute, BIRTH_TIME_ZONE);
    const ascendant = longitudeToSign(ascendantLongitude(utc, place.latitude, place.longitude));
    setError("");
    setResult({
      ascendantIndex: ascendant.signIndex,
      ascendantDegree: Math.floor(ascendant.degree),
      sunIndex: longitudeToSign(sunLongitude(utc)).signIndex,
    });
  }

  const ascendantSign = result ? signs[result.ascendantIndex] : null;
  const sunSign = result ? signs[result.sunIndex] : null;

  return (
    <ContentLayout
      breadcrumbs={[
        { label: "Ζώδια", path: "/zodia/" },
        { label: "Υπολογισμός ωροσκόπου", path: "/zodia/oroskopos/" },
      ]}
    >
      <Seo
        title="Υπολογισμός Ωροσκόπου: Βρες τον Ωροσκόπο σου"
        description="Υπολόγισε δωρεάν τον ωροσκόπο (ανιόντα) σου από την ημερομηνία, την ώρα και τον τόπο γέννησης, και δες τι λέει για την πρώτη εντύπωση που αφήνεις."
        path="/zodia/oroskopos/"
      />

      <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
        Υπολογισμός ωροσκόπου
      </h1>
      <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">
        Ο ωροσκόπος, ή ανιών, είναι το ζώδιο που ανέτειλε στον ανατολικό ορίζοντα τη στιγμή που
        γεννήθηκες. Δείχνει πώς σε βλέπουν οι άλλοι με την πρώτη ματιά, ενώ το ζώδιό σου (ο
        Ήλιος) μιλά για το ποιος είσαι κατά βάθος. Για να τον βρεις χρειάζεσαι την ακριβή ώρα
        γέννησης.
      </p>

      <SignupPromptDialog open={signupPromptOpen} onClose={() => setSignupPromptOpen(false)} />

      <form
        onSubmit={calculate}
        className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-violet-800 bg-surface p-4"
      >
        <div>
          <label htmlFor="ascendant-date" className={labelClassName}>
            Ημερομηνία γέννησης
          </label>
          <input
            id="ascendant-date"
            type="date"
            required
            min={`${EARLIEST_BIRTH_YEAR}-01-01`}
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="ascendant-time" className={labelClassName}>
            Ώρα γέννησης
          </label>
          <input
            id="ascendant-time"
            type="time"
            required
            value={birthTime}
            onChange={(event) => setBirthTime(event.target.value)}
            className={inputClassName}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ascendant-place" className={labelClassName}>
            Τόπος γέννησης
          </label>
          <PlaceAutocomplete
            id="ascendant-place"
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
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md px-5 py-2 text-sm transition-colors"
          >
            Υπολόγισε
          </button>
          {isSignedOut && (
            <p className="text-xs text-violet-300 text-center sm:text-left">
              Χρειάζεται δωρεάν λογαριασμό.
            </p>
          )}
        </div>
      </form>

      {ascendantSign && sunSign && result && (
        <section aria-live="polite" className="mt-6 rounded-lg border border-amber-600 bg-surface p-5 animate-fade-in">
          <p className="text-xs uppercase tracking-wide text-violet-300">Ο ωροσκόπος σου</p>
          <p className="mt-1 text-2xl font-semibold text-violet-50">
            <span aria-hidden>{ascendantSign.symbol} </span>
            {ascendantSign.name}{" "}
            <span className="text-base font-normal text-violet-300">{result.ascendantDegree}°</span>
          </p>
          <p className="mt-1 text-sm text-violet-300">
            Ζώδιο (Ήλιος): {sunSign.symbol} {sunSign.name}
          </p>
          <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">{ascendantSign.ascendant}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href={zodiacSignPath(ascendantSign.slug)} className="text-amber-400 hover:text-amber-300">
              Το ζώδιο {ascendantSign.name}
            </Link>
            {sunSign.slug !== ascendantSign.slug && (
              <Link href={zodiacSignPath(sunSign.slug)} className="text-amber-400 hover:text-amber-300">
                Το ζώδιό σου: {sunSign.name}
              </Link>
            )}
          </div>
        </section>
      )}

      <ContentSection title="Γιατί μετράει η ώρα">
        <p>
          Μέσα σε ένα εικοσιτετράωρο ανατέλλουν και τα δώδεκα ζώδια, οπότε ο ωροσκόπος αλλάζει
          κατά μέσο όρο κάθε δύο ώρες. Αν γεννήθηκες κοντά στην αλλαγή, ακόμα και δέκα λεπτά
          διαφορά μπορεί να δώσουν άλλο ζώδιο. Η ώρα γέννησης αναγράφεται συνήθως στη
          ληξιαρχική πράξη γέννησης. Αν δεν την ξέρεις με σιγουριά, δοκίμασε την πιο πιθανή ώρα
          και μια ώρα πριν και μετά.
        </p>
        <p>
          Η καλοκαιρινή ώρα των παλαιότερων ετών υπολογίζεται αυτόματα. Γράψε την ώρα όπως την
          έδειχνε το ρολόι τη στιγμή της γέννησης.
        </p>
      </ContentSection>

      <ContentSection title="Ωροσκόπος και ζώδιο">
        <p>
          Το ζώδιο του Ήλιου είναι ο πυρήνας σου: τι σε κινεί και τι χρειάζεσαι. Ο ωροσκόπος
          είναι η βιτρίνα: το ύφος σου, ο τρόπος που μπαίνεις σε ένα δωμάτιο και η εντύπωση που
          αφήνεις πριν σε γνωρίσουν. Γι’ αυτό δύο άνθρωποι του ίδιου ζωδίου μπορεί να μοιάζουν
          τόσο διαφορετικοί.
        </p>
        {/* "Ωροσκόπος" sits on its own line so every card has the same two-line height. */}
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {signs.map((sign) => (
            <li key={sign.slug}>
              <Link
                href={`${zodiacSignPath(sign.slug)}#oroskopos`}
                className="flex h-full flex-col rounded-md border border-violet-800 bg-surface px-3 py-2 text-violet-200 hover:border-violet-600 hover:text-violet-50 transition-colors"
              >
                <span className="text-xs text-violet-300">Ωροσκόπος</span>{" "}
                <span className="text-sm">
                  <span aria-hidden>{sign.symbol} </span>
                  {sign.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </ContentSection>

      <FeatureCta feature="astrology" />
    </ContentLayout>
  );
}
