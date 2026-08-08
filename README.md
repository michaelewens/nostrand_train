# Nostrand train display

Live Manhattan-bound A/C arrivals at Nostrand Ave, now with a dedicated e-paper client for the Elecrow **CrowPanel ESP32 5.79-inch** display (DIS08792E, 792×272 black/white).

## How it works

The Express server reads live departures from Transiter and Brooklyn weather from Open-Meteo. The CrowPanel requests one compact payload from `GET /api/display`, renders four upcoming trains plus weather, and refreshes once per minute.

```text
Transiter ─┐
           ├─ nostrand_train /api/display ─Wi-Fi─ CrowPanel e-paper
Open-Meteo ┘
```

Example payload:

```json
{
  "version": 1,
  "station": { "name": "Nostrand Ave", "direction": "Manhattan", "stopId": "A46N" },
  "updated": "8:42 AM",
  "trains": [
    { "route": "A", "destination": "Inwood-207 St", "arrivalTime": 1786207680, "minutes": 3 }
  ],
  "stale": false,
  "weather": {
    "temperatureF": 72,
    "apparentF": 73,
    "highF": 78,
    "lowF": 63,
    "precipitationChance": 20,
    "condition": "Partly cloudy",
    "weatherCode": 2
  }
}
```

Weather is allowed to fail independently; train data remains available and the display shows `WEATHER --`. The server validates both upstream feeds, coalesces concurrent requests, caches train data briefly, and can serve the last recent result through a short Transiter outage. A stale response is labeled on the e-paper screen.

## Run the server

```bash
npm install
npm run dev
```

The server listens on port 5000 by default. Test the display endpoint at [http://localhost:5000/api/display](http://localhost:5000/api/display). On macOS, AirPlay Receiver may already own port 5000; use `PORT=5055 npm run dev` and put that port in the firmware URL. Optional environment variables are `PORT`, `TRANSITER_API_BASE`, `WEATHER_LATITUDE`, and `WEATHER_LONGITUDE`.

## Program the CrowPanel

The complete PlatformIO project, captive-portal Wi-Fi setup, exact board pins, and flashing instructions are in [`firmware/README.md`](firmware/README.md). It uses the live backend at `https://nostrand.up.railway.app` by default.

The ESP32 must remain powered to fetch updates. It can use a USB wall adapter instead of a computer; an unpowered e-paper panel simply retains its last image.

## Checks

```bash
npm test
npm run check
npm run build
cd firmware && pio run
```
