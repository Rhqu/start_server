import { useQuery } from "@tanstack/react-query";
import { getPortfolioTimeseries } from "@/lib/qplix";

export { type PortfolioTimeseries, type TimeseriesDataPoint } from "@/lib/qplix";

export const portfolioTimeseriesQueryOptions = {
  queryKey: ["portfolio-timeseries"],
  queryFn: () => getPortfolioTimeseries(),
  staleTime: 25 * 60 * 1000,
};

export function usePortfolioTimeseries() {
  const query = useQuery(portfolioTimeseriesQueryOptions);
  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
  };
}
