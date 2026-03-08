"use client";

import { getIdToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
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
