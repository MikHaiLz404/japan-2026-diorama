import type { CityBlock, DayPlate, Selection, TripFixture } from "../data/types";
import { eachDateKey, formatDayLabel, formatRange, formatTime } from "../lib/dates";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function typeLabel(type: string): string {
  return type.replace(/([A-Z])/g, " $1").replace(/^./, (ch) => ch.toUpperCase());
}

function statusLabel(status: CityBlock["status"]): string {
  if (status === "today") return "วันนี้ · today";
  if (status === "visited") return "ไปแล้ว · visited";
  return "ถัดไป · upcoming";
}

function plateFor(city: CityBlock, date?: string): DayPlate | undefined {
  if (date) return city.plates.find((plate) => plate.date === date);
  return city.plates.find((plate) => plate.status === "today") ?? city.plates[0];
}

export function renderSheet(
  host: HTMLElement,
  trip: TripFixture,
  city: CityBlock,
  selection: Selection,
): void {
  const plate = plateFor(city, selection.date);
  const date = plate?.date ?? selection.date;
  const tz = trip.timezone;
  const lodging = plate?.lodging.length ? plate.lodging : city.lodging;
  const activities = plate?.activities ?? city.activities;
  const tripDays = eachDateKey(trip.starts_at, trip.ends_at);

  const dayTabs = city.plates
    .map((item) => {
      const active = item.date === date ? " is-active" : "";
      return `<button type="button" class="day-tab${active}" data-city="${city.id}" data-date="${item.date}">${escapeHtml(item.date.slice(5))}</button>`;
    })
    .join("");

  const stays = lodging
    .map((stay) => {
      return `<article class="card">
        <p class="card-kicker">ที่พัก · Lodging</p>
        <h3>${escapeHtml(stay.name)}</h3>
        <p>${escapeHtml(formatRange(stay.starts_at, stay.ends_at, stay.timezone || tz))}</p>
        ${stay.address ? `<p class="muted">${escapeHtml(stay.address)}</p>` : ""}
        ${stay.notes ? `<p class="muted">${escapeHtml(stay.notes)}</p>` : ""}
      </article>`;
    })
    .join("");

  const items = activities
    .map((activity) => {
      const time = formatTime(activity.starts_at, activity.timezone || tz);
      return `<li>
        <span class="time">${time ? escapeHtml(time) : "—"}</span>
        <span>
          <strong>${escapeHtml(activity.name)}</strong>
          <em>${escapeHtml(typeLabel(activity.type))}</em>
        </span>
      </li>`;
    })
    .join("");

  host.innerHTML = `
    <p class="sheet-kicker">${escapeHtml(city.nameJa)} · ${statusLabel(city.status)}</p>
    <h2>${escapeHtml(city.name)}</h2>
    <p class="sheet-lead">${date ? escapeHtml(formatDayLabel(date, tz)) : "แผ่นทริป · Trip plate"} · วันที่ ${(date ? tripDays.indexOf(date) + 1 : 0) || "—"} / ${tripDays.length}</p>
    <div class="day-tabs" role="tablist">${dayTabs}</div>
    ${stays || `<article class="card"><p class="card-kicker">ที่พัก · Lodging</p><p class="muted">ไปเช้าเย็นกลับจาก Tokyo — นอนที่ Aoto / Asakusa</p></article>`}
    <h3 class="list-title">บนแผ่นนี้ · On this plate</h3>
    <ul class="activity-list">${items || "<li class='muted'>ยังไม่มีจุดบนแผ่นนี้ · No stops yet</li>"}</ul>
  `;
}
