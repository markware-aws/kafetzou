import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import useSWR from "swr";
import { AlertCircle, Coins, Loader2 } from "lucide-react";
import { InsufficientCreditsDialog } from "@/components/credits-dialog";
import { NATAL_READING_CREDITS, createNatalReading, getBirthProfile } from "@/lib/api";
import { getIdToken } from "@/lib/auth";
import { useAuthedSWR } from "@/lib/use-authed-swr";
import { notifyCreditsChanged } from "@/lib/user";

/** Shared with /profile and the chart page, so a profile saved there shows up here at once. */
export const BIRTH_PROFILE_SWR_KEY = ["birth-profile"];

const secondaryLinkClassName =
  "rounded-md border border-violet-700 hover:border-violet-600 hover:bg-violet-900/50 text-violet-100 text-sm text-center px-4 py-2 transition-colors";
const primaryLinkClassName =
  "rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium text-center px-4 py-2 transition-colors";

/** "1990-11-12" -> "12/11/1990". */
function formatBirthDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

function isCreditsError(message: string): boolean {
  return message.includes("credits") || message.includes("402");
}

interface NatalReadingButtonProps {
  /** Where sign-in brings the visitor back to, e.g. "/astrology/#xartis". */
  returnTo: string;
}

/**
 * Starts the paid AI reading of the chart saved in the birth profile. Handles every state on
 * the way: signed out, no profile yet, birth time unknown, too few credits.
 */
export function NatalReadingButton({ returnTo }: NatalReadingButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  const { data: token } = useSWR(["natal-auth-token"], () => getIdToken(), {
    revalidateOnFocus: false,
  });
  // Only ask for the profile once there is a token: signed-out visitors make no API call.
  const { data: profile, error: profileError } = useAuthedSWR(
    token ? BIRTH_PROFILE_SWR_KEY : null,
    () => getBirthProfile(),
  );

  async function startReading() {
    setLoading(true);
    setError("");
    try {
      const response = await createNatalReading();
      notifyCreditsChanged();
      router.push(`/natal-reading/?id=${encodeURIComponent(response.reading_id)}`);
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "Κάτι πήγε στραβά";
      if (isCreditsError(message)) setCreditDialogOpen(true);
      else setError(message);
      setLoading(false);
    }
  }

  if (token === undefined || (token && profile === undefined && !profileError)) {
    return <div className="h-10 w-full max-w-xs rounded-md shimmer" aria-hidden />;
  }

  if (!token) {
    const encodedReturnTo = encodeURIComponent(returnTo);
    return (
      <div>
        <p className="text-sm text-violet-200 leading-relaxed">
          Συνδέσου για να διαβάσει η καφετζού τον χάρτη σου. Η εγγραφή είναι δωρεάν και παίρνεις
          5 δωρεάν credits.
        </p>
        <div className="mt-3 flex flex-col-reverse sm:flex-row gap-2">
          <Link href={`/login?returnTo=${encodedReturnTo}`} className={secondaryLinkClassName}>
            Σύνδεση
          </Link>
          <Link
            href={`/login?mode=register&returnTo=${encodedReturnTo}`}
            className={primaryLinkClassName}
          >
            Εγγραφή
          </Link>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <p className="text-sm text-rose-200">
        Δεν φόρτωσε το προφίλ σου. Ανανέωσε τη σελίδα και δοκίμασε ξανά.
      </p>
    );
  }

  if (!profile?.chart) {
    return (
      <div>
        <p className="text-sm text-violet-200 leading-relaxed">
          Για την ανάγνωση χρειάζονται τα στοιχεία γέννησής σου στο προφίλ.
        </p>
        <Link href="/profile" className={`mt-3 inline-block ${secondaryLinkClassName}`}>
          Συμπλήρωσε το προφίλ
        </Link>
      </div>
    );
  }

  const birthDetails = [
    formatBirthDate(profile.date_of_birth),
    profile.time_known ? profile.time_of_birth : null,
    profile.birth_place,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        requiredCredits={NATAL_READING_CREDITS}
        featureName="την ανάγνωση του χάρτη"
      />
      <p className="text-xs text-violet-300">
        Από τον χάρτη του προφίλ σου: <span className="text-violet-100">{birthDetails}</span>
      </p>
      {!profile.time_known && (
        <p className="mt-2 flex items-start gap-2 text-xs text-violet-300 leading-relaxed">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Χωρίς ώρα γέννησης η ανάγνωση αφήνει έξω τους οίκους και τον ωροσκόπο.
        </p>
      )}
      {error && (
        <div className="mt-3 rounded-md border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={startReading}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Οι αστέρες μιλούν…
            </>
          ) : (
            "Διάβασε τον χάρτη μου"
          )}
        </button>
        {loading ? (
          <span className="text-xs text-violet-300">Παίρνει λίγη ώρα, μην κλείσεις τη σελίδα.</span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-violet-300">
            <Coins className="w-3.5 h-3.5" />
            {NATAL_READING_CREDITS} credits
          </span>
        )}
      </div>
    </div>
  );
}
