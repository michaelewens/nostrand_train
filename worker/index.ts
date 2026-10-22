// Cloudflare Workers entry point. Mirrors server/index.ts (Express) route for route.
// Static files in dist/public are served by Workers static assets; this handler runs
// first on every request (see wrangler.jsonc) and falls back to index.html like Express.
import { buildDisplayPayload } from "../server/display";
import { fetchDepartureSnapshot } from "../server/transit";
import { fetchWeather } from "../server/weather";

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

async function departures(): Promise<Response> {
  try {
    const snapshot = await fetchDepartureSnapshot();
    return json(snapshot.departures, 200, {
      "Cache-Control": "public, max-age=10, stale-while-revalidate=20",
      "X-Data-Updated-At": String(snapshot.fetchedAt),
      "X-Data-Stale": String(snapshot.stale),
    });
  } catch (error) {
    console.error("Error fetching train data:", error);
    return json({ error: "Train data is temporarily unavailable" }, 503);
  }
}

async function display(): Promise<Response> {
  const [departuresResult, weatherResult] = await Promise.allSettled([
    fetchDepartureSnapshot(),
    fetchWeather(),
  ]);

  if (departuresResult.status === "rejected") {
    console.error("Error building display payload:", departuresResult.reason);
    return json({ error: "Display data is temporarily unavailable" }, 503);
  }

  if (weatherResult.status === "rejected") {
    console.warn("Weather unavailable for display payload:", weatherResult.reason);
  }

  return json(
    buildDisplayPayload(
      departuresResult.value,
      weatherResult.status === "fulfilled" ? weatherResult.value : null,
    ),
    200,
    { "Cache-Control": "public, max-age=10, stale-while-revalidate=20" },
  );
}

async function spaFallback(request: Request, env: Env): Promise<Response> {
  // Express answers every unmatched path (any method) with index.html.
  const asset = await env.ASSETS.fetch(new Request(new URL("/", request.url), { method: "GET" }));
  return new Response(asset.body, { status: 200, headers: asset.headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const { pathname } = new URL(request.url);
      const isGet = request.method === "GET" || request.method === "HEAD";

      if (isGet && pathname === "/ping") {
        return json({ status: "ok", timestamp: new Date().toISOString() });
      }
      if (isGet && pathname === "/api/departures") return await departures();
      if (isGet && pathname === "/api/display") return await display();

      if (isGet) {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status !== 404) return asset;
      }
      return await spaFallback(request, env);
    } catch (error) {
      console.error("Unhandled request error:", error);
      return json({ message: "Internal Server Error" }, 500);
    }
  },
};
