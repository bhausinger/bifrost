import { useState } from 'react'
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAgencies, useCreateAgency, useUpdateAgency, useDeleteAgency } from '@/hooks/useAgencies'
import { useArtists } from '@/hooks/useArtists'
import { Button, Input, Label, Modal } from '@/components/ui'
import type { Agency } from '@/types'

export function AgencyTab({ onAgencyClick }: { onAgencyClick: (id: string) => void }): JSX.Element {
  const { data: agencies, isLoading } = useAgencies()
  const { data: artists } = useArtists()
  const createAgency = useCreateAgency()
  const updateAgency = useUpdateAgency()
  const deleteAgency = useDeleteAgency()
  const [editing, setEditing] = useState<Agency | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Agency | null>(null)

  // Count artists per agency
  const artistCounts = new Map<string, number>()
  for (const a of artists ?? []) {
    if (a.agency?.id) {
      artistCounts.set(a.agency.id, (artistCounts.get(a.agency.id) ?? 0) + 1)
    }
  }

  if (isLoading) {
    return (
      <div className="card p-12 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500" />
        <div className="mt-3 text-sm text-gray-400">Loading agencies...</div>
      </div>
    )
  }

  if (!agencies || agencies.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Building2 className="mx-auto h-10 w-10 text-gray-300" />
        <div className="mt-3 text-sm font-medium text-gray-700">No agencies yet</div>
        <div className="mt-1 text-xs text-gray-400">
          Add your first agency to start tracking management companies.
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAdd(true)}
          className="mt-4 inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Agency
        </Button>
        <AddAgencyModal open={showAdd} onClose={() => setShowAdd(false)} onCreate={createAgency} />
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          variant="primary"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Agency
        </Button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-white">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Agency
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Contact
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">
                Artists
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400" />
            </tr>
          </thead>
          <tbody>
            {agencies.map((agency) => (
              <tr key={agency.id} className="table-row">
                <td className="px-4 py-3">
                  <button
                    onClick={() => onAgencyClick(agency.id)}
                    className="font-medium text-gray-900 hover:text-teal-600 hover:underline"
                  >
                    {agency.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500">{agency.contact_name ?? '-'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {agency.email ? (
                    <a href={`mailto:${agency.email}`} className="text-teal-600 hover:underline">
                      {agency.email}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-600">
                    {artistCounts.get(agency.id) ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => setEditing(agency)}
                      className="p-1.5 text-gray-400 hover:text-gray-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmDelete(agency)}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditAgencyModal
          agency={editing}
          onClose={() => setEditing(null)}
          onSave={async (updates) => {
            await updateAgency.mutateAsync({ id: editing.id, ...updates })
            setEditing(null)
          }}
          isPending={updateAgency.isPending}
        />
      )}

      <AddAgencyModal open={showAdd} onClose={() => setShowAdd(false)} onCreate={createAgency} />

      {confirmDelete && (
        <Modal
          open
          onClose={() => setConfirmDelete(null)}
          title={`Delete "${confirmDelete.name}"?`}
        >
          <p className="text-sm text-gray-600">
            This will unlink {artistCounts.get(confirmDelete.id) ?? 0} artists from this agency. The
            artists themselves will not be deleted.
          </p>
          <div className="mt-4 flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                await deleteAgency.mutateAsync(confirmDelete.id)
                setConfirmDelete(null)
              }}
              disabled={deleteAgency.isPending}
              className="flex-1 !bg-red-600 hover:!bg-red-700"
            >
              {deleteAgency.isPending ? 'Deleting...' : 'Delete Agency'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

function AddAgencyModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: ReturnType<typeof useCreateAgency>
}): JSX.Element {
  return (
    <Modal open={open} onClose={onClose} title="Add Agency">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          await onCreate.mutateAsync({
            name: (form.get('name') as string).trim(),
            contact_name: (form.get('contact_name') as string).trim() || undefined,
            email: (form.get('email') as string).trim() || undefined,
            notes: (form.get('notes') as string).trim() || undefined,
          })
          onClose()
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="add-agency-name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input id="add-agency-name" name="name" placeholder="e.g. No Mercy Records" required />
        </div>
        <div>
          <Label htmlFor="add-agency-contact" optional>
            Contact Name
          </Label>
          <Input id="add-agency-contact" name="contact_name" placeholder="e.g. John Doe" />
        </div>
        <div>
          <Label htmlFor="add-agency-email" optional>
            Email
          </Label>
          <Input id="add-agency-email" name="email" type="email" placeholder="agency@example.com" />
        </div>
        <div>
          <Label htmlFor="add-agency-notes" optional>
            Notes
          </Label>
          <Input id="add-agency-notes" name="notes" placeholder="Optional notes..." />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={onCreate.isPending} className="flex-1">
            {onCreate.isPending ? 'Adding...' : 'Add Agency'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function EditAgencyModal({
  agency,
  onClose,
  onSave,
  isPending,
}: {
  agency: Agency
  onClose: () => void
  onSave: (updates: Partial<Agency>) => Promise<void>
  isPending: boolean
}): JSX.Element {
  return (
    <Modal open onClose={onClose} title="Edit Agency">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          await onSave({
            name: (form.get('name') as string).trim(),
            contact_name: (form.get('contact_name') as string).trim() || null,
            email: (form.get('email') as string).trim() || null,
            notes: (form.get('notes') as string).trim() || null,
          })
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="edit-agency-name">Name</Label>
          <Input id="edit-agency-name" name="name" defaultValue={agency.name} required />
        </div>
        <div>
          <Label htmlFor="edit-agency-contact" optional>
            Contact Name
          </Label>
          <Input
            id="edit-agency-contact"
            name="contact_name"
            defaultValue={agency.contact_name ?? ''}
          />
        </div>
        <div>
          <Label htmlFor="edit-agency-email" optional>
            Email
          </Label>
          <Input
            id="edit-agency-email"
            name="email"
            type="email"
            defaultValue={agency.email ?? ''}
          />
        </div>
        <div>
          <Label htmlFor="edit-agency-notes" optional>
            Notes
          </Label>
          <Input id="edit-agency-notes" name="notes" defaultValue={agency.notes ?? ''} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending} className="flex-1">
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
