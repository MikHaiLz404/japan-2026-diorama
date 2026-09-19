import type { CityBlock, TripFixture } from "../data/types";
import { eachDateKey, formatDayLabel } from "../lib/dates";

export function renderHudMeta(el: HTMLElement, trip: TripFixture, today: string) {
  const days = eachDateKey(trip.starts_at, trip.ends_at);
  const index = days.indexOf(today);
  const label =
    index >= 0
      ? `วันที่ ${index + 1} / ${days.length} · สด`
      : today < trip.starts_at
        ? `Starts ${formatDayLabel(trip.starts_at, trip.timezone)}`
        : `Wrapped ${formatDayLabel(trip.ends_at, trip.timezone)}`;
  el.textContent = `${formatDayLabel(trip.starts_at, trip.timezone)} – ${formatDayLabel(trip.ends_at, trip.timezone)} · ${label}`;
}

export function renderCityChips(
  host: HTMLElement,
  cities: CityBlock[],
  selectedId?: string,
) {
  host.innerHTML = cities
    .map((city) => {
      const selected = city.id === selectedId ? " is-selected" : "";
      return `<button type="button" class="chip status-${city.status}${selected}" data-city="${city.id}">
        <span>${city.name}</span>
        <small>${city.nameJa}</small>
      </button>`;
    })
    .join("");
}
