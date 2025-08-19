# Bay Area Fog Visualizer – Setup Guide

This project contains a static web page that visualizes fog and low cloud
conditions over the San Francisco Bay Area.  It combines **NOAA GOES‑19
GeoColor** imagery with map‑projected tiles from the University of
Wisconsin’s **RealEarth** platform.  The site updates itself
automatically every five minutes, aligns refreshes to the ABI scan
cadence and includes a brightness slider for nighttime viewing.

## Files

* `index.html` – markup for the page, including sections for the latest
  still image, a two‑hour animated loop and a Leaflet map that displays
  RealEarth tiles.
* `style.css` – dark‑themed styling and responsive layout.
* `script.js` – JavaScript that fetches imagery, schedules updates,
  builds the RealEarth tile URL with your access key, initializes a
  Leaflet map and applies brightness filters.
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

The “Overhead (RealEarth tiles)” section uses RealEarth’s tile
pyramid instead of a single composite.  Each tile is 256×256 pixels
and is requested on the fly via Leaflet.  To use this feature without
watermarks you must **register a free RealEarth account** and attach
your access key to each tile request:

1. Visit the RealEarth **[registration page](https://realearth.ssec.wisc.edu/user/tools/register)** and create an account.  Registration is free and only requires basic contact information.
2. In **User Tools**, create an **Access Key**.  RealEarth will show a long string of letters and numbers; copy it.
3. Still in **User Tools**, open the **Allowed IPs/Referrers** dialog and add your site’s domain (e.g. `glaziermag.github.io` and `glaziermag.github.io/fog-watch`).  This ensures RealEarth honours requests from your site【704582725459236†L7-L16】.
4. Open `script.js` and set `REALEARTH_ACCESS_KEY` to your key.  The script
   automatically appends the key to each tile request using the **`accesskey`**
   query parameter (the format RealEarth requires).  For example:

   ```js
   const REALEARTH_ACCESS_KEY = 'xxxxxx';
   ```

5. Choose your RealEarth product by editing `RE_PRODUCT` in `script.js`.  Good options are:
   * `G18-ABI-CONUS-fog` – Fog RGB (shows low clouds and fog, especially at night).
   * `G18-ABI-CONUS-geo-color` – True-color day and IR at night.
   * `G18-ABI-CONUS-night-microphysics` – Enhanced night fog contrast.

Tiles will load automatically every five minutes.  If you leave the
access key empty or do not register your domain, RealEarth will return
watermarks or an error message.

## Imagery sources and update frequency

* **Latest still image** and **two‑hour loop** – The page fetches the
  latest GOES‑19 GeoColor JPEG and a two‑hour animated GIF from NOAA’s
  public STAR CDN.  These images are updated every **five minutes** for
  sectors like the Pacific Southwest (PSW).  The JavaScript appends a
  cache‑busting timestamp and synchronizes refreshes to five‑minute
  boundaries with a 20 second cushion.
* **RealEarth tiles** – Leaflet requests 256×256 tiles from RealEarth’s
  tile server.  This yields a true overhead view that you can pan and
  zoom.  Each tile request attaches your access key for watermark‑free
  imagery.  The map refreshes every five minutes in sync with the
  latest NOAA images.

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
