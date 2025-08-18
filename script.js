// Fog Visualizer script

// Base URLs for the imagery.  The PSW (Pacific Southwest) sector contains
// Northern California, Oregon and Nevada.  GEOColor merges true‑color
// visible imagery with infrared at night to provide continuous viewing.
const LATEST_URL =
  "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/psw/GEOCOLOR/1200x1200.jpg";
const LOOP_URL =
  "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/PSW/GEOCOLOR/GOES19-PSW-GEOCOLOR-600x600.gif";

// DOM elements
const latestImg = document.getElementById("latest-image");
const loopImg = document.getElementById("loop-image");
const timestampEl = document.getElementById("timestamp");
const brightnessRange = document.getElementById("brightnessRange");

// Optional zoom image (may not exist if removed from markup)
const zoomImg = document.getElementById("zoom-image");

// Pan controls for the zoom crop (may be undefined if controls are not present)
const panXRange = document.getElementById("panXRange");
const panYRange = document.getElementById("panYRange");

// RealEarth overhead image element (may be null if markup removed)
const reImg = document.getElementById("re-image");

// RealEarth configuration.  These values define the center and zoom
// for the Bay Area.  They are used to construct the RealEarth API URL.
// See README.md for instructions on obtaining a free access key.
const REALEARTH_PRODUCTS =
  "G19-ABI-CONUS-geo-color,G19-ABI-CONUS-fog";
// Longitude,Latitude (negative for west).  Center on San Francisco Bay.
const REAL_EARTH_CENTER = [-122.4, 37.8];
// Zoom level: higher numbers zoom in closer.  5 is a good balance for
// capturing the Bay Area while showing some surrounding context.
const REAL_EARTH_ZOOM = 5;
// Requested image dimensions.  Anonymous RealEarth users are limited
// to 512px composites; registered users get up to 1024px.  Adjust
// these values to your account tier.
const REAL_EARTH_WIDTH = 800;
const REAL_EARTH_HEIGHT = 800;
// Optional: your RealEarth access key.  Leave empty for anonymous
// requests.  To obtain a key, register a free RealEarth account and
// follow the instructions in the README.
const REALEARTH_ACCESS_KEY = "";

/**
 * Construct a RealEarth API URL for the configured products,
 * center, zoom and dimensions.  Attaches the access key if provided.
 */
function buildRealEarthURL() {
  const [lon, lat] = REAL_EARTH_CENTER;
  let url =
    "https://realearth.ssec.wisc.edu/api/image" +
    `?products=${encodeURIComponent(REALEARTH_PRODUCTS)}` +
    `&width=${REAL_EARTH_WIDTH}` +
    `&height=${REAL_EARTH_HEIGHT}` +
    `&center=${lon},${lat}` +
    `&zoom=${REAL_EARTH_ZOOM}`;
  if (REALEARTH_ACCESS_KEY && REALEARTH_ACCESS_KEY.trim() !== "") {
    url += `&key=${encodeURIComponent(REALEARTH_ACCESS_KEY.trim())}`;
  }
  return url;
}

/**
 * Update the objectPosition of the zoom image based on pan slider values.
 * Horizontal and vertical values are percentages (0–100) representing how
 * far to shift the crop relative to the full image.  This allows users to
 * reposition the cropped view without reloading the image.
 */
function updateZoomPan() {
  if (!zoomImg) return;
  const x = panXRange ? panXRange.value : 0;
  const y = panYRange ? panYRange.value : 0;
  zoomImg.style.objectPosition = `${x}% ${y}%`;
}

/**
 * Apply brightness filter to both images based on the range input.
 */
function applyBrightness() {
  const brightnessValue = parseInt(brightnessRange.value, 10) / 100;
  const filterStr = `brightness(${brightnessValue})`;
  latestImg.style.filter = filterStr;
  loopImg.style.filter = filterStr;
  if (zoomImg) {
    zoomImg.style.filter = filterStr;
  }
  if (reImg) {
    reImg.style.filter = filterStr;
  }
}

/**
 * Update the timestamp overlay with the current local time.
 */
function updateTimestamp() {
  const now = new Date();
  // Format as mm/dd/yyyy HH:MM AM/PM in Pacific Time
  const options = {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const formatted = formatter.format(now);
  timestampEl.textContent = `Updated: ${formatted}`;
}

/**
 * Refresh the still image and the two‑hour loop by appending a cache‑busting
 * query parameter.  The remote server updates imagery every five minutes.
 */
function updateImages() {
  const cacheBuster = `?v=${Date.now()}`;
  latestImg.src = LATEST_URL + cacheBuster;
  loopImg.src = LOOP_URL + cacheBuster;
  if (zoomImg) {
    zoomImg.src = LATEST_URL + cacheBuster;
  }
  // Update RealEarth overhead image if element exists
  if (reImg) {
    // Append cache buster to ensure fresh imagery.  RealEarth caches on
    // the server side; the query parameter helps bust browser caches.
    const reUrl = buildRealEarthURL();
    reImg.src = `${reUrl}&v=${Date.now()}`;
  }
  // Immediately update the timestamp; onload will refine
  updateTimestamp();
}

// Event listeners
brightnessRange.addEventListener("input", applyBrightness);

// Listen for pan slider changes to update crop position
if (panXRange && panYRange) {
  panXRange.addEventListener("input", updateZoomPan);
  panYRange.addEventListener("input", updateZoomPan);
}

// When the latest image loads, update the timestamp overlay using the image's
// request time (approximate).  Some browsers cache aggressively even with
// cache‑busters, so we update regardless.
latestImg.addEventListener("load", updateTimestamp);

// Initial brightness setting based on local time (nighttime gets a boost)
function initializeBrightness() {
  const now = new Date();
  const hourLocal = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });
  const hour = parseInt(hourLocal, 10);
  // Daytime roughly between 6 and 20 local time
  const defaultBrightness = hour >= 6 && hour <= 20 ? 120 : 160;
  brightnessRange.value = defaultBrightness;
  applyBrightness();
}

// Kick things off
initializeBrightness();

// Start an aligned refresh cycle.  This function synchronizes updates
// to just after each five‑minute boundary, accounting for the time required
// for NOAA and RealEarth to process new frames.  A 20‑second cushion is
// added to ensure the new image is available before fetching.
function startAlignedRefresh() {
  // Fetch images immediately
  updateImages();
  // Compute milliseconds until the next 5‑minute mark plus 20‑second cushion
  const now = new Date();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();
  const utcMs = now.getUTCMilliseconds();
  const minutesUntilNext = 5 - (utcMinutes % 5);
  let delay = minutesUntilNext * 60 * 1000 - utcSeconds * 1000 - utcMs;
  // Add cushion so we fetch after the next frame is likely available
  delay += 20000;
  // Clamp to at least 60 seconds to avoid extremely rapid refreshes when
  // launching close to a boundary
  delay = Math.max(delay, 60 * 1000);
  setTimeout(startAlignedRefresh, delay);
}

// Initialize pan position to match CSS default if zoom image and controls exist
if (zoomImg && panXRange && panYRange) {
  updateZoomPan();
}

// Begin the aligned refresh loop
startAlignedRefresh();