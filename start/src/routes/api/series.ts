import { createFileRoute } from "@tanstack/react-router";
import { getPortfolioTimeseries } from "@/lib/qplix";

export const Route = createFileRoute("/api/series")({
  server: {
    handlers: {
      GET: async () => {
        const data = await getPortfolioTimeseries();
        return new Response(JSON.stringify(data, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
