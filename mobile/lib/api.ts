import Constants from 'expo-constants';
import { getIdToken } from './auth';

const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://localhost:8000';

async function authHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadUrlResponse {
  upload_url: string;
  image_key: string;
  reading_id: string;
}

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
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function getUploadUrl(): Promise<UploadUrlResponse> {
  const res = await fetch(`${API_URL}/upload-url`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to get upload URL');
  return res.json();
}

export async function uploadImageToS3(uploadUrl: string, imageUri: string): Promise<void> {
  // In React Native we fetch the local file URI and send its blob to S3
  const fileRes = await fetch(imageUri);
  const blob = await fileRes.blob();

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': 'image/jpeg' },
  });
  if (!res.ok) throw new Error('Failed to upload image to S3');
}

// ── Readings ──────────────────────────────────────────────────────────────────

export async function createReading(
  imageKey: string,
  readingId: string
): Promise<ReadCoffeeResponse> {
  const res = await fetch(`${API_URL}/readings/read-coffee`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ image_key: imageKey, reading_id: readingId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail ?? 'Failed to create reading');
  }
  return res.json();
}

export async function getReadings(): Promise<any[]> {
  const res = await fetch(`${API_URL}/readings`, { headers: await authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch readings');
  return res.json();
}

export async function getReading(readingId: string): Promise<any> {
  const res = await fetch(`${API_URL}/readings/${readingId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Reading not found');
  return res.json();
}
