// Side panel (desktop) / bottom sheet (mobile): day strip, stop list, landmark list, popup card.
import { CATEGORY_LABEL, dayParts, type Stop } from "../data/trip";
import { ICONS, glyphSvg } from "../map/icons";
import type { Landmark } from "../map/landmarks";
import { prefersReducedMotion } from "../lib/motion";

const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector)!;
const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? "auto" : "smooth");
export const ALL_DAYS = "all";

/* ---------- day strip ---------- */
export function mountDays(days: string[], onPick: (day: string) => void): void {
  const strip = $("#days");
  const chip = (key: string, small: string, big: string | number) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "day";
    b.dataset.day = key;
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = `<small></small><b></b>`;
    $("small", b).textContent = small;
    $("b", b).textContent = String(big);
    b.addEventListener("click", () => onPick(key));
    strip.appendChild(b);
  };
  chip(ALL_DAYS, "ทริป", "ทั้งหมด");
  for (const d of days) {
    const { weekday, date } = dayParts(d);
    chip(d, weekday, date);
  }

  // Mouse wheel scrolls sideways, drag to scroll, ←/→ step through days.
  strip.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    strip.scrollLeft += e.deltaY;
  }, { passive: false });
  let drag: { x: number; left: number; moved: boolean } | null = null;
  strip.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") drag = { x: e.clientX, left: strip.scrollLeft, moved: false };
  });
  addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      strip.classList.add("dragging");
    }
    if (drag.moved) strip.scrollLeft = drag.left - dx;
  });
  addEventListener("pointerup", () => {
    if (drag?.moved) requestAnimationFrame(() => strip.classList.remove("dragging"));
    drag = null;
  });
  strip.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const chips = [...strip.children] as HTMLButtonElement[];
    const i = chips.findIndex((b) => b.getAttribute("aria-pressed") === "true");
    const next = chips[Math.max(0, Math.min(chips.length - 1, i + (e.key === "ArrowRight" ? 1 : -1)))];
    e.preventDefault();
    next.focus();
    onPick(next.dataset.day!);
  });
}

