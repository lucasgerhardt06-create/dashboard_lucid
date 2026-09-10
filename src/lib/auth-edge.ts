export const SESSION_COOKIE = "lucid_session";

function toBase64Url(bytes: ArrayBuffer) {
  const chars = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(chars).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function verifyEdgeSession(token?: string) {
  const secret = process.env.DASHBOARD_SECRET;
  if (!token || !secret) return false;
  const [payload, received] = token.split(".");
  if (!payload || !received || !/^\d+$/.test(payload)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  if (expected.length !== received.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  return mismatch === 0 && Number(payload) > Math.floor(Date.now() / 1000);
}
