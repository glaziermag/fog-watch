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

// Fixed RealEarth product for fog RGB.  Fog RGB emphasises low clouds and
// marine layer and provides good contrast day and night.  See
// https://realearth.ssec.wisc.edu/products for details.
const RE_PRODUCT = 'G18-ABI-CONUS-fog';

// Map default view (center on SF Bay).  Latitude, longitude.
// Center the map tightly on the San Francisco Bay Area and zoom in for a
// closer view.  Higher zoom values show a smaller region in more detail.
const RE_CENTER   = [37.75, -122.45];
const RE_ZOOM     = 9;
let reMap, reLayer;

// Build tile URL template with key + cachebuster
function realEarthTileTemplate() {
  const base = `https://realearth.ssec.wisc.edu/tiles/${RE_PRODUCT}/{z}/{x}/{y}.png`;
  const qs = new URLSearchParams();
  if (REALEARTH_ACCESS_KEY) {
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

  // Add base roads and labels overlays from CartoDB.  These tiles are
  // publicly available and include roads (no labels) and labels only.  The
  // opacity controls how strongly they appear over the satellite imagery.
  // Add a road overlay without labels from CartoDB.  Labels have been
  // removed per user request.
  const roadsLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
    {
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors & CartoDB',
      opacity: 0.5,
      maxZoom: 19
    }
  );
  roadsLayer.addTo(reMap);
}

function refreshRealEarthTiles() {
  if (reLayer) reLayer.setUrl(realEarthTileTemplate());
  updateTimestamp();
}

// Convert a Date object to RealEarth tile path components.
// Returns an object { date: 'YYYYMMDD', time: 'HHMMSS' }.
function formatTimeForRealEarth(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const HH = pad(date.getUTCHours());
  const MM = pad(date.getUTCMinutes());
  const SS = pad(date.getUTCSeconds());
  return { date: `${yyyy}${mm}${dd}`, time: `${HH}${MM}${SS}` };
}

// Get an array of Date objects representing the last n 5‑minute intervals
// including now.  For example, getRecentTimes(3) returns [now, now‑5min, now‑10min].
function getRecentTimes(n) {
  const times = [];
  const now = new Date();
  // Round down to the nearest 5‑minute boundary
  const rounded = new Date(now.getTime() - (now.getUTCMinutes() % 5) * 60000 - now.getUTCSeconds() * 1000 - now.getUTCMilliseconds());
  for (let i = 0; i < n; i++) {
    times.push(new Date(rounded.getTime() - i * 5 * 60000));
  }
  return times;
}

// Build a tile URL template for a specific time (UTC).
function realEarthTileTemplateForTime(dateObj) {
  const { date, time } = formatTimeForRealEarth(dateObj);
  const base = `https://realearth.ssec.wisc.edu/tiles/${RE_PRODUCT}/${date}/${time}/{z}/{x}/{y}.png`;
  const qs = new URLSearchParams();
  if (REALEARTH_ACCESS_KEY) qs.set('accesskey', REALEARTH_ACCESS_KEY);
  qs.set('v', Date.now().toString());
  return `${base}?${qs.toString()}`;
}

// Update the timestamp overlay to show the current refresh time (local timezone).
function updateTimestamp() {
  const tsEl = document.getElementById('timestamp');
  if (!tsEl) return;
  const now = new Date();
  const local = now.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  tsEl.textContent = `Updated ${local}`;
}

// Replay the last 15 minutes of tiles (3 frames).  When finished, the
// map returns to the latest imagery.  Disable the replay button while
// playing to avoid overlapping animations.
function startReplay() {
  const btn = document.getElementById('replayBtn');
  if (!btn || !reLayer) return;
  btn.disabled = true;
  const frames = getRecentTimes(3);
  let idx = frames.length - 1; // start with the oldest frame
  function showNext() {
    const frameDate = frames[idx];
    reLayer.setUrl(realEarthTileTemplateForTime(frameDate));
    // Update timestamp overlay to reflect the frame's time (local timezone)
    const tsEl = document.getElementById('timestamp');
    if (tsEl) {
      const local = frameDate.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      tsEl.textContent = `Showing ${local}`;
    }
    idx++;
    if (idx < frames.length) {
      setTimeout(showNext, 1500);
    } else {
      // Restore latest after a pause
      setTimeout(() => {
        refreshRealEarthTiles();
        btn.disabled = false;
      }, 1500);
    }
  }
  showNext();
}

// -------------------------------
// Brightness control (applied to all visuals)
// -------------------------------
function applyBrightness() {
  const factor = Number(brightnessCtl.value) / 100;
  // Apply both brightness and contrast.  A higher brightness also scales the
  // contrast for greater differentiation of clouds at night.
  const contrast = 1 + (factor - 1) * 1.2;
  const filter = `brightness(${factor}) contrast(${contrast})`;
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
  // Compute ms until the next UTC 15‑minute boundary (00, 15, 30, 45), add ~20s cushion
  const now = new Date();
  const minutes = now.getUTCMinutes();
  const msToNext15 =
    (15 - (minutes % 15)) * 60_000
    - (now.getUTCSeconds() * 1000 + now.getUTCMilliseconds());
  const delay = Math.max(5_000, msToNext15 + 20_000);
  setTimeout(function tick() {
    refreshMap();
    setTimeout(tick, 15 * 60_000);
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

  const replayBtn = document.getElementById('replayBtn');
  if (replayBtn) {
    replayBtn.addEventListener('click', startReplay);
  }
});