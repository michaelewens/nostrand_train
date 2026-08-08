import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { setupVite, serveStatic, log } from "./vite";
import { fetchDepartures } from "./transit";
import { fetchWeather } from "./weather";

(async () => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // API Routes
  app.get("/ping", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
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
        minute: "2-digit",
      }).format(now);

      res.set("Cache-Control", "public, max-age=20");
      res.json({
        version: 1,
        station: { name: "Nostrand Av", direction: "Manhattan", stopId: "A46N" },
        generatedAt: Math.floor(now / 1000),
        updated: localTime,
        trains: departures.slice(0, 4).map((departure) => ({
          ...departure,
          minutes: Math.max(0, Math.floor((departure.arrivalTime * 1000 - now) / 60_000)),
        })),
        weather: weatherResult[0].status === "fulfilled" ? weatherResult[0].value : null,
      });
    } catch (error) {
      console.error("Error building display payload:", error);
      res.status(503).json({ error: "Display data is temporarily unavailable" });
    }
  });

  const server = createServer(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error('Error in request:', err);
    res.status(status).json({ message });
  });

  // Setup Vite in development
  if (process.env.NODE_ENV === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
