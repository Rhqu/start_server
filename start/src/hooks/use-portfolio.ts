import { useQuery } from "@tanstack/react-query";
import { getPortfolio } from "@/lib/qplix";

export { type Asset, type Portfolio } from "@/lib/qplix";

export const portfolioQueryOptions = {
  queryKey: ["portfolio"],
  queryFn: () => getPortfolio(),
  staleTime: 5 * 60 * 1000,
};

export function usePortfolio() {
  return useQuery(portfolioQueryOptions);
}
