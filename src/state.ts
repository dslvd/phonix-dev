// ─────────────────────────────────────────────────────────
// state.ts — Singleton app state with localStorage persistence
// ─────────────────────────────────────────────────────────

import type { Language, User, AppState, LessonState } from './types';

const KEYS = {
  USER: "lg_u",
  LANG: "lg_l",
  DONE: "lg_d",
  XP: "lg_x",
  STREAK: "lg_s",
  CLIENT_ID: "lg_cid",
};

const VALID_LANGS: Language[] = ["hiligaynon", "tagalog", "english"];

function loadState(): AppState {
  const rawUser = localStorage.getItem(KEYS.USER);
  const user: User | null = rawUser ? JSON.parse(rawUser) : null;
  
  const rawDone = localStorage.getItem(KEYS.DONE);
  const done: string[] = rawDone ? JSON.parse(rawDone) : [];
  
  const rawLang = localStorage.getItem(KEYS.LANG) ?? "hiligaynon";
  const lang: Language = VALID_LANGS.includes(rawLang as Language)
    ? (rawLang as Language)
    : "hiligaynon";
  
  return {
    user,
    lang,
    done,
    xp: Number(localStorage.getItem(KEYS.XP) ?? 0),
    streak: Number(localStorage.getItem(KEYS.STREAK) ?? 1),
  };
}

// ── Singleton ──────────────────────────────────────────────
export const S: AppState = loadState();

export const LS: LessonState = {
  idx: 0,
  qs: [],
  qi: 0,
  hearts: 3,
  correct: 0,
  answered: false,
};

// ── Persistence helpers ────────────────────────────────────
export function saveState(): void {
  localStorage.setItem(KEYS.USER, JSON.stringify(S.user));
  localStorage.setItem(KEYS.LANG, S.lang);
  localStorage.setItem(KEYS.DONE, JSON.stringify(S.done));
  localStorage.setItem(KEYS.XP, String(S.xp));
  localStorage.setItem(KEYS.STREAK, String(S.streak));
}

export function getClientId(): string | null {
  // Try environment variable first (Vercel deployment)
  const envKey = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (envKey) {
    return envKey;
  }
  // Fall back to localStorage
  return localStorage.getItem(KEYS.CLIENT_ID);
}

export function setClientId(id: string): void {
  localStorage.setItem(KEYS.CLIENT_ID, id);
}

export function clearUser(): void {
  localStorage.removeItem(KEYS.USER);
}

export function resetLesson(patch?: Partial<LessonState>): void {
  Object.assign(LS, {
    idx: 0,
    qs: [],
    qi: 0,
    hearts: 3,
    correct: 0,
    answered: false,
  }, patch);
}
