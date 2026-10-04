// Replay controls, clock pill and the day card.
import { dayParts } from "../data/trip";
import { glyphSvg } from "../map/icons";
import type { PhaseWeights } from "../map/sun";
import type { ReplayState, Segment } from "../replay/timeline";

const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
export function formatClock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function setClock(date: Date, weights: PhaseWeights, timeZone: string): void {
  const icon = weights.day > 0.5 ? "sun" : weights.dusk > 0.4 ? "contrast" : "moon";
  $("#clock .ico use").setAttribute("href", `#i-${icon}`);
  $("#clock .txt").textContent = formatClock(date, timeZone);
}

const DAY_CARD_MS = 1900;
let cardTimer = 0;
export function showDayCard(day: string, place: string): void {
  const card = $("#daycard");
  const { weekday, date, month } = dayParts(day);
  $("#daycard .d").textContent = `${date} ${month}`;
  $("#daycard .w").textContent = weekday;
  $("#daycard .c").textContent = place;
  card.classList.add("show");
  clearTimeout(cardTimer);
  cardTimer = window.setTimeout(() => card.classList.remove("show"), DAY_CARD_MS);
}

const PLAY_ICON = '<svg class="mm-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE_ICON = '<svg class="mm-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
const SPEEDS = [1, 2, 4];

export interface Playbar {
  show(on: boolean): void;
  update(state: ReplayState, info: { playing: boolean }): void;
}

export function mountPlaybar({ total, segs, timeZone, onToggle, onSeek, onStep, onSpeed, onClose }: {
  total: number;
  timeZone: string;
  segs: Segment[];
  onToggle: () => void;
  onSeek: (t: number) => void;
  onStep: (direction: 1 | -1) => void;
  onSpeed: (speed: number) => void;
  onClose: () => void;
}): Playbar {
  const bar = $("#playbar");
  const range = $<HTMLInputElement>("#scrub");
  range.max = String(total);
  $("#ticks").replaceChildren(...segs.filter((s) => s.kind === "jump" && s.newDay && s.start > 0).map((s) => {
    const tick = document.createElement("span");
    tick.style.left = `${(s.start / total) * 100}%`;
    return tick;
  }));
  $("#pb-play").addEventListener("click", onToggle);
  $("#pb-prev").addEventListener("click", () => onStep(-1));
  $("#pb-next").addEventListener("click", () => onStep(1));
  $("#pb-close").addEventListener("click", onClose);
  $("#pb-speed").addEventListener("click", (e) => {
    const button = e.currentTarget as HTMLButtonElement;
    const next = SPEEDS[(SPEEDS.indexOf(Number(button.dataset.v ?? 1)) + 1) % SPEEDS.length];
    button.dataset.v = String(next);
    button.textContent = `${next}×`;
    onSpeed(next);
  });
  range.addEventListener("input", () => onSeek(Number(range.value)));

  return {
    show(on) {
      bar.hidden = !on;
      document.body.classList.toggle("playing-mode", on);
    },
    update(state, { playing }) {
      range.value = String(state.T);
      range.style.setProperty("--p", `${(state.T / total) * 100}%`);
      const play = $("#pb-play");
      play.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
      play.setAttribute("aria-label", playing ? "หยุดชั่วคราว" : "เล่น");
      const s = state.seg;
      const title = s.kind === "stop" ? s.stop.name : s.kind === "move" ? s.leg.name : s.kind === "walk" ? "เดิน" : "เดินทางข้ามวัน";
      const glyph = s.kind === "stop" ? s.stop.cat : s.kind === "move" ? (s.leg.kind === "bus" ? "bus" : "transit") : "walk";
      const icon = $("#pb-now .ic");
      icon.style.background = s.kind === "stop" ? `var(--${s.stop.cat})` : s.kind === "move" ? "var(--transit)" : "var(--misc)";
      icon.innerHTML = glyphSvg(glyph);
      $("#pb-now .ttl").textContent = title;
      $("#pb-now .sub").textContent = formatClock(state.clock, timeZone);
    },
  };
}
