// ─────────────────────────────────────────────────────────
// auth.ts — Google Sign-In and guest auth
// ─────────────────────────────────────────────────────────

import type { User } from './types';
import { S, saveState, clearUser, getClientId, setClientId } from './state';
import { showScreen, toast, byId } from './dom';

declare global {
  interface Window {
    google?: any;
  }
}

let _onLogin: () => void = () => {};

export function onLoginCallback(cb: () => void): void {
  _onLogin = cb;
}

// ── JWT decode ────────────────────────────────────────────
function decodeJWT(credential: string): any {
  const part = credential.split(".")[1];
  if (!part) throw new Error("Invalid JWT");
  return JSON.parse(atob(part));
}

// ── Google callback (called by SDK) ──────────────────────
export function onGoogleToken(r: any): void {
  try {
    const p = decodeJWT(r.credential);
    const parts = p.name.split(" ");
    const initials = parts
      .map((w: string) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const user: User = {
      name: p.name,
      email: p.email,
      picture: p.picture,
      initials,
    };

    S.user = user;
    saveState();
    _onLogin();
  } catch {
    toast("Sign-in error — please try again.");
  }
}

// ── Guest login ───────────────────────────────────────────
export function guestLogin(): void {
  S.user = { name: "Guest", email: "", initials: "G", picture: null };
  saveState();
  _onLogin();
}

// ── Sign out ──────────────────────────────────────────────
export function signOut(): void {
  clearUser();
  S.user = null;
  window.google?.accounts.id.disableAutoSelect();
  showScreen("landing");
  initGoogleAuth();
}

// ── Client ID modal ───────────────────────────────────────
export function openCidModal(): void {
  byId<HTMLInputElement>("cidIn").value = getClientId() ?? "";
  byId("setupModal").style.display = "flex";
}

export function closeCidModal(): void {
  byId("setupModal").style.display = "none";
}

export function saveCidModal(): void {
  const v = byId<HTMLInputElement>("cidIn").value.trim();
  if (!v) {
    toast("Paste your Client ID first");
    return;
  }
  setClientId(v);
  closeCidModal();
  toast("✅ Saved — reloading…");
  setTimeout(() => location.reload(), 1200);
}

// ── Init Google SDK ───────────────────────────────────────
export function initGoogleAuth(): void {
  const cid = getClientId();
  if (cid && window.google?.accounts) {
    byId("manualGBtn").style.display = "none";
    window.google.accounts.id.initialize({
      client_id: cid,
      callback: onGoogleToken,
    });
    window.google.accounts.id.renderButton(byId("gBtnWrap"), {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 368,
    });
  } else {
    byId("gBtnWrap").style.display = "none";
    byId("manualGBtn").style.display = "flex";
  }
}
