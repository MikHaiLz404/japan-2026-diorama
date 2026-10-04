// One trip's map: basemap, landmarks, real-sun lighting, day browsing and the replay.
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { buildTrip, type Stop } from "../data/trip";
import type { LngLat } from "../data/types";
import { standaloneUrl } from "../lib/embed";
import { inBox } from "../lib/geo";
import { PALETTES, buildStyle } from "../map/style";
import { buildingHighlights, hiddenBuildings, visitedLandmarks, type Landmark } from "../map/landmarks";
import { createLandmarkLayer } from "../map/landmarkLayer";
import { createLighting } from "../map/lighting";
import { addTripLayers, clearTrail, focusDay } from "../map/tripLayers";
import { addPlaceLabels, placePoints } from "../map/placeLabels";
import { buildTimeline } from "../replay/timeline";
import { createPlayer } from "../replay/player";
import { ALL_DAYS, markDay, markStop, mountDays, mountSheet, renderList, stopCard } from "../ui/panel";
import { mountPlaybar, setClock, showDayCard } from "../ui/playbar";
import { paddedBounds, toLngLatPair, tripExtent } from "../trips/frame";
import type { TripConfig } from "../trips/types";

export function mountTrip(config: TripConfig, { embed }: { embed: boolean }): void {
  const trip = buildTrip(config.fixture, config.routes);
  const { stops, days, timezone } = trip;
  const timeline = buildTimeline(trip);
  const landmarks = visitedLandmarks(stops, config.landmarks);
  const highlight = buildingHighlights(landmarks);
  const extent = toLngLatPair(tripExtent(trip));
  const overviewClock = new Date(config.overviewClock ?? stops[0]?.iso ?? trip.legs[0].iso);
  /**
   * fitBounds padding. MapLibre adds the map padding (side panel / bottom sheet) on top of this itself — adding it
   * here too made the phone fit taller than the screen, and MapLibre then skips the fit silently.
   */
  const FIT_PADDING = 70;
  const OVERVIEW_PITCH = 45;
  const placeOf = (p: LngLat) => config.places?.find((place) => inBox(p, place.box))?.name ?? "";

  document.title = `${config.title} · Trip Replay`;
  document.querySelector("#panel h1")!.textContent = config.title;
  document.querySelector("#panel .sub")!.textContent = config.subtitle;
  document.body.classList.toggle("embed", embed);
  const openLink = document.querySelector<HTMLAnchorElement>("#embed-open")!;
  openLink.hidden = !embed;
  openLink.href = standaloneUrl();

  const map: MapLibreMap = new maplibregl.Map({
    container: "map",
    style: buildStyle(PALETTES.night, hiddenBuildings(landmarks), highlight),
    ...(config.start ?? config.overview ?? { bounds: extent, fitBoundsOptions: { padding: FIT_PADDING }, pitch: OVERVIEW_PITCH }),
    maxPitch: 70, // steeper views pull in far more distant tiles; the app itself never goes past 66
    maxBounds: config.bounds ?? paddedBounds(tripExtent(trip)),
    ...(config.minZoom != null ? { minZoom: config.minZoom } : {}),
    attributionControl: {
      compact: true,
      customAttribution: '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    },
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), "bottom-left");

  const landmarkLayer = createLandmarkLayer(map, { landmarks, badgeHost: document.getElementById("badges")!, onSelect: flyToLandmark });
  const lighting = createLighting(map, {
    highlight, landmarks: landmarkLayer, initial: overviewClock,
    onChange: (date, weights) => setClock(date, weights, timezone),
  });

  /* ---------- layout padding (desktop side panel / mobile sheet) ---------- */
  const PANEL_WIDTH = 360;
  const sheet = mountSheet((visible) => {
    const playing = document.body.classList.contains("playing-mode");
    const mobile = matchMedia("(max-width: 640px)").matches;
    map.setPadding(mobile
      ? { top: 40, bottom: visible + (playing ? 96 : 0), left: 0, right: 0 }
      : { top: 0, bottom: playing ? 110 : 0, left: PANEL_WIDTH, right: 0 });
    document.documentElement.style.setProperty("--sheet", `${visible}px`);
  }, embed ? "peek" : "half");

  function updateTerrain() {
    const center = map.getCenter().toArray() as LngLat;
    const want = config.hilly?.some((box) => inBox(center, box)) ?? false;
    if (want === Boolean(map.getTerrain())) return;
    map.setTerrain(want ? { source: "dem", exaggeration: 1.3 } : null);
    map.setLayoutProperty("hillshade", "visibility", want ? "visible" : "none");
  }

  let placeLabels: ReturnType<typeof addPlaceLabels> = { setClock: () => {} };
  map.once("style.load", () => {
    addTripLayers(map, trip);
    placeLabels = addPlaceLabels(map, placePoints(config.places, stops), config.placesMaxZoom);
    map.addLayer(landmarkLayer.layer);
    config.extras?.(map);
    map.on("click", "stops", (e) => openStop(stops.find((s) => s.id === e.features?.[0]?.properties?.id), false));
    map.on("mouseenter", "stops", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "stops", () => { map.getCanvas().style.cursor = ""; });
    map.on("moveend", updateTerrain);
    updateTerrain();
    // Re-fit once the side panel / sheet padding is applied, so nothing opens hidden behind it.
    if (!config.start && !config.overview) map.fitBounds(extent, { padding: FIT_PADDING, pitch: OVERVIEW_PITCH, duration: 0 });
    lighting.ready();
    // Compact attribution starts expanded on small screens; keep it as the (i) button until tapped.
    document.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
    document.querySelector<HTMLButtonElement>("#play-trip")!.disabled = false;
    selectDay(currentDay, false);
  });

  /* ---------- browsing ---------- */
  let currentDay = ALL_DAYS;
  let popup: maplibregl.Popup | null = null;

  function selectDay(day: string, fly = true) {
    currentDay = day;
    markDay(day);
    focusDay(map, day);
    renderList({ day, stops, landmarks, onStop: (s) => openStop(s), onLandmark: flyToLandmark });
    if (day === ALL_DAYS) {
      lighting.goTo(overviewClock, { animate: fly });
      if (fly && config.overview) map.flyTo({ ...config.overview, duration: 2200 });
      else if (fly) map.fitBounds(extent, { padding: FIT_PADDING, pitch: OVERVIEW_PITCH, bearing: 0, duration: 2200 });
      return;
    }
    const items = stops.filter((s) => s.day === day);
    if (!items.length) return;
    lighting.goTo(new Date(items[0].iso), { animate: fly });
    if (!fly) return;
    const bounds = items.reduce((b, s) => b.extend(s.lngLat), new maplibregl.LngLatBounds(items[0].lngLat, items[0].lngLat));
    map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: 15.6, pitch: 58, bearing: map.getBearing(), duration: 2000 });
  }

  function openStop(s: Stop | undefined, fly = true) {
    if (!s) return;
    lighting.goTo(new Date(s.iso));
    if (fly) map.flyTo({ center: s.lngLat, zoom: 16.6, pitch: 60, bearing: map.getBearing(), duration: 1800, essential: true });
    popup?.remove();
    popup = new maplibregl.Popup({ offset: 16, maxWidth: "260px" }).setLngLat(s.lngLat).setDOMContent(stopCard(s)).addTo(map);
    if (sheet.mobile) sheet.set("peek");
  }

  function flyToLandmark(lm: Landmark) {
    if (player.playing) exitReplay();
    const zoom = lm.top > 200 ? 15.1 : lm.top > 60 ? 16.2 : 17.2;
    map.flyTo({ center: lm.at, zoom, pitch: 66, bearing: map.getBearing() + 25, duration: 2200, essential: true });
    if (sheet.mobile) sheet.set("peek");
  }

  mountDays(days, (day) => {
    const replaying = document.body.classList.contains("playing-mode");
    if (replaying && day !== ALL_DAYS) {
      player.seekDay(day);
      return;
    }
    if (replaying) exitReplay();
    selectDay(day);
  });

  /* ---------- replay ---------- */
  const head = document.createElement("div");
  head.className = "head";
  head.innerHTML = '<span class="pulse"></span><span class="dot"></span>';
  const headMarker = new maplibregl.Marker({ element: head });
  let lastSegment = -1;
  let lastDay: string | null = null;

  const player = createPlayer(map, timeline, (state, info) => {
    const s = state.seg;
    bar.update(state, info);
    lighting.apply(state.clock);
    placeLabels.setClock(state.clock);
    head.classList.toggle("hidden", s.kind === "jump" && state.u < 0.97);
    head.dataset.mode = s.kind === "move" ? s.leg.kind : s.kind;
    headMarker.setLngLat(state.pos);
    if (s.day !== lastDay) {
      lastDay = s.day;
      markDay(s.day);
      focusDay(map, s.day, { routes: false });
      renderList({ day: s.day, stops, landmarks, onStop: (st) => { exitReplay(); openStop(st); }, onLandmark: flyToLandmark });
    }
    if (state.i !== lastSegment) {
      lastSegment = state.i;
      if (s.kind === "jump" && s.newDay && s.dur > 1) showDayCard(s.day, placeOf(s.to));
      if (s.kind === "stop") markStop(s.stop.id);
    }
  });

  const bar = mountPlaybar({
    total: timeline.total,
    segs: timeline.segs,
    timeZone: timezone,
    onToggle: () => (player.playing ? player.pause() : player.play()),
    onSeek: (t) => { player.pause(); player.seek(t); },
    onStep: (direction) => { player.pause(); player.step(direction); },
    onSpeed: (v) => player.setSpeed(v),
    onClose: exitReplay,
  });

  function enterReplay() {
    popup?.remove();
    lighting.stop();
    bar.show(true);
    headMarker.setLngLat(map.getCenter()).addTo(map);
    sheet.set(sheet.mobile ? "peek" : "half");
    lastSegment = -1;
    lastDay = null;
    if (currentDay !== ALL_DAYS) player.seekDay(currentDay);
    else player.seek(player.T >= player.total ? 0 : player.T);
    player.play();
  }

  function exitReplay() {
    player.stop();
    bar.show(false);
    headMarker.remove();
    clearTrail(map);
    placeLabels.setClock(new Date());
    sheet.set("half");
    selectDay(lastDay ?? currentDay, false);
  }

  document.getElementById("play-trip")!.addEventListener("click", enterReplay);

  /* ---------- floating buttons & keys ---------- */
  const orbitButton = document.getElementById("orbit")!;
  const pitchButton = document.getElementById("pitch")!;
  let orbiting = false;
  const ORBIT_DEG_PER_FRAME = 0.12;
  function spin() {
    if (!orbiting) return;
    map.setBearing(map.getBearing() + ORBIT_DEG_PER_FRAME);
    requestAnimationFrame(spin);
  }
  orbitButton.addEventListener("click", () => {
    orbiting = !orbiting;
    orbitButton.setAttribute("aria-pressed", String(orbiting));
    if (orbiting) spin();
  });
  pitchButton.addEventListener("click", () => {
    const flat = map.getPitch() < 5;
    map.easeTo({ pitch: flat ? 60 : 0, duration: 900 });
    pitchButton.textContent = flat ? "2D" : "3D";
  });
  for (const type of ["mousedown", "touchstart", "wheel"]) {
    map.getCanvas().addEventListener(type, () => {
      if (player.playing) player.pause();
      if (orbiting) {
        orbiting = false;
        orbitButton.setAttribute("aria-pressed", "false");
      }
    }, { passive: true });
  }
  addEventListener("keydown", (e) => {
    if ((e.target as HTMLElement).closest("input, button")) return;
    if (!document.body.classList.contains("playing-mode")) return;
    if (e.key === " ") {
      e.preventDefault();
      if (player.playing) player.pause();
      else player.play();
    }
    if (e.key === "Escape") exitReplay();
  });
}
