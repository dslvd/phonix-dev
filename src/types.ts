// ─────────────────────────────────────────────────────────
// types.ts — All shared TypeScript interfaces and types
// ─────────────────────────────────────────────────────────

export type Language = "hiligaynon" | "tagalog" | "english";

export interface User {
  name: string;
  email: string;
  picture: string | null;
  initials: string;
}

export interface AppState {
  user: User | null;
  lang: Language;
  done: string[];
  xp: number;
  streak: number;
}

export interface Question {
  t: "mc" | "fib";
  img: string;
  p: string;
  a: string;
  c?: string[];
  h: string;
}

export interface AILesson {
  title: string;
  emoji: string;
  description: string;
  questions: Question[];
}

export interface LessonState {
  idx: number;
  qs: Question[];
  qi: number;
  hearts: number;
  correct: number;
  answered: boolean;
}

export interface ScanTranslationResult {
  detected: string;
  translations: {
    hiligaynon: string;
    tagalog: string;
    english: string;
  };
}

export interface VoiceTranslationResult {
  hiligaynon: string;
  tagalog: string;
  english: string;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: Array<{ role: string; content: string | any[] }>;
}

export interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>;
  error?: { message: string };
}
