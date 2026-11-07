import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CONSENT_CHANGED_EVENT,
  OPEN_COOKIE_SETTINGS_EVENT,
  applyConsent,
  readConsent,
  saveConsent,
  type ConsentStatus,
} from "@/lib/consent";

// Both buttons look the same: Greek and EU regulators require rejecting to be as easy as
// accepting, and a dimmer "reject" button counts against that.
const CHOICE_BUTTON_CLASS =
  "flex-1 sm:flex-none rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-5 py-2 transition-colors";

function subscribeToConsent(onChange: () => void): () => void {
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
}

function hasConsentChoice(): boolean {
  return readConsent() !== null;
}

// The exported HTML is the same for every visitor, so it never shows the banner; it appears
// after hydration only for visitors without a saved choice.
function hasConsentChoiceOnServer(): boolean {
  return true;
}

export function CookieBanner() {
  const hasChoice = useSyncExternalStore(
    subscribeToConsent,
    hasConsentChoice,
    hasConsentChoiceOnServer,
  );
  const [isReopened, setIsReopened] = useState(false);

  useEffect(() => {
    const consent = readConsent();
    if (consent) applyConsent(consent);

    const reopen = () => setIsReopened(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  function choose(status: ConsentStatus) {
    saveConsent(status);
    setIsReopened(false);
    applyConsent(status);
  }

  if (hasChoice && !isReopened) return null;

  return (
    <section
      aria-label="Ρυθμίσεις cookies"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 animate-fade-in"
    >
      <div className="max-w-3xl mx-auto rounded-lg border border-violet-700 bg-surface shadow-xl shadow-black/40 p-4 sm:flex sm:items-center sm:gap-6">
        <p className="text-sm text-violet-100 leading-relaxed">
          Θέλουμε να χρησιμοποιούμε cookies του Google Analytics για να μετράμε την
          επισκεψιμότητα και να βελτιώνουμε τη σελίδα. Χωρίς τη συγκατάθεσή σου δεν
          φορτώνεται τίποτα από την Google.{" "}
          <Link
            href="/privacy/#cookies"
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
          >
            Περισσότερα
          </Link>
        </p>
        <div className="mt-3 sm:mt-0 flex gap-2 shrink-0">
          <button type="button" onClick={() => choose("denied")} className={CHOICE_BUTTON_CLASS}>
            Απόρριψη
          </button>
          <button type="button" onClick={() => choose("granted")} className={CHOICE_BUTTON_CLASS}>
            Αποδοχή
          </button>
        </div>
      </div>
    </section>
  );
}
