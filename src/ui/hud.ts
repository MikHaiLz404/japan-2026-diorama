import type { CityBlock, TripFixture } from "../data/types";
import { eachDateKey, formatDayLabel } from "../lib/dates";
import { COPY, ariaLabel, liveDayLabel, startsLabel, statusShort, wrappedLabel } from "./copy";

export function renderHudMeta(el: HTMLElement, trip: TripFixture, today: string) {
  const days = eachDateKey(trip.starts_at, trip.ends_at);
  const index = days.indexOf(today);
  const label =
    index >= 0
      ? liveDayLabel(index + 1, days.length)
      : today < trip.starts_at
        ? startsLabel(formatDayLabel(trip.starts_at, trip.timezone))
        : wrappedLabel(formatDayLabel(trip.ends_at, trip.timezone));
  el.textContent = `${formatDayLabel(trip.starts_at, trip.timezone)} – ${formatDayLabel(trip.ends_at, trip.timezone)} · ${label}`;
}

export function cityOptionLabel(city: CityBlock): string {
  const status = statusShort(city.status);
  return `${city.nameJa} · ${city.name} — ${status.ja}`;
}

export function renderCityChips(
  host: HTMLElement,
  cities: CityBlock[],
  selectedId?: string,
) {
  const chips = cities
    .map((city) => {
      const selected = city.id === selectedId ? " is-selected" : "";
      const status = statusShort(city.status);
      return `<button type="button" class="chip status-${city.status}${selected}" data-city="${city.id}">
        <span>${city.name}</span>
        <small>${city.nameJa} · ${status.ja}</small>
      </button>`;
    })
    .join("");

  const options = [
    `<option value="">${COPY.cities.ja} / ${COPY.cities.en}</option>`,
    ...cities.map((city) => {
      const selected = city.id === selectedId ? " selected" : "";
      return `<option value="${city.id}" class="status-${city.status}"${selected}>${cityOptionLabel(city)}</option>`;
    }),
  ].join("");

  host.innerHTML = `
    <div class="city-chips">${chips}</div>
    <label class="city-select-wrap">
      <span class="visually-hidden">${ariaLabel(COPY.cities)}</span>
      <select id="city-select" class="city-select" aria-label="${ariaLabel(COPY.cities)}">
        ${options}
      </select>
    </label>
  `;
}
