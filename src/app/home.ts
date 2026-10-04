// Home: one card per trip, newest first. Cards are plain links (/slug), so each trip page loads on its own.
import type { TripSummary } from "../trips/types";

export function renderHome(trips: TripSummary[], { embed }: { embed: boolean }): void {
  document.title = "Trip Replay";
  document.body.classList.add("home");
  const list = document.querySelector<HTMLElement>("#trip-cards")!;
  const suffix = embed ? "?embed=1" : "";
  list.replaceChildren(...trips.map((trip) => {
    const card = document.createElement("a");
    card.className = "trip-card";
    card.href = `/${encodeURIComponent(trip.slug)}${suffix}`;
    card.innerHTML = `
      <span class="trip-dates"></span>
      <span class="trip-title"></span>
      <span class="trip-areas"></span>
      <span class="trip-open" aria-hidden="true">เปิดแผนที่ →</span>`;
    card.querySelector(".trip-dates")!.textContent = trip.dates;
    card.querySelector(".trip-title")!.textContent = trip.title;
    card.querySelector(".trip-areas")!.textContent = trip.areas.join(" · ");
    return card;
  }));
  document.querySelector<HTMLElement>("#home")!.hidden = false;
}

export function renderNotFound(slug: string): void {
  document.title = "ไม่พบทริป · Trip Replay";
  document.body.classList.add("home");
  const home = document.querySelector<HTMLElement>("#home")!;
  home.querySelector("h1")!.textContent = "ไม่พบทริปนี้";
  home.querySelector(".home-sub")!.textContent = `ไม่มีทริปชื่อ “${slug}” — เลือกจากรายการด้านล่างแทน`;
  home.hidden = false;
}
