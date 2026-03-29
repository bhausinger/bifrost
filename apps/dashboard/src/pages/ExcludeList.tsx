import { useState } from 'react'
import { useExcludedArtists, useRestoreArtist } from '@/hooks/useExcludeList'

const REASON_LABELS: Record<string, string> = {
  opt_out: 'Opted out',
  bounced: 'Email bounced',
  spam_report: 'Spam report',
  unsubscribed: 'Unsubscribed',
  manual: 'Manual',
}

export function ExcludeList() {
  const { data: excluded, isLoading } = useExcludedArtists()
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
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or reason..."
          className="input-field w-full max-w-md"
        />
      </div>

      <div className="flex-1 overflow-auto px-6">
        {isLoading ? (
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
                        <button
                          onClick={async () => {
                            await restoreArtist.mutateAsync(entry.id)
                            setConfirmRestore(null)
                          }}
                          className="rounded bg-emerald-500 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-400 transition-all"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmRestore(null)}
                          className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-all"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRestore(entry.id)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-300 transition-colors"
                      >
                        Restore
                      </button>
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
