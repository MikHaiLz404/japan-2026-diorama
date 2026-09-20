import type { VisitStatus } from "../data/types";

export type Bilingual = {
  ja: string;
  en: string;
};

/** Locked overlay chrome: Japanese primary, English secondary. Fixture names stay as-is. */
export const COPY = {
  tripTray: { ja: "旅トレイ", en: "Trip tray" },
  reset: { ja: "リセット", en: "Reset" },
  close: { ja: "閉じる", en: "Close" },
  hint: { ja: "街をタップ · ドラッグで回転", en: "Tap a city · drag to orbit" },
  visited: { ja: "行った", en: "Visited" },
  today: { ja: "今日", en: "Today" },
  upcoming: { ja: "これから", en: "Upcoming" },
  todayPlate: { ja: "今日の日程", en: "Today's plan" },
  todayStops: { ja: "今日のスポット", en: "Today's stops" },
  noStops: { ja: "今日のスポットはまだない", en: "No stops today" },
  lodging: { ja: "宿泊", en: "Lodging" },
  cities: { ja: "都市", en: "Cities" },
  zoomOut: { ja: "ズームアウト", en: "Zoom out" },
  zoomIn: { ja: "ズームイン", en: "Zoom in" },
  live: { ja: "ライブ", en: "live" },
  starts: { ja: "開始", en: "Starts" },
  wrapped: { ja: "終了", en: "Wrapped" },
} as const satisfies Record<string, Bilingual>;

export function statusShort(status: VisitStatus): Bilingual {
  if (status === "visited") return COPY.visited;
  if (status === "today") return COPY.today;
  return COPY.upcoming;
}

export function jaEn(pair: Bilingual, sep = " · "): string {
  return `${pair.ja}${sep}${pair.en}`;
}

export function ariaLabel(pair: Bilingual): string {
  return `${pair.ja} / ${pair.en}`;
}

export function stayingLabel(place: string): string {
  return `${place}に宿泊 · Staying in ${place}`;
}

function scheduleCountJa(index: number | string, total: number): string {
  return `日程 ${index} / ${total}`;
}

export function liveDayLabel(index: number, total: number): string {
  return `${scheduleCountJa(index, total)} · ${COPY.live.ja}`;
}

export function dayCountLabel(index: number | string, total: number): string {
  return `${scheduleCountJa(index, total)} · Day ${index} / ${total}`;
}

export function startsLabel(date: string): string {
  return `${COPY.starts.en} ${date} · ${COPY.starts.ja}`;
}

export function wrappedLabel(date: string): string {
  return `${COPY.wrapped.en} ${date} · ${COPY.wrapped.ja}`;
}
