# Bay Area Fog Visualizer – Setup Guide

This project contains a static web page that visualizes fog and low cloud
conditions over the San Francisco Bay Area using only map‑projected
tiles from the University of Wisconsin’s **RealEarth** platform.  Earlier
versions of this project included angled still images and animated
loops from NOAA; those have been removed so that the page now
displays a single, true overhead view of Northern California.  The
site automatically selects an appropriate satellite product for
daylight (GeoColor) or night (Night Microphysics), refreshes the
imagery every five minutes and offers a brightness slider for
nighttime viewing.

## Files

* `index.html` – markup for the page, including a brightness slider and
  a Leaflet map container.  The overhead map appears first on the page.
* `style.css` – dark‑themed styling and responsive layout.
* `script.js` – JavaScript that determines which RealEarth product to
  use (day vs. night), builds tile URLs with your access key,
  initializes a Leaflet map, refreshes the imagery every five
  minutes and manages brightness.
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

## RealEarth tiles (required for overhead)

The page uses RealEarth’s tile pyramid instead of a single composite.  Each
tile is 256×256 pixels and is requested on the fly via Leaflet.  To
use this feature without watermarks you must **register a free
RealEarth account** and attach your access key to each tile request:

1. Visit the RealEarth **[registration page](https://realearth.ssec.wisc.edu/user/tools/register)** and create an account.  Registration is free and only requires basic contact information.
2. In **User Tools**, create an **Access Key**.  RealEarth will show a long string of letters and numbers; copy it.
3. Still in **User Tools**, open the **Allowed IPs/Referrers** dialog and add your site’s domain (e.g. `glaziermag.github.io` and `glaziermag.github.io/fog-watch`).  This ensures RealEarth honours requests from your site【704582725459236†L7-L16】.
4. Open `script.js` and set `REALEARTH_ACCESS_KEY` to your key.  The script
   automatically appends the key to each tile request using the **`accesskey`**
   query parameter (the format RealEarth requires).  For example:

   ```js
   const REALEARTH_ACCESS_KEY = 'xxxxx';
   ```

Tiles will load automatically every five minutes.  If you leave the
access key empty or do not register your domain, RealEarth will
return watermarks or an error message.

The code automatically selects the product: it requests the
**GeoColor CONUS** product during daylight hours and the **Night
Microphysics** product after dark.  You can adjust the hour
thresholds or product IDs in `script.js` if you prefer a different
combination.

## Imagery source and update frequency

This version relies solely on RealEarth tiles.  Leaflet requests
256×256 tiles from RealEarth’s tile server for whichever product
applies at the current time.  Each request attaches your access key
for watermark‑free imagery.  The map refreshes itself every five
minutes in sync with the ABI scan cadence.  There are no separate
NOAA still or GIF files.

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
