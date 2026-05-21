import { useState } from 'react'
import { Building2, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAgencies, useCreateAgency, useUpdateAgency, useDeleteAgency } from '@/hooks/useAgencies'
import { useArtists } from '@/hooks/useArtists'
import { Button, Input, Label, Modal } from '@/components/ui'
import type { Agency, Artist } from '@/types'

export function AgencyTab(): JSX.Element {
  const { data: agencies, isLoading } = useAgencies()
  const { data: artists } = useArtists()
  const createAgency = useCreateAgency()
  const updateAgency = useUpdateAgency()
  const deleteAgency = useDeleteAgency()
  const [editing, setEditing] = useState<Agency | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Agency | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Group artists by agency
  const artistsByAgency = new Map<string, typeof artists>()
  for (const a of artists ?? []) {
    if (a.agency?.id) {
      const list = artistsByAgency.get(a.agency.id) ?? []
      list.push(a)
      artistsByAgency.set(a.agency.id, list)
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
      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="spreadsheet">
          <thead>
            <tr>
              <th>Agency</th>
              <th>Contact</th>
              <th>Email</th>
              <th className="text-center">Artists</th>
              <th className="" />
            </tr>
          </thead>
          <tbody>
            {agencies.map((agency) => {
              const isExpanded = expandedId === agency.id
              const agencyArtists = artistsByAgency.get(agency.id) ?? []
              return (
                <AgencyRow
                  key={agency.id}
                  agency={agency}
                  artists={agencyArtists}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedId(isExpanded ? null : agency.id)}
                  onEdit={() => setEditing(agency)}
                  onDelete={() => setConfirmDelete(agency)}
                />
              )
            })}
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
            This will unlink {artistsByAgency.get(confirmDelete.id)?.length ?? 0} artists from this
            agency. The artists themselves will not be deleted.
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

function AgencyRow({
  agency,
  artists,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  agency: Agency
  artists: Artist[]
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}): JSX.Element {
  return (
    <>
      <tr className="cursor-pointer group" onClick={onToggle}>
        <td>
          <div className="flex items-center gap-2">
            <ChevronRight
              className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            <span className="font-medium text-gray-900">{agency.name}</span>
          </div>
        </td>
        <td className="text-gray-500">{agency.contact_name ?? '-'}</td>
        <td className="text-gray-500">
          {agency.email ? (
            <a
              href={`mailto:${agency.email}`}
              onClick={(e) => e.stopPropagation()}
              className="text-teal-600 hover:underline"
            >
              {agency.email}
            </a>
          ) : (
            '-'
          )}
        </td>
        <td className="text-center">
          <span className="text-gray-700">{artists.length}</span>
        </td>
        <td className="text-right">
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="p-1 rounded text-gray-400 hover:text-gray-600">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} className="p-1 rounded text-gray-400 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded &&
        (artists.length === 0 ? (
          <tr>
            <td colSpan={5} className="bg-gray-50/50 py-2 pl-10 text-xs text-gray-400">
              No artists under this agency
            </td>
          </tr>
        ) : (
          artists.map((artist) => (
            <tr key={artist.id} className="bg-gray-50/50">
              <td colSpan={2} style={{ paddingLeft: '2.5rem' }}>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <span className="text-sm text-gray-700">{artist.name}</span>
                </div>
              </td>
              <td className="text-xs text-gray-400">{artist.email ?? '-'}</td>
              <td className="text-center">
                {(artist.genres ?? []).length > 0 ? (
                  <span className="text-xs text-gray-400">
                    {(artist.genres ?? []).slice(0, 2).join(', ')}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">-</span>
                )}
              </td>
              <td />
            </tr>
          ))
        ))}
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
