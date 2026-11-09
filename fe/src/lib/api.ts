"use client";

import { getIdToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── User ──────────────────────────────────────────────────────────────────────

export async function getMe(): Promise<any> {
  const res = await fetch(`${API_URL}/auth/me`, { headers: await authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

// ── Profile ───────────────────────────────────────────────────────────────────

export type PlanetId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "north_node";

export type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";

export interface ChartPlanet {
  id: PlanetId;
  /** Ecliptic longitude, 0 to 360. */
  longitude: number;
  sign: string;
  /** Degree inside the sign, 0 to under 30, one decimal. */
  degree: number;
  retrograde: boolean;
  /** Null when the birth time is unknown. */
  house: number | null;
}

export interface ChartPoint {
  longitude: number;
  sign: string;
  degree: number;
}

export interface ChartHouse extends ChartPoint {
  number: number;
}

export interface ChartAspect {
  planet_a: PlanetId;
  planet_b: PlanetId;
  type: AspectType;
  orb: number;
}

/**
 * The first seven keys exist on every stored chart. The rest came with the full chart
 * (version 2), so a chart saved before it may lack them until the backend upgrades it.
 */
export interface ChartData {
  sun_sign: string;
  sun_degree: number;
  moon_sign: string;
  moon_degree: number;
  ascendant_sign: string | null;
  ascendant_degree: number | null;
  time_known: boolean;
  version?: number;
  /** IANA time zone the birth time was read in. */
  time_zone?: string;
  planets?: ChartPlanet[];
  /** Null when the birth time is unknown. */
  ascendant?: ChartPoint | null;
  midheaven?: ChartPoint | null;
  houses?: ChartHouse[] | null;
  house_system?: "placidus" | "whole_sign" | null;
  aspects?: ChartAspect[];
  /** Time unknown and the Moon changed sign that day: [sign at 00:00, sign at 23:59]. */
  moon_day_signs?: [string, string] | null;
}

export interface BirthProfile {
  date_of_birth: string;
  time_of_birth: string | null;
  time_known: boolean;
  birth_place: string;
  birth_lat: number | null;
  birth_lon: number | null;
  chart: ChartData | null;
  sex: string | null;
  eye_color: string | null;
  /** IANA zone the birth time is read in. Optional until every backend sends it. */
  birth_time_zone?: string;
}

export interface BirthProfileRequest {
  date_of_birth: string;
  time_of_birth: string | null;
  birth_place: string;
  sex?: string;
  eye_color?: string;
  /** IANA name; left out, the backend keeps the stored zone. */
  birth_time_zone?: string | null;
}

export async function getBirthProfile(): Promise<BirthProfile | null> {
  const res = await fetch(`${API_URL}/profile/birth`, { headers: await authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch birth profile");
  return res.json();
}

export async function saveBirthProfile(body: BirthProfileRequest): Promise<BirthProfile> {
  const res = await fetch(`${API_URL}/profile/birth`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to save birth profile");
  }
  return res.json();
}

export interface ChartCalculationRequest {
  date_of_birth: string;
  /** "HH:MM" clock time at the birth place, or null when unknown. */
  time_of_birth: string | null;
  latitude: number;
  longitude: number;
  /** IANA zone the birth time is read in. */
  time_zone: string;
}

const CHART_ERROR_MESSAGE = "Δεν μπορέσαμε να υπολογίσουμε τον χάρτη. Δοκίμασε ξανά σε λίγο.";

/** Free chart calculation for the public calculators; needs an account, costs no credits. */
export async function calculateChart(body: ChartCalculationRequest): Promise<ChartData> {
  const headers = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/chart/calculate`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(CHART_ERROR_MESSAGE);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Validation errors carry a list in `detail`; only a string is a message for people.
    throw new Error(typeof err.detail === "string" ? err.detail : CHART_ERROR_MESSAGE);
  }
  return res.json();
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadUrlResponse {
  upload_url: string;
  image_key: string;
  reading_id: string;
}

export async function getUploadUrl(): Promise<UploadUrlResponse> {
  const res = await fetch(`${API_URL}/upload-url`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  return res.json();
}

export async function uploadImageToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "image/jpeg" },
  });
  if (!res.ok) throw new Error("Failed to upload image");
}

// ── Readings ──────────────────────────────────────────────────────────────────

export interface CoffeeReading {
  general_message: string;
  love: string;
  career: string;
  luck: string;
  symbols: string[];
  prediction_summary: string;
}

export interface ReadCoffeeResponse {
  reading_id: string;
  reading: CoffeeReading;
  symbols_detected: string[];
  letters_detected: string[];
}

export async function createReading(
  imageKey: string,
  readingId: string
): Promise<ReadCoffeeResponse> {
  const res = await fetch(`${API_URL}/readings/read-coffee`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ image_key: imageKey, reading_id: readingId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create reading");
  }
  return res.json();
}

export async function getReadings(): Promise<any[]> {
  const res = await fetch(`${API_URL}/readings`, { headers: await authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch readings");
  return res.json();
}

export async function getReading(readingId: string): Promise<any> {
  const res = await fetch(`${API_URL}/readings/${readingId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Reading not found");
  return res.json();
}

// ── Tarot ─────────────────────────────────────────────────────────────────────

export interface TarotReading {
  cards: string[];
  interpretation: string;
  advice: string;
  summary: string;
}

export interface TarotReadingResponse {
  reading_id: string;
  spread: string;
  reading: TarotReading;
}

export async function createTarotReading(
  spread: "one_card" | "three_card"
): Promise<TarotReadingResponse> {
  const res = await fetch(`${API_URL}/tarot/reading`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ spread }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create tarot reading");
  }
  return res.json();
}

export async function getDailyTarotCard(): Promise<any> {
  const res = await fetch(`${API_URL}/tarot/daily-card`, { headers: await authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to get daily card");
  }
  return res.json();
}

export async function getTarotReadings(): Promise<any[]> {
  const res = await fetch(`${API_URL}/tarot/readings`, { headers: await authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch tarot readings");
  return res.json();
}

export async function getTarotReading(readingId: string): Promise<any> {
  const res = await fetch(`${API_URL}/tarot/readings/${readingId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Tarot reading not found");
  return res.json();
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface CreditBundle {
  id: string;
  credits: number;
  price_cents: number;
  price_eur: number;
  label: string;
  description: string;
  popular: boolean;
}

export async function getCreditBundles(): Promise<CreditBundle[]> {
  const res = await fetch(`${API_URL}/payments/bundles`);
  if (!res.ok) throw new Error("Failed to load bundles");
  return res.json();
}

export async function createCheckoutSession(bundleId: string): Promise<{ url: string }> {
  const res = await fetch(`${API_URL}/payments/create-checkout-session`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ bundle_id: bundleId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create checkout session");
  }
  return res.json();
}

export async function requestIrisPayment(bundleId: string): Promise<void> {
  const res = await fetch(`${API_URL}/payments/iris/request`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ bundle_id: bundleId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to send IRIS request");
  }
}

// ── Dreams ────────────────────────────────────────────────────────────────────

export interface DreamReading {
  interpretation: string;
  symbols: string[];
  emotions: string;
  advice: string;
  summary: string;
}

export interface DreamReadingResponse {
  reading_id: string;
  dream_text: string;
  reading: DreamReading;
}

export async function createDreamReading(dreamText: string): Promise<DreamReadingResponse> {
  const res = await fetch(`${API_URL}/dreams/interpret`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ dream_text: dreamText }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to interpret dream");
  }
  return res.json();
}

export async function getDreamReadings(): Promise<any[]> {
  const res = await fetch(`${API_URL}/dreams`, { headers: await authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch dream readings");
  return res.json();
}

export async function getDreamReading(readingId: string): Promise<any> {
  const res = await fetch(`${API_URL}/dreams/${readingId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Dream reading not found");
  return res.json();
}

// ── Astrology ─────────────────────────────────────────────────────────────────

export interface AstrologyReading {
  general: string;
  love: string;
  career: string;
  luck: string;
  summary: string;
  warning: string;
}

export interface HoroscopeResponse {
  sign: string;
  period: string;
  reading: AstrologyReading;
  cached: boolean;
}

export interface PersonalizedAstrologyRequest {
  sign: string;
  sex: string;
  date_of_birth: string;
  eye_color: string;
}

export async function getHoroscope(
  sign: string,
  period: "daily" | "weekly" | "monthly"
): Promise<HoroscopeResponse> {
  // Try static CDN first — zero Lambda cost, ~10ms response from CloudFront edge
  try {
    const static_res = await fetch(`/horoscopes/${period}/${sign}.json`);
    const ct = static_res.headers.get("content-type") ?? "";
    if (static_res.ok && ct.includes("application/json")) return static_res.json();
  } catch {}
  // Fall back to Lambda API (local dev, or before first prewarm runs)
  const res = await fetch(`${API_URL}/astrology/${sign}/${period}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to fetch horoscope");
  }
  return res.json();
}

export async function createPersonalizedAstrologyReading(
  body: PersonalizedAstrologyRequest
): Promise<{ reading_id: string; sign: string; reading: AstrologyReading }> {
  const res = await fetch(`${API_URL}/astrology/personalized`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to generate personalized reading");
  }
  return res.json();
}

export async function prewarmAstrology(
  period: "daily" | "weekly" | "monthly"
): Promise<{ generated: string[]; cached: string[]; errors: any[] }> {
  const res = await fetch(`${API_URL}/astrology/prewarm/${period}`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Prewarm failed");
  }
  return res.json();
}

export async function getPersonalizedAstrologyReading(readingId: string): Promise<any> {
  const res = await fetch(`${API_URL}/astrology/personalized/${readingId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Astrology reading not found");
  return res.json();
}

export async function getPersonalizedAstrologyHistory(): Promise<any[]> {
  const res = await fetch(`${API_URL}/astrology/personalized/history`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch astrology history");
  return res.json();
}

// ── Natal chart reading ───────────────────────────────────────────────────────

export const NATAL_READING_CREDITS = 2;
const NATAL_ERROR_MESSAGE = "Η ανάγνωση του χάρτη απέτυχε. Δοκίμασε ξανά.";

export interface NatalReading {
  summary: string;
  personality: string;
  emotions: string;
  mind: string;
  love: string;
  career: string;
  strengths: string;
  challenges: string;
  life_path: string;
  warning: string;
}

export interface NatalReadingResponse {
  reading_id: string;
  reading: NatalReading;
  chart: ChartData;
}

export interface NatalHistoryItem {
  reading_id: string;
  created_at: string;
  sex: string | null;
  date_of_birth: string;
  /** The chart as it was when it was read. */
  chart: ChartData;
  reading_result: NatalReading;
  tokens_used: number;
}

/** Reads the chart saved in the birth profile; takes no body. */
export async function createNatalReading(): Promise<NatalReadingResponse> {
  const res = await fetch(`${API_URL}/astrology/natal`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (typeof err.detail === "string") throw new Error(err.detail);
    // Callers spot a missing balance by the word "credits", so keep it in the fallback too.
    throw new Error(res.status === 402 ? "Not enough credits" : NATAL_ERROR_MESSAGE);
  }
  return res.json();
}

export async function getNatalReadingHistory(): Promise<NatalHistoryItem[]> {
  const res = await fetch(`${API_URL}/astrology/natal/history`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Δεν φόρτωσαν οι αναγνώσεις του χάρτη.");
  return res.json();
}

export interface CurrentNatalReading {
  /** The reading of the birth details the profile has now; null until there is one. */
  current_reading_id: string | null;
  /** The newest reading of any birth details, so a changed profile can still open it. */
  latest_reading_id: string | null;
}

/** A chart is read once: this says whether the profile's chart already has its reading. */
export async function getCurrentNatalReading(): Promise<CurrentNatalReading> {
  const res = await fetch(`${API_URL}/astrology/natal/current`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Δεν φόρτωσαν οι αναγνώσεις του χάρτη.");
  return res.json();
}

export async function getNatalReading(readingId: string): Promise<NatalHistoryItem> {
  const res = await fetch(`${API_URL}/astrology/natal/${readingId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Δεν βρέθηκε η ανάγνωση του χάρτη.");
  return res.json();
}
