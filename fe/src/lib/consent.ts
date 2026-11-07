/**
 * Cookie consent for Google Analytics, which runs through Google Tag Manager.
 * GTM is loaded only after the visitor accepts, so nothing reaches Google before that.
 * The cookie list shown to visitors lives in the Cookies section of pages/privacy.tsx.
 */

const GTM_ID = "GTM-WNPN58GZ";
const GTM_SCRIPT_ID = "google-tag-manager";
const CONSENT_STORAGE_KEY = "cookie-consent";

/** Bump when the GTM container gets a new kind of tag, so every visitor is asked again. */
export const CONSENT_VERSION = 1;

/** Dispatched on window to reopen the cookie banner (footer and privacy page links). */
export const OPEN_COOKIE_SETTINGS_EVENT = "open-cookie-settings";

/** Dispatched on window after saveConsent, so the banner re-reads the choice. */
export const CONSENT_CHANGED_EVENT = "cookie-consent-changed";

export type ConsentStatus = "granted" | "denied";

// The choice made on this page, which still counts when localStorage is blocked.
let pageChoice: ConsentStatus | null = null;

interface StoredConsent {
  status: ConsentStatus;
  version: number;
  decidedAt: string;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** The saved choice, or null when there is none for the current CONSENT_VERSION. */
export function parseStoredConsent(raw: string | null): ConsentStatus | null {
  if (!raw) return null;
  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof stored !== "object" || stored === null) return null;
  const { status, version } = stored as Partial<StoredConsent>;
  if (version !== CONSENT_VERSION) return null;
  return status === "granted" || status === "denied" ? status : null;
}

export function readConsent(): ConsentStatus | null {
  try {
    return parseStoredConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY)) ?? pageChoice;
  } catch {
    // Storage is blocked (private mode, site data disabled): the banner asks on every visit.
    return pageChoice;
  }
}

export function saveConsent(status: ConsentStatus): void {
  pageChoice = status;
  const stored: StoredConsent = {
    status,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage is blocked: pageChoice keeps the choice until the page is closed.
  }
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}

/** Starts Google Analytics on "granted"; on "denied", stops it if it is already running. */
export function applyConsent(status: ConsentStatus): void {
  if (status === "granted") {
    loadGoogleTagManager();
    return;
  }
  if (!document.getElementById(GTM_SCRIPT_ID)) return;
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  deleteGoogleAnalyticsCookies();
  // A loaded GTM container cannot be removed; reloading starts the page without it.
  window.location.reload();
}

/** Google's GTM snippet for this site, plus consent defaults set before the container runs. */
function loadGoogleTagManager(): void {
  if (document.getElementById(GTM_SCRIPT_ID)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // Google's tag treats only Arguments objects as commands; a pushed array is ignored.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  // The visitor agreed to analytics only, so advertising stays off.
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());

  const script = document.createElement("script");
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}

export function isGoogleAnalyticsCookie(name: string): boolean {
  return name === "_ga" || name.startsWith("_ga_");
}

/**
 * The host and each parent domain below the TLD. GA4 sets its cookies on the highest one
 * (.fortuneteller.gr), and a cookie is deleted only with the domain it was set on.
 */
export function cookieDomainsFor(hostname: string): string[] {
  const labels = hostname.split(".");
  const domains: string[] = [];
  for (let i = 0; i < labels.length - 1; i++) {
    domains.push(labels.slice(i).join("."));
  }
  return domains;
}

function deleteGoogleAnalyticsCookies(): void {
  const expired = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  const names = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0].trim())
    .filter(isGoogleAnalyticsCookie);
  for (const name of names) {
    document.cookie = `${name}=; ${expired}`;
    for (const domain of cookieDomainsFor(window.location.hostname)) {
      document.cookie = `${name}=; ${expired}; domain=${domain}`;
    }
  }
}
