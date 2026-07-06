import { createClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SEC = 60 * 60; // 1 hour

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isStoragePath(value: string): boolean {
  return value.startsWith("avatars/") && !value.startsWith("http");
}

/** Resolve a stored Storage path to a signed URL; pass through http(s) URLs unchanged. */
export async function resolvePhotoUrl(
  photoUrl: string | null | undefined,
): Promise<string> {
  if (!photoUrl) return "";
  if (!isStoragePath(photoUrl)) return photoUrl;

  const client = adminClient();
  if (!client) return photoUrl;

  const { data, error } = await client.storage
    .from("avatars")
    .createSignedUrl(photoUrl.replace(/^avatars\//, ""), SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) return photoUrl;
  return data.signedUrl;
}

export async function resolvePhotoUrls<T extends { photoURL: string }>(
  rows: T[],
): Promise<T[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      photoURL: await resolvePhotoUrl(row.photoURL),
    })),
  );
}
