import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "node:http";
import { buildDisplayPayload } from "./display";
import { fetchDepartureSnapshot } from "./transit";
import { fetchWeather } from "./weather";
import { log, serveStatic } from "./static";

const app = express();

app.get("/ping", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/departures", async (_req, res) => {
  try {
    const snapshot = await fetchDepartureSnapshot();
    res.set({
      "Cache-Control": "public, max-age=10, stale-while-revalidate=20",
      "X-Data-Updated-At": String(snapshot.fetchedAt),
      "X-Data-Stale": String(snapshot.stale),
    });
    res.json(snapshot.departures);
  } catch (error) {
    console.error("Error fetching train data:", error);
    res.status(503).json({ error: "Train data is temporarily unavailable" });
  }
});

app.get("/api/display", async (_req, res) => {
  const [departuresResult, weatherResult] = await Promise.allSettled([
    fetchDepartureSnapshot(),
    fetchWeather(),
  ]);

  if (departuresResult.status === "rejected") {
    console.error("Error building display payload:", departuresResult.reason);
    res.status(503).json({ error: "Display data is temporarily unavailable" });
    return;
  }

  if (weatherResult.status === "rejected") {
    console.warn("Weather unavailable for display payload:", weatherResult.reason);
  }

  res.set("Cache-Control", "public, max-age=10, stale-while-revalidate=20");
  res.json(buildDisplayPayload(
    departuresResult.value,
    weatherResult.status === "fulfilled" ? weatherResult.value : null,
  ));
});

const server = createServer(app);

if (process.env.NODE_ENV === "development") {
  const { setupVite } = await import("./vite");
  await setupVite(app, server);
} else {
  serveStatic(app);
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled request error:", error);
  res.status(500).json({ message: "Internal Server Error" });
});

const port = Number.parseInt(process.env.PORT || "5000", 10);
server.listen(port, "0.0.0.0", () => {
  log(`serving on port ${port}`);
});
