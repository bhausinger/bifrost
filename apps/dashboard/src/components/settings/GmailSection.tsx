type GmailStatus = { connected: false } | { connected: true; email: string }

type GmailSectionProps = {
  status: GmailStatus
  isLoading: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export function GmailSection({
  status,
  isLoading,
  onConnect,
  onDisconnect,
}: GmailSectionProps): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
          <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">Gmail</div>
          <div className="text-xs text-gray-400">
            {status.connected
              ? `Connected as ${status.email}`
              : 'Send outreach emails from your Gmail'}
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500" />
      ) : status.connected ? (
        <button
          onClick={onDisconnect}
          className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 ring-1 ring-inset ring-emerald-600/20 hover:bg-red-50 hover:text-red-600 hover:ring-red-600/20 transition-all"
        >
          Connected
        </button>
      ) : (
        <button
          onClick={onConnect}
          className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100 transition-all cursor-pointer"
        >
          Connect
        </button>
      )}
    </div>
  )
}
