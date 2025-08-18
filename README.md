# Bay Area Fog Visualizer – Setup Guide

This project contains a static web page that visualizes fog and low cloud
conditions over the San Francisco Bay Area.  It combines **NOAA GOES‑19
GeoColor** imagery with an optional overhead view provided by the
University of Wisconsin’s **RealEarth** API.  The site updates itself
automatically every five minutes and includes a brightness slider for
nighttime viewing.

## Files

* `index.html` – markup for the page, including sections for the latest
  still image, a RealEarth overhead view, a cropped zoom with pan
  controls, a two‑hour animated loop and brightness controls.
* `style.css` – dark‑themed styling and responsive layout.
* `script.js` – JavaScript that fetches imagery, schedules updates,
  applies brightness filters and handles pan/zoom controls.
* `README.md` – this document.

## Deployment

The site is completely static, so you can host it on any platform that
serves plain HTML/CSS/JS.  Examples include **GitHub Pages**, **Cloudflare
Pages**, **Netlify** and **Vercel**.  To deploy:

1. **Download and extract** the project (the folder contains the files listed above).
2. **Create a new repository** on GitHub (or your preferred host) and add
   the contents of the project folder.  Commit and push to your default
   branch (`main` or `master`).
3. **Enable GitHub Pages** in your repository settings, selecting the
   root of the branch as the source.  Within a minute or two, GitHub will
   provide a URL where your site is live.

For Netlify or Vercel, drag and drop the folder in their web UI or use
their CLI tools.  Because the site contains no server‑side code, all
hosting providers’ free tiers are sufficient.

## RealEarth overhead imagery (optional)

FogToday’s overhead view is generated via RealEarth, which
reprojects satellite data onto a map grid.  Anonymous RealEarth
requests have strict limits (512×512 pixels and 500 megapixels of data
per day), so to make full use of the “RealEarth Overhead” section you
should **register a free RealEarth account**:

1. Navigate to the RealEarth **[registration page](https://realearth.ssec.wisc.edu/user/tools/register)** and create an account.  Registration is free and only requires basic contact information.
2. Once logged in, click **User Tools** → **Access Keys** and create
   a new key.  RealEarth will show a long string of letters and
   numbers; copy it to your clipboard.
3. Add your site’s domain (e.g. `https://yourusername.github.io`) as an
   **allowed referrer** in the same User Tools panel.  This step
   ensures that RealEarth knows which sites are permitted to request
   imagery using your key.
4. Open `script.js` and locate the line:

   ```js
   const REALEARTH_ACCESS_KEY = "";
   ```

   Paste your key between the quotes.  For example:

   ```js
   const REALEARTH_ACCESS_KEY = "abcdef12345yourkey";
   ```

5. Optionally adjust the `REAL_EARTH_WIDTH` and `REAL_EARTH_HEIGHT`
   constants.  By default they are set to `800` pixels, well within
   RealEarth’s free tier (1024 px limit when logged in).  You may
   increase these values up to 1024 as long as you remain under
   RealEarth’s free quota.

Once configured, refresh the page in your browser.  The **RealEarth
Overhead** image should load without a watermark.  The site will
fetch a fresh overhead image every five minutes.  If RealEarth is not
reachable or your access key is missing, this section will simply
show a blank or watermarked image and the rest of the page will
continue to function.

### Understanding RealEarth limits

RealEarth’s free tier enforces several thresholds.  Anonymous
users are limited to **512×512 px** images and **500 megapixels
per day**.  Registered users (free) get **1024×1024 px** images and
1 gigapixel per day【501551649795786†L42-L45】.  You’ll see a watermark or grey
placeholder if you exceed these limits or if the site’s domain is not
registered as an allowed referrer【704582725459236†L7-L16】.  Upgrading to
RealEarth Plus removes watermarks and increases limits but is not
required for this project.

## Imagery sources and update frequency

* **Latest still image** and **two‑hour loop** – The page fetches the
  latest GOES‑19 GeoColor JPEG and a two‑hour animated GIF from NOAA’s
  public STAR CDN.  These images are updated every **five minutes** for
  sectors like the Pacific Southwest (PSW).  The JavaScript appends a
  cache‑busting timestamp and synchronizes refreshes to five‑minute
  boundaries with a 20 second cushion.
* **RealEarth overhead** – A single composite image combining the
  GeoColor and Fog products for GOES‑19 CONUS is requested from
  RealEarth’s `api/image` endpoint.  When properly configured, this
  provides a top‑down map‑projected view of the Bay Area updated on the
  same five‑minute cadence (but subject to RealEarth’s processing
  latency and throttling).
* **Overhead Zoom crop** – The page also displays a static crop of the
  NOAA GeoColor image with sliders that let you pan horizontally and
  vertically.  Use this view if RealEarth is unavailable or you want
  manual control.

## Customization

* **Change the region** – To visualize a different area, adjust the
  `REAL_EARTH_CENTER` coordinates (longitude, latitude) and `REAL_EARTH_ZOOM`
  in `script.js`.  For example, to center on Los Angeles, set
  `[-118.25, 34.05]`.
* **Adjust brightness** – The night brightness slider modifies the
  CSS `brightness()` filter applied to all images.  The code
  automatically sets a higher brightness at night (local time 6 pm to
  6 am) and lower brightness during the day.
* **Change refresh cadence** – By default the site refreshes every five
  minutes.  You can modify the timing logic in `script.js` to refresh
  at a different interval or to align with NOAA’s 10‑minute full‑disk
  schedule.

Enjoy your Bay Area Fog Visualizer!