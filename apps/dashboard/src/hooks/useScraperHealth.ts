import { useQuery } from '@tanstack/react-query'
import { scraperHealthCheck } from '@/lib/api/scraper'

const SCRAPER_POLL_INTERVAL_MS = 30_000

type HealthCheckResult = {
  ok: boolean
  latencyMs: number
}

export function useScraperHealth(): ReturnType<typeof useQuery<HealthCheckResult>> {
  return useQuery({
    queryKey: ['scraper-health'],
    queryFn: scraperHealthCheck,
    refetchInterval: SCRAPER_POLL_INTERVAL_MS,
  })
}
