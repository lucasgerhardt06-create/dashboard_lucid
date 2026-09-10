import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "lucid_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.DASHBOARD_SECRET;
  if (!value) throw new Error("DASHBOARD_SECRET est absent.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken() {
  const payload = String(Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS);
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token?: string | null) {
  if (!token) return false;
  const [payload, received] = token.split(".");
  if (!payload || !received || !/^\d+$/.test(payload)) return false;
  const expected = signature(payload);
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return false;
  return Number(payload) > Math.floor(Date.now() / 1000);
}

export async function requireDashboardSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) throw new Error("Session du tableau de bord invalide.");
}

export function passwordMatches(input: string) {
  const configured = process.env.DASHBOARD_PASSWORD;
  if (!configured) throw new Error("DASHBOARD_PASSWORD est absent.");
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(configured).digest();
  return timingSafeEqual(left, right);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_DURATION_SECONDS,
  path: "/",
};
