import type { CityBlock, TripFixture } from "../data/types";
import { eachDateKey, formatDayLabel } from "../lib/dates";
import { COPY, ariaLabel, jaEn, liveDayLabel, startsLabel, statusShort, wrappedLabel } from "./copy";

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

export function closedCityLabel(city?: Pick<CityBlock, "name">): string {
  return city ? city.name : jaEn(COPY.cities);
}

export function cityRowMeta(city: Pick<CityBlock, "nameJa" | "status">): string {
  return `${city.nameJa} · ${statusShort(city.status).ja}`;
}

export function setCityMenuOpen(host: HTMLElement, open: boolean): void {
  const toggle = host.querySelector<HTMLButtonElement>("#city-menu-toggle");
  const list = host.querySelector<HTMLElement>("#city-menu-list");
  if (!toggle || !list) return;
  list.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
  host.classList.toggle("is-menu-open", open);
}

export function renderCityChips(
  host: HTMLElement,
  cities: CityBlock[],
  selectedId?: string,
) {
  const selected = cities.find((city) => city.id === selectedId);
  const chips = cities
    .map((city) => {
      const on = city.id === selectedId ? " is-selected" : "";
      return `<button type="button" class="chip status-${city.status}${on}" data-city="${city.id}">
        <span>${city.name}</span>
        <small>${cityRowMeta(city)}</small>
      </button>`;
    })
    .join("");

  const rows = cities
    .map((city) => {
      const on = city.id === selectedId ? " is-selected" : "";
      const selectedAttr = city.id === selectedId ? " aria-selected=\"true\"" : " aria-selected=\"false\"";
      return `<li>
        <button type="button" class="city-menu-item status-${city.status}${on}" data-city="${city.id}" role="option"${selectedAttr}>
          <span>${city.name}</span>
          <small>${cityRowMeta(city)}</small>
        </button>
      </li>`;
    })
    .join("");

  host.innerHTML = `
    <div class="city-chips">${chips}</div>
    <div class="city-menu">
      <button type="button" id="city-menu-toggle" class="city-menu-toggle" aria-expanded="false" aria-haspopup="listbox" aria-controls="city-menu-list">
        <span>${closedCityLabel(selected)}</span>
      </button>
      <ul id="city-menu-list" class="city-menu-list" role="listbox" aria-label="${ariaLabel(COPY.cities)}" hidden>
        ${rows}
      </ul>
    </div>
  `;
  host.classList.remove("is-menu-open");
}
