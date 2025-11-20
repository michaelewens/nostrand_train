import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { setupVite, serveStatic, log } from "./vite";

const TRANSITER_API_BASE = "https://demo.transiter.dev";
const SYSTEM_ID = "us-ny-subway";
const NOSTRAND_STOP_ID = "A46N";

interface Departure {
  route: string;
  destination: string;
  arrivalTime: number;
}

(async () => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // API Routes
  app.get("/api/departures", async (req, res) => {
    try {
      const response = await fetch(
        `${TRANSITER_API_BASE}/systems/${SYSTEM_ID}/stops/${NOSTRAND_STOP_ID}`
      );

      if (!response.ok) {
        throw new Error(`Transiter API error: ${response.statusText}`);
      }

      const data = await response.json();

      const departures: Departure[] = (data.stopTimes || [])
        .filter((st: any) => {
          const route = st.trip?.route?.id;
          return route === "A" || route === "C";
        })
        .map((st: any) => ({
          route: st.trip.route.id,
          destination: st.trip.destination?.name || "Manhattan",
          arrivalTime: parseInt(st.arrival?.time || st.departure?.time),
        }))
        .slice(0, 10);

      res.json(departures);
    } catch (error) {
      console.error("Error fetching train data:", error);
      res.status(500).json({ error: "Failed to fetch train departures" });
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
