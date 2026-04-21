import type { SendProgress } from './bulkEmailTypes'

type BulkEmailSendingProps = {
  progress: SendProgress
}

export function BulkEmailSending({ progress }: BulkEmailSendingProps): React.JSX.Element {
  const processed = progress.sent + progress.failed + progress.skipped
  const percent = progress.total > 0 ? (processed / progress.total) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mb-2 text-sm text-gray-500">
          Sending to {progress.current}...
        </div>
        <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <ProgressCounts progress={progress} />
      </div>
    </div>
  )
}

type BulkEmailDoneProps = {
  progress: SendProgress
}

export function BulkEmailDone({ progress }: BulkEmailDoneProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-emerald-50 p-4 text-center">
        <div className="font-display text-lg font-medium text-emerald-600">
          Bulk email complete
        </div>
        <ProgressCounts progress={progress} />
      </div>

      {progress.skippedList.length > 0 && (
        <div>
          <h4 className="mb-1 text-sm font-medium text-gray-500">
            Skipped ({progress.skippedList.length})
          </h4>
          <div className="max-h-40 overflow-y-auto rounded border border-gray-300 text-sm">
            {progress.skippedList.map((s, i) => (
              <div
                key={i}
                className="flex justify-between border-b border-gray-200 px-3 py-1.5 last:border-0"
              >
                <span className="text-gray-700">{s.artist}</span>
                <span className="text-gray-400">{s.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {progress.errors.length > 0 && (
        <div>
          <h4 className="mb-1 text-sm font-medium text-red-600">
            Errors ({progress.errors.length})
          </h4>
          <div className="max-h-40 overflow-y-auto rounded border border-red-500/20 text-sm">
            {progress.errors.map((e, i) => (
              <div
                key={i}
                className="flex justify-between border-b border-red-500/10 px-3 py-1.5 last:border-0"
              >
                <span className="text-gray-700">{e.artist}</span>
                <span className="text-red-600">{e.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProgressCounts({ progress }: { progress: SendProgress }): React.JSX.Element {
  return (
    <div className="mt-2 flex justify-center gap-4 text-sm font-mono">
      <span className="text-emerald-600">{progress.sent} sent</span>
      <span className="text-amber-600">{progress.skipped} skipped</span>
      <span className="text-red-600">{progress.failed} failed</span>
    </div>
  )
}