export function markDay(key: string): void {
  for (const b of $("#days").children) b.setAttribute("aria-pressed", String((b as HTMLElement).dataset.day === key));
  document.querySelector(`#days [data-day="${key}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: scrollBehavior() });
}

/* ---------- list ---------- */
function row(iconHtml: string, title: string, sub: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "stop";
  b.innerHTML = `${iconHtml}<span class="t"><span class="ttl"></span><span class="sub"></span></span>`;
  $(".ttl", b).textContent = title;
  $(".sub", b).textContent = sub;
  b.addEventListener("click", onClick);
  return b;
}
function section(title: string): HTMLElement {
  const d = document.createElement("div");
  d.className = "sec";
  d.textContent = title;
  return d;
}

export function renderList({ day, stops, landmarks, onStop, onLandmark }: {
  day: string;
  stops: Stop[];
  landmarks: Landmark[];
  onStop: (s: Stop) => void;
  onLandmark: (lm: Landmark) => void;
}): void {
  const list = $("#list");
  list.replaceChildren();
  const stopRow = (s: Stop) => {
    const r = row(`<span class="ic" style="background:var(--${s.cat})">${glyphSvg(s.cat)}</span>`, s.name,
      [s.time, CATEGORY_LABEL[s.cat]].filter(Boolean).join(" · "), () => onStop(s));
    r.dataset.stop = s.id;
    return r;
  };
  const daySection = (d: string, items: Stop[]) => {
    const { weekday, date, month } = dayParts(d);
    list.append(section(`${weekday} ${date} ${month} · ${items.length} จุด`), ...items.map(stopRow));
  };

  if (day !== ALL_DAYS) {
    daySection(day, stops.filter((s) => s.day === day));
    return;
  }
  const shown = landmarks.filter((l) => !l.quiet);
  if (shown.length) {
    list.append(section("Landmarks 3D"));
    for (const lm of shown) {
      list.append(row(`<span class="lm">${ICONS[lm.icon]}</span>`, lm.name, "แตะเพื่อบินไปดู", () => onLandmark(lm)));
    }
    list.append(section(`${stops.length} จุดในทริป`));
    return;
  }
  // No landmarks (most small trips): the overview lists every stop, day by day.
  for (const d of [...new Set(stops.map((s) => s.day))]) daySection(d, stops.filter((s) => s.day === d));
}

export function markStop(id: string): void {
  for (const r of document.querySelectorAll("#list .stop.now")) r.classList.remove("now");
  const r = document.querySelector(`#list [data-stop="${CSS.escape(id)}"]`);
  if (!r) return;
  r.classList.add("now");
  r.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
}

/* ---------- popup ---------- */
export function stopCard(s: Stop): HTMLElement {
  const div = document.createElement("div");
  div.className = "pop";
  const h = document.createElement("h3");
  h.textContent = s.name;
  const p = document.createElement("p");
  const { weekday, date, month } = dayParts(s.day);
  p.textContent = `${weekday} ${date} ${month}${s.time ? ` · ${s.time}` : ""}`;
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.style.setProperty("--cat", `var(--${s.cat})`);
  tag.textContent = CATEGORY_LABEL[s.cat];
  div.append(h, p, tag);
  return div;
}

/* ---------- mobile bottom sheet ---------- */
export type SheetState = "peek" | "half" | "full";
export interface Sheet {
  set(state: SheetState, animate?: boolean): void;
  readonly visible: number;
  readonly mobile: boolean;
}

export function mountSheet(onResize: (visiblePx: number) => void, initial: SheetState = "half"): Sheet {
  const panel = $("#panel");
  const grip = $("#grip");
  const mq = matchMedia("(max-width: 640px)");
  const FULL_FRACTION = 0.86;
  const HALF_FRACTION = 0.46;
  const snaps = () => {
    const full = Math.round(innerHeight * FULL_FRACTION);
    const safe = parseFloat(getComputedStyle(panel).paddingBottom) || 0;
    const peekHeight = grip.offsetHeight + $("#panel header").offsetHeight + $("#days").offsetHeight + safe + 4;
    return { peek: full - peekHeight, half: Math.round(full - innerHeight * HALF_FRACTION), full: 0, height: full };
  };
  let state: SheetState = initial;
  let y = 0;
  let drag: { y0: number; start: number; moved: boolean } | null = null;
  const visible = () => snaps().height - y;

  const set = (next: SheetState, animate = true) => {
    if (!mq.matches) {
      panel.style.transform = "";
      panel.style.height = "";
      onResize(0);
      return;
    }
    const s = snaps();
    state = next;
    y = s[next];
    panel.style.height = `${s.height}px`;
    panel.style.transition = animate && !prefersReducedMotion() ? "transform 320ms cubic-bezier(.2,0,0,1)" : "none";
    panel.style.transform = `translateY(${y}px)`;
    grip.setAttribute("aria-expanded", String(next !== "peek"));
    onResize(visible());
  };

  grip.addEventListener("pointerdown", (e) => {
    if (!mq.matches) return;
    drag = { y0: e.clientY, start: y, moved: false };
    grip.setPointerCapture(e.pointerId);
    panel.style.transition = "none";
  });
  grip.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y0;
    if (Math.abs(dy) > 4) drag.moved = true;
    y = Math.min(snaps().peek, Math.max(0, drag.start + dy));
    panel.style.transform = `translateY(${y}px)`;
  });
  grip.addEventListener("pointerup", () => {
    if (!drag) return;
    const s = snaps();
    if (!drag.moved) set(state === "peek" ? "half" : "peek");
    else set((["full", "half", "peek"] as const).reduce((best, k) => (Math.abs(s[k] - y) < Math.abs(s[best] - y) ? k : best), "half"));
    drag = null;
  });
  grip.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    set(state === "peek" ? "half" : "peek");
  });
  mq.addEventListener("change", () => set(state, false));
  addEventListener("resize", () => set(state, false));
  set(initial, false);
  return { set, get visible() { return mq.matches ? visible() : 0; }, get mobile() { return mq.matches; } };
}
