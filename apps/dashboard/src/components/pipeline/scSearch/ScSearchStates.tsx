export function SearchingState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative mb-8">
        <div
          className="absolute inset-0 animate-ping rounded-full bg-[#ff5500]/10"
          style={{ animationDuration: '2s' }}
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5500] to-amber-500 shadow-lg shadow-[#ff5500]/25">
          <svg
            className="h-8 w-8 animate-spin text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Searching SoundCloud</h3>
      <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
        Looking up artist profiles by name. This may take a minute for large lists.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff5500]" />
        Rate-limited to avoid SoundCloud blocks
      </div>
    </div>
  )
}

export function ScrapingState({
  progress,
  liveFeed,
  feedRef,
}: {
  progress: { done: number; total: number; emailsFound: number; eta: string }
  liveFeed: Array<{ name: string; hasEmail: boolean }>
  feedRef: React.RefObject<HTMLDivElement>
}): React.JSX.Element {
  return (
    <div className="space-y-6 py-8 text-center">
      <div>
        <div className="mb-2 font-mono text-2xl font-bold text-gray-900">
          {progress.done} / {progress.total}
        </div>
        <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-[#ff5500] transition-all"
            style={{
              width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-400">ETA: {progress.eta}</div>
      </div>
      <div className="flex justify-center gap-8 text-sm">
        <div>
          <div className="font-mono text-lg font-bold text-emerald-600">{progress.emailsFound}</div>
          <div className="text-gray-400">Emails Found</div>
        </div>
        <div>
          <div className="font-mono text-lg font-bold text-gray-400">
            {progress.done - progress.emailsFound}
          </div>
          <div className="text-gray-400">No Email</div>
        </div>
      </div>
      {liveFeed.length > 0 && (
        <div
          ref={feedRef}
          className="mx-auto max-w-md max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-3 text-left text-xs"
        >
          {liveFeed.map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className={item.hasEmail ? 'text-emerald-500' : 'text-gray-300'}>
                {item.hasEmail ? '\u2713' : '\u2717'}
              </span>
              <span className="text-gray-600">{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ImportingState({
  progress,
}: {
  progress: { done: number; total: number }
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="text-4xl font-bold tracking-tight text-gray-900">
        {progress.done}
        <span className="text-gray-300"> / </span>
        <span className="text-gray-400">{progress.total}</span>
      </div>
      <p className="mt-1 text-xs text-gray-400">artists imported</p>
      <div className="mx-auto mt-6 w-full max-w-md">
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-500">Adding artists to your pipeline...</p>
    </div>
  )
}

export function DoneState({
  results,
}: {
  results: { imported: number; skipped: number; failed: number }
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
        <svg
          className="h-8 w-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900">Import Complete</h3>
      <p className="mt-1 text-sm text-gray-500">Artists have been added to your pipeline</p>
      <div className="mt-8 flex gap-4">
        <div className="flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50 px-8 py-4">
          <span className="text-2xl font-bold text-emerald-600">{results.imported}</span>
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-500">
            Imported
          </span>
        </div>
        {results.skipped > 0 && (
          <div className="flex flex-col items-center rounded-xl border border-amber-200 bg-amber-50 px-8 py-4">
            <span className="text-2xl font-bold text-amber-600">{results.skipped}</span>
            <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-amber-500">
              Skipped
            </span>
          </div>
        )}
        {results.failed > 0 && (
          <div className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-8 py-4">
            <span className="text-2xl font-bold text-red-600">{results.failed}</span>
            <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-red-500">
              Failed
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
