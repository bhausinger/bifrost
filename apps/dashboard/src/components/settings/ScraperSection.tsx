type ScraperSectionProps = {
  isLoading: boolean
  isOnline: boolean
  latencyMs: number
}

export function ScraperSection({
  isLoading,
  isOnline,
  latencyMs,
}: ScraperSectionProps): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <svg
            className="h-5 w-5 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">Scraper</div>
          <div className="text-xs text-gray-400">
            {isOnline ? `Connected (${latencyMs}ms)` : 'SoundCloud discovery and scraping service'}
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500" />
      ) : isOnline ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 ring-1 ring-inset ring-emerald-600/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Connected
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600/20">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Offline
        </span>
      )}
    </div>
  )
}
