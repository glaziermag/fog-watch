// -------------------------------
// NOAA STAR (public) endpoints
// -------------------------------
const LATEST_URL = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/psw/GEOCOLOR/1200x1200.jpg';
const LOOP_URL   = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/PSW/GEOCOLOR/GOES19-PSW-GEOCOLOR-600x600.gif';

// DOM handles
const latestImg     = document.getElementById('latest-image');
const loopImg       = document.getElementById('loop-image');
const brightnessCtl = document.getElementById('brightnessRange');

// -------------------------------
// RealEarth (tiles via Leaflet)
// -------------------------------
// Your RealEarth access key (from User Tools -> Access Keys)
// NOTE: RealEarth enforces Allowed Referrers; add your GitHub Pages domain
// (e.g. glaziermag.github.io) in the RealEarth UI. The key below comes from
// the user; update it whenever you generate a new key.
const REALEARTH_ACCESS_KEY = '4f4c1f95381e09dad07be6d804eee673';

// Choose the RealEarth product (pick ONE).  Fog RGB is ideal at night because
// it highlights low-level clouds, while GeoColor gives a blended day/night
// representation.  Night Microphysics is another option for night fog.
const RE_PRODUCT = 'G18-ABI-CONUS-fog';          // Fog RGB
// const RE_PRODUCT = 'G18-ABI-CONUS-geo-color'; // True-color day / IR night
// const RE_PRODUCT = 'G18-ABI-CONUS-night-microphysics'; // Enhanced night fog contrast

// Map default view (center on SF Bay).  Latitude, longitude.
const RE_CENTER   = [37.8, -122.3];
const RE_ZOOM     = 6;               // Leaflet zoom 0..19 (6 shows NorCal nicely)
let reMap, reLayer;

// Build tile URL template with key + cachebuster
function realEarthTileTemplate() {
  const base = `https://realearth.ssec.wisc.edu/tiles/${RE_PRODUCT}/{z}/{x}/{y}.png`;
  const qs = new URLSearchParams();
  if (REALEARTH_ACCESS_KEY) qs.set('key', REALEARTH_ACCESS_KEY);
  qs.set('v', Date.now().toString());
  return `${base}?${qs.toString()}`;
}

function initRealEarthMap() {
  reMap = L.map('re-map', {
    attributionControl: true,
    zoomControl: true,
    minZoom: 4,
    maxZoom: 10,
    preferCanvas: false
  }).setView(RE_CENTER, RE_ZOOM);

  reLayer = L.tileLayer(realEarthTileTemplate(), {
    tileSize: 256,
    updateWhenIdle: true,
    updateInterval: 0,
    keepBuffer: 0,
    crossOrigin: false
  }).addTo(reMap);
}

function refreshRealEarthTiles() {
  if (reLayer) reLayer.setUrl(realEarthTileTemplate());
}

// -------------------------------
// Brightness control (applied to all visuals)
// -------------------------------
function applyBrightness() {
  const factor = Number(brightnessCtl.value) / 100;
  const filter = `brightness(${factor})`;
  latestImg.style.filter = filter;
  loopImg.style.filter = filter;
  const tilePane = document.querySelector('#re-map .leaflet-pane.leaflet-tile-pane');
  if (tilePane) tilePane.style.filter = filter;
}

// -------------------------------
// Update cadence (align to ABI 5‑min boundaries)
// -------------------------------
function updateImages() {
  const t = Date.now();
  latestImg.src = `${LATEST_URL}?v=${t}`;
  loopImg.src   = `${LOOP_URL}?v=${t}`;
  refreshRealEarthTiles();
}

function startAlignedRefresh() {
  // Compute ms until the next UTC 5-minute boundary, add ~20s cushion
  const now = new Date();
  const msToNext5 =
    (5 - (now.getUTCMinutes() % 5)) * 60_000
    - (now.getUTCSeconds() * 1000 + now.getUTCMilliseconds());
  const delay = Math.max(5_000, msToNext5 + 20_000);
  setTimeout(function tick() {
    updateImages();
    setTimeout(tick, 5 * 60_000);
  }, delay);
}

// Refresh whenever the tab becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateImages();
});

// -------------------------------
// Boot
// -------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initRealEarthMap();
  applyBrightness();
  updateImages();       // fetch now
  startAlignedRefresh();
  brightnessCtl.addEventListener('input', applyBrightness);
});