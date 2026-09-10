"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, passwordMatches, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) return { error: "Mot de passe incorrect." };
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  redirect("/dashboard");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
