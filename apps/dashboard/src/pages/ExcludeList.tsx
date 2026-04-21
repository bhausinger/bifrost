import { useState } from 'react'
import { useExcludedArtists, useRestoreArtist } from '@/hooks/useExcludeList'
import { Input, Button } from '@/components/ui'

const REASON_LABELS: Record<string, string> = {
  opt_out: 'Opted out',
  bounced: 'Email bounced',
  spam_report: 'Spam report',
  unsubscribed: 'Unsubscribed',
  manual: 'Manual',
}

export function ExcludeList() {
  const { data: excluded, isLoading, error } = useExcludedArtists()
  const restoreArtist = useRestoreArtist()
  const [search, setSearch] = useState('')
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)

  const filtered = excluded?.filter(
    (e) =>
      e.artist_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.reason.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">Exclude List</h1>
          <p className="text-sm text-gray-500">
            {excluded?.length ?? 0} artists excluded from outreach
          </p>
        </div>
      </div>

      <div className="px-6 py-3">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or reason..."
          className="max-w-md"
        />
      </div>

      <div className="flex-1 overflow-auto px-6">
        {error ? (
          <div className="my-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm font-medium text-red-600">Failed to load exclude list</p>
            <p className="mt-1 text-xs text-red-400">{error.message}</p>
          </div>
        ) : isLoading ? (
          <div className="py-8 text-center text-gray-400">Loading...</div>
        ) : filtered?.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            {search ? 'No matches found' : 'No excluded artists'}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Artist</th>
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Email</th>
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Reason</th>
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Notes</th>
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400"></th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((entry) => (
                <tr key={entry.id} className="table-row">
                  <td className="py-2 px-2 text-gray-900">{entry.artist_name ?? '-'}</td>
                  <td className="py-2 px-2 text-gray-500">{entry.email ?? '-'}</td>
                  <td className="py-2 px-2">
                    <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600/20">
                      {REASON_LABELS[entry.reason] ?? entry.reason}
                    </span>
                  </td>
                  <td className="max-w-xs truncate py-2 px-2 text-gray-400">
                    {entry.notes ?? '-'}
                  </td>
                  <td className="py-2 px-2 text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {confirmRestore === entry.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="primary"
                          onClick={async () => {
                            await restoreArtist.mutateAsync(entry.id)
                            setConfirmRestore(null)
                          }}
                          className="px-2 py-1 text-xs"
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setConfirmRestore(null)}
                          className="px-2 py-1 text-xs"
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmRestore(entry.id)}
                        className="text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        Restore
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
