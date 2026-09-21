import "./style.css";
import { prepareTrip } from "./data/loadTrip";
import { isEmbedMode, standaloneUrl } from "./lib/embed";
import { Diorama } from "./scene/diorama";
import { renderCityChips, renderHudMeta, setCityMenuOpen } from "./ui/hud";
import { renderSheet } from "./ui/sheet";
import type { Selection } from "./data/types";

const prepared = prepareTrip();
const stage = document.querySelector<HTMLElement>("#stage");
const sheet = document.querySelector<HTMLElement>("#sheet");
const sheetBody = document.querySelector<HTMLElement>("#sheet-body");
const chips = document.querySelector<HTMLElement>("#city-chips");
const hudMeta = document.querySelector<HTMLElement>("#hud-meta");
const hint = document.querySelector<HTMLElement>("#hint");
const embedBar = document.querySelector<HTMLAnchorElement>("#embed-open");

if (!stage || !sheet || !sheetBody || !chips || !hudMeta) {
  throw new Error("Diorama shell is missing required DOM nodes.");
}

const embedded = isEmbedMode();
if (embedded) {
  document.documentElement.classList.add("is-embed");
  if (embedBar) {
    embedBar.hidden = false;
    embedBar.href = standaloneUrl();
  }
} else if (embedBar) {
  embedBar.hidden = true;
}

const stageEl = stage;
const sheetEl = sheet;
const sheetBodyEl = sheetBody;
const chipsEl = chips;

renderHudMeta(hudMeta, prepared.trip, prepared.today);
renderCityChips(chipsEl, prepared.cities);

const cityById = (id: string) => prepared.cities.find((city) => city.id === id);

function applySelection(next: Selection | null) {
  renderCityChips(chipsEl, prepared.cities, next?.cityId);
  diorama.focus(next);

  if (!next) {
    sheetEl.hidden = true;
    if (hint) hint.hidden = false;
    return;
  }

  const city = cityById(next.cityId);
  if (!city) return;
  renderSheet(sheetBodyEl, prepared.trip, city, next);
  sheetEl.hidden = false;
  if (hint) hint.hidden = true;
}

const diorama = new Diorama(stageEl, prepared, applySelection);

chipsEl.addEventListener("click", (event) => {
  const toggle = (event.target as HTMLElement).closest<HTMLButtonElement>("#city-menu-toggle");
  if (toggle) {
    const list = chipsEl.querySelector<HTMLElement>("#city-menu-list");
    setCityMenuOpen(chipsEl, Boolean(list?.hidden));
    return;
  }
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-city]");
  if (!button) return;
  applySelection({ cityId: button.dataset.city ?? "" });
});

document.addEventListener("pointerdown", (event) => {
  if (!chipsEl.classList.contains("is-menu-open")) return;
  if (chipsEl.contains(event.target as Node)) return;
  setCityMenuOpen(chipsEl, false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setCityMenuOpen(chipsEl, false);
});

sheetBodyEl.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-date]");
  if (!button?.dataset.city || !button.dataset.date) return;
  applySelection({ cityId: button.dataset.city, date: button.dataset.date });
});

document.querySelector("#sheet-close")?.addEventListener("click", () => applySelection(null));
document.querySelector("#reset-view")?.addEventListener("click", () => applySelection(null));
document.querySelector("#zoom-in")?.addEventListener("click", () => diorama.nudgeZoom(1));
document.querySelector("#zoom-out")?.addEventListener("click", () => diorama.nudgeZoom(-1));
