// server/index.ts
import express2 from "express";
import { createServer } from "http";

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/transit.ts
var TRANSITER_API_BASE = process.env.TRANSITER_API_BASE || "https://demo.transiter.dev";
var SYSTEM_ID = "us-ny-subway";
var NOSTRAND_STOP_ID = "A46N";
function transformDepartures(data, nowSeconds = Math.floor(Date.now() / 1e3)) {
  return (data.stopTimes || []).filter((stopTime) => {
    const route = stopTime.trip?.route?.id;
    return route === "A" || route === "C";
  }).map((stopTime) => ({
    route: stopTime.trip.route.id,
    destination: stopTime.trip.destination?.name || "Manhattan",
    arrivalTime: Number.parseInt(stopTime.arrival?.time || stopTime.departure?.time, 10)
  })).filter(
    (departure) => Number.isFinite(departure.arrivalTime) && departure.arrivalTime >= nowSeconds - 30
  ).sort((a, b) => a.arrivalTime - b.arrivalTime).slice(0, 10);
}
async function fetchDepartures() {
  const response = await fetch(
    `${TRANSITER_API_BASE}/systems/${SYSTEM_ID}/stops/${NOSTRAND_STOP_ID}`,
    { signal: AbortSignal.timeout(8e3) }
  );
  if (!response.ok) {
    throw new Error(`Transiter API error: ${response.status} ${response.statusText}`);
  }
  return transformDepartures(await response.json());
}

// server/weather.ts
var LATITUDE = process.env.WEATHER_LATITUDE || "40.6804";
var LONGITUDE = process.env.WEATHER_LONGITUDE || "-73.9496";
var CACHE_TTL_MS = 10 * 60 * 1e3;
var cache;
function weatherCondition(code) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorms";
  return "Unsettled";
}
function transformWeather(data) {
  const current = data.current || {};
  const daily = data.daily || {};
  const weatherCode = Number(current.weather_code);
  return {
    temperatureF: Math.round(Number(current.temperature_2m)),
    apparentF: Math.round(Number(current.apparent_temperature)),
    highF: Math.round(Number(daily.temperature_2m_max?.[0])),
    lowF: Math.round(Number(daily.temperature_2m_min?.[0])),
    precipitationChance: Math.round(Number(daily.precipitation_probability_max?.[0] || 0)),
    condition: weatherCondition(weatherCode),
    weatherCode
  };
}
async function fetchWeather() {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  const params = new URLSearchParams({
    latitude: LATITUDE,
    longitude: LONGITUDE,
    current: "temperature_2m,apparent_temperature,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "fahrenheit",
    timezone: "America/New_York",
    forecast_days: "1"
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: AbortSignal.timeout(8e3)
  });
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }
  const value = transformWeather(await response.json());
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

// server/index.ts
(async () => {
  const app = express2();
  app.use(express2.json());
  app.use(express2.urlencoded({ extended: false }));
  app.get("/ping", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/departures", async (req, res) => {
    try {
      res.json(await fetchDepartures());
    } catch (error) {
      console.error("Error fetching train data:", error);
      res.status(500).json({ error: "Failed to fetch train departures" });
    }
  });
  app.get("/api/display", async (_req, res) => {
    try {
      const departures = await fetchDepartures();
      const weatherResult = await Promise.allSettled([fetchWeather()]);
      const now = Date.now();
      const localTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit"
      }).format(now);
      res.set("Cache-Control", "public, max-age=20");
      res.json({
        version: 1,
        station: { name: "Nostrand Av", direction: "Manhattan", stopId: "A46N" },
        generatedAt: Math.floor(now / 1e3),
        updated: localTime,
        trains: departures.slice(0, 4).map((departure) => ({
          ...departure,
          minutes: Math.max(0, Math.floor((departure.arrivalTime * 1e3 - now) / 6e4))
        })),
        weather: weatherResult[0].status === "fulfilled" ? weatherResult[0].value : null
      });
    } catch (error) {
      console.error("Error building display payload:", error);
      res.status(503).json({ error: "Display data is temporarily unavailable" });
    }
  });
  const server = createServer(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Error in request:", err);
    res.status(status).json({ message });
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
