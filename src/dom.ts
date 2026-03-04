// ─────────────────────────────────────────────────────────
// dom.ts — Typed DOM utilities
// ─────────────────────────────────────────────────────────

/** Typed getElementById — throws if not found */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
}

/** Show one screen, hide all others */
export function showScreen(id: string): void {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  byId(id).classList.add("active");
}

/** Toast notification */
export function toast(msg: string, ms: number = 2800): void {
  const el = byId("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), ms);
}

/** Fisher-Yates shuffle (returns new array) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Random praise string */
export function praise(): string {
  const p = [
    "Excellent!", "Amazing!", "Brilliant!", "You got it!",
    "Galing mo!", "Maayo gid!", "Sipag!", "Magaling!", "Tama!",
  ];
  return p[Math.floor(Math.random() * p.length)] ?? "Great!";
}

/** Escape single quotes for inline onclick attribute values */
export function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Confetti burst */
export function confetti(): void {
  const cols = ["#FF9A3C", "#3DC8E8", "#FFF176", "#4CC867", "#FF6B6B", "#A78BFA"];
  for (let i = 0; i < 55; i++) {
    setTimeout(() => {
      const el = document.createElement("div");
      el.className = "cf";
      el.style.cssText = [
        `left:${Math.random() * 100}vw`,
        "top:-20px",
        `background:${cols[i % cols.length]}`,
        `width:${6 + Math.random() * 9}px`,
        `height:${6 + Math.random() * 9}px`,
        `border-radius:${Math.random() > 0.5 ? "50%" : "2px"}`,
        `animation-duration:${1.5 + Math.random() * 2}s`,
        `animation-delay:${Math.random() * 0.5}s`,
      ].join(";");
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3400);
    }, i * 33);
  }
}
