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

// Compute approximate sunrise and sunset times for a given date and location.
// Based on NOAA's sunrise/sunset algorithm. Returns times in local hours (0–24).
function calculateSunTimes(date, lat, lng) {
  const rad = Math.PI / 180;
  // Day of year
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const lngHour = lng / 15;
  const tzOffset = -date.getTimezoneOffset() / 60; // local offset from UTC in hours
  function calcTime(isSunrise) {
    const t = dayOfYear + ((isSunrise ? 6 : 18) - lngHour) / 24;
    let M = (0.9856 * t) - 3.289;
    let L = M + (1.916 * Math.sin(rad * M)) + (0.020 * Math.sin(2 * rad * M)) + 282.634;
    L = (L + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(rad * L)) / rad;
    RA = (RA + 360) % 360;
    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = RA + (Lquadrant - RAquadrant);
    RA = RA / 15;
    const sinDec = 0.39782 * Math.sin(rad * L);
    const cosDec = Math.cos(Math.asin(sinDec));
    const zenith = 90.833; // official zenith
    const cosH = (Math.cos(rad * zenith) - (sinDec * Math.sin(rad * lat))) / (cosDec * Math.cos(rad * lat));
    if (cosH > 1 || cosH < -1) {
      // Sun never rises/sets this day
      return isSunrise ? 0 : 24;
    }
    let H = isSunrise
      ? 360 - (Math.acos(cosH) / rad)
      : Math.acos(cosH) / rad;
    H = H / 15;
    const T = H + RA - (0.06571 * t) - 6.622;
    let UT = (T - lngHour) % 24;
    if (UT < 0) UT += 24;
    const localT = (UT + tzOffset + 24) % 24;
    return localT;
  }
  const sunrise = calcTime(true);
  const sunset = calcTime(false);
  return { sunrise, sunset };
}

// Choose a RealEarth product based on sunrise/sunset and a 45‑minute buffer.
// This function returns GeoColor between (sunrise + 45 min) and
// sunset (local time).  Outside of that interval it returns Night
// Microphysics to provide better low‑cloud contrast after dark.  We
// compute sunrise/sunset using the NOAA algorithm and then compare
// against the current local clock.  A small buffer is added to
// sunrise so that we stay on the night product for ~45 minutes after
// sunrise as the sun climbs higher.
function getRealEarthProduct() {
  const now = new Date();
  const lat = 37.75;
  const lon = -122.45;
  const times = calculateSunTimes(now, lat, lon);
  // Add 45 minutes (0.75 hours) to sunrise; use sunset as‑is for day end
  const sunriseBuf = (times.sunrise + 0.75) % 24;
  const sunsetBuf = times.sunset;
  // Current local time in hours (0–24).  Compute hours and minutes
  // separately so 30 minutes becomes 0.5 hours rather than 0.3.
  const localString = now.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const [hStr, mStr] = localString.split(':');
  const localHours = parseInt(hStr, 10) + parseInt(mStr, 10) / 60;
  // Determine if we are between sunriseBuf and sunsetBuf.  If
  // sunriseBuf <= sunsetBuf (the normal case), day is the interval
  // [sunriseBuf, sunsetBuf).  If sunriseBuf > sunsetBuf (which
  // happens near the poles in summer/winter), day spans the
  // wrap‑around period and we invert the comparison.
  let isDay;
  if (sunriseBuf <= sunsetBuf) {
    isDay = localHours >= sunriseBuf && localHours < sunsetBuf;
  } else {
    isDay = localHours >= sunriseBuf || localHours < sunsetBuf;
  }
  return isDay ? 'G18-ABI-CONUS-geo-color' : 'G18-ABI-CONUS-night-microphysics';
}

// Map default view (center on SF Bay).  Latitude, longitude.
// Center the map tightly on the San Francisco Bay Area and zoom in for a
// closer view.  Higher zoom values show a smaller region in more detail.
const RE_CENTER   = [37.75, -122.45];
const RE_ZOOM     = 9;
let reMap, reLayer;

// Build tile URL template with key + cachebuster
function realEarthTileTemplate() {
  const product = getRealEarthProduct();
  const base = `https://realearth.ssec.wisc.edu/tiles/${product}/{z}/{x}/{y}.png`;
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
  const product = getRealEarthProduct();
  const base = `https://realearth.ssec.wisc.edu/tiles/${product}/${date}/${time}/{z}/{x}/{y}.png`;
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
    // Update timestamp label to reflect the frame's time (local timezone)
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
  // Compute a stronger contrast scale; saturate slightly to enhance colour
  const contrast = 1 + (factor - 1) * 2.0;
  const saturation = 1 + (factor - 1) * 0.5;
  const filter = `brightness(${factor}) contrast(${contrast}) saturate(${saturation})`;
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