import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useExcludedArtists, useManualExclude, useRestoreArtist } from '@/hooks/useExcludeList'
import { Input, Button, Modal, Label, Select } from '@/components/ui'

const REASON_LABELS: Record<string, string> = {
  opt_out: 'Opted out',
  bounced: 'Email bounced',
  spam_report: 'Spam report',
  unsubscribed: 'Unsubscribed',
  manual: 'Manual',
}

const REASON_OPTIONS = [
  { value: 'opt_out', label: 'Opted out' },
  { value: 'bounced', label: 'Email bounced' },
  { value: 'spam_report', label: 'Spam report' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'manual', label: 'Manual' },
]

export function ExcludeList() {
  const { data: excluded, isLoading, error } = useExcludedArtists()
  const manualExclude = useManualExclude()
  const restoreArtist = useRestoreArtist()
  const [search, setSearch] = useState('')
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addError, setAddError] = useState('')
  const [addReason, setAddReason] = useState('opt_out')

  const filtered = excluded?.filter(
    (e) =>
      e.artist_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.reason.toLowerCase().includes(search.toLowerCase()),
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
        <Button
          variant="primary"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add to Exclude List
        </Button>
      </div>

      <Modal
        open={showAdd}
        onClose={() => {
          setShowAdd(false)
          setAddError('')
          setAddReason('opt_out')
        }}
        title="Add to Exclude List"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setAddError('')
            const form = new FormData(e.currentTarget)
            const email = (form.get('email') as string).trim()
            if (!email) return
            try {
              await manualExclude.mutateAsync({
                email,
                artistName: (form.get('artist_name') as string).trim() || undefined,
                reason: addReason,
                notes: (form.get('notes') as string).trim() || undefined,
              })
              setShowAdd(false)
              setAddReason('opt_out')
            } catch (err) {
              setAddError(err instanceof Error ? err.message : 'Failed to add')
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="exc-email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="exc-email"
              name="email"
              type="email"
              required
              placeholder="artist@example.com"
            />
          </div>
          <div>
            <Label htmlFor="exc-name" optional>
              Artist Name
            </Label>
            <Input id="exc-name" name="artist_name" placeholder="e.g. Tame Impala" />
          </div>
          <div>
            <Label htmlFor="exc-reason">Reason</Label>
            <Select value={addReason} onChange={setAddReason} options={REASON_OPTIONS} fullWidth />
          </div>
          <div>
            <Label htmlFor="exc-notes" optional>
              Notes
            </Label>
            <Input id="exc-notes" name="notes" placeholder="Optional context..." />
          </div>
          {addError && <p className="text-sm text-red-500">{addError}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAdd(false)
                setAddError('')
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={manualExclude.isPending}
              className="flex-1"
            >
              {manualExclude.isPending ? 'Adding...' : 'Add to Exclude List'}
            </Button>
          </div>
        </form>
      </Modal>

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
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Artist
                </th>
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Email
                </th>
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Reason
                </th>
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Notes
                </th>
                <th className="py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Date
                </th>
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
