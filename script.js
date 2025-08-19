// Slider controlling overall brightness of the map imagery
const brightnessCtl = document.getElementById('brightnessRange');

// Boost brightness by default at night (America/Los_Angeles)
(() => {
  const now = new Date();
  const hour = parseInt(
    now.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      hour12: false
    }),
    10
  );
  if (hour < 6 || hour > 18) {
    brightnessCtl.value = 150;
  }
})();

// -------------------------------
// RealEarth (tiles via Leaflet)
// -------------------------------
// Your RealEarth access key (from User Tools -> Access Keys)
// NOTE: RealEarth enforces Allowed Referrers; add your GitHub Pages domain
// (e.g. glaziermag.github.io) in the RealEarth UI. The key below comes from
// the user; update it whenever you generate a new key.
const REALEARTH_ACCESS_KEY = '4f4c1f95381e09dad07be6d804eee673';

// Return an appropriate RealEarth product depending on local time: GeoColor
// during the day and Night Microphysics at night.
function getRealEarthProduct() {
  const now = new Date();
  const hourStr = now.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    hour12: false
  });
  const hour = parseInt(hourStr, 10);
  return hour >= 6 && hour <= 18
    ? 'G18-ABI-CONUS-geo-color'
    : 'G18-ABI-CONUS-night-microphysics';
}

// Map default view (center on SF Bay).  Latitude, longitude.
const RE_CENTER   = [37.8, -122.3];
const RE_ZOOM     = 6;               // Leaflet zoom 0..19 (6 shows NorCal nicely)
let reMap, reLayer;

// Build tile URL template with key + cachebuster
function realEarthTileTemplate() {
  const product = getRealEarthProduct();
  const base = `https://realearth.ssec.wisc.edu/tiles/${product}/{z}/{x}/{y}.png`;
  const qs = new URLSearchParams();
  if (REALEARTH_ACCESS_KEY) {
    // Attach your access key to avoid watermarking or referer errors.
    qs.set('accesskey', REALEARTH_ACCESS_KEY);
  }
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
  const tilePane = document.querySelector('#re-map .leaflet-pane.leaflet-tile-pane');
  if (tilePane) tilePane.style.filter = filter;
}

// -------------------------------
// Update cadence (align to ABI 5‑min boundaries)
// -------------------------------
function refreshMap() {
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
    refreshMap();
    setTimeout(tick, 5 * 60_000);
  }, delay);
}

// Refresh whenever the tab becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshMap();
});

// -------------------------------
// Boot
// -------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initRealEarthMap();
  applyBrightness();
  refreshMap();       // fetch now
  startAlignedRefresh();
  brightnessCtl.addEventListener('input', applyBrightness);
});