"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/session";

export async function signInAsCaregiver() {
  await startSession("caregiver");
  redirect("/caregiver");
}

export async function signInAsParent() {
  await startSession("parent");
  redirect("/parent");
}

export async function signOut() {
  await endSession();
  redirect("/login");
}
