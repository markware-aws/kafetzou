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

export interface ChartData {
  sun_sign: string;
  sun_degree: number;
  moon_sign: string;
  moon_degree: number;
  ascendant_sign: string | null;
  ascendant_degree: number | null;
  time_known: boolean;
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
}

export interface BirthProfileRequest {
  date_of_birth: string;
  time_of_birth: string | null;
  birth_place: string;
  sex?: string;
  eye_color?: string;
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
    if (static_res.ok) return static_res.json();
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
