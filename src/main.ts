import "maplibre-gl/dist/maplibre-gl.css";
import "../design-system/moss-and-mist/tokens.css";
import "../design-system/moss-and-mist/components/bundle.css";
import "./styles/app.css";
import { isEmbedMode } from "./lib/embed";
import { findTrip, slugFromPath, tripsByDate } from "./trips";
import { renderHome, renderNotFound } from "./app/home";

const embed = isEmbedMode();
const slug = slugFromPath(location.pathname);
const summary = slug ? findTrip(slug) : undefined;

if (!summary) {
  renderHome(tripsByDate(), { embed });
  if (slug) renderNotFound(slug);
} else {
  document.body.classList.add("trip");
  Promise.all([summary.load(), import("./app/tripView")])
    .then(([config, { mountTrip }]) => mountTrip(config, { embed }))
    .catch((err: unknown) => {
      console.error("Trip failed to load", err);
      document.querySelector<HTMLElement>("#fatal")!.hidden = false;
    });
}
