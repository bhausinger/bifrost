import { useState } from 'react'
import { Music, Plus, Send, Users } from 'lucide-react'
import {
  useCurators,
  useCreateCurator,
  useCuratorOutreach,
  useCreateOutreach,
  useUpdateOutreach,
  useDeleteOutreach,
} from '@/hooks/useCurators'
import { PageHeader } from '@/components/layout/PageHeader'
import type { CuratorOutreach } from '@/types'
import { type CuratorWithPlaylists, type ProgressField } from '@/components/curators/curatorUtils'
import { CuratorProfile } from '@/components/curators/CuratorProfile'
import { OutreachTab } from '@/components/curators/OutreachTab'
import { DirectoryTab } from '@/components/curators/DirectoryTab'
import { AddCuratorModal } from '@/components/curators/AddCuratorModal'
import { AddOutreachModal } from '@/components/curators/AddOutreachModal'
import { EditOutreachModal } from '@/components/curators/EditOutreachModal'

type Tab = 'directory' | 'outreach'

export function Curators(): JSX.Element {
  const [tab, setTab] = useState<Tab>('outreach')
  const [selectedCurator, setSelectedCurator] = useState<CuratorWithPlaylists | null>(null)
  const [showAddCurator, setShowAddCurator] = useState(false)
  const [showAddOutreach, setShowAddOutreach] = useState(false)
  const [editingOutreach, setEditingOutreach] = useState<CuratorOutreach | null>(null)

  const { data: curators, isLoading } = useCurators()
  const { data: outreachEntries, isLoading: outreachLoading } = useCuratorOutreach()
  const addCurator = useCreateCurator()
  const addOutreach = useCreateOutreach()
  const updateOutreach = useUpdateOutreach()
  const deleteOutreach = useDeleteOutreach()

  async function toggleOutreachField(entry: CuratorOutreach, field: ProgressField): Promise<void> {
    const isSettingValue = !entry[field]
    updateOutreach.mutate({
      id: entry.id,
      [field]: isSettingValue ? new Date().toISOString() : null,
    })

    // Auto-create curator + playlist when marking as confirmed
    if (field === 'confirmed_at' && isSettingValue && entry.email) {
      const existingCurator = curators?.find(
        (c) => c.email?.toLowerCase() === entry.email?.toLowerCase(),
      )
      if (!existingCurator) {
        addCurator.mutate({
          name: entry.playlist_name,
          email: entry.email,
          genres: entry.genre ? [entry.genre] : [],
          price_per_10k: entry.price_per_10k ?? undefined,
        })
      }
    }
  }

  if (selectedCurator) {
    return <CuratorProfile curator={selectedCurator} onBack={() => setSelectedCurator(null)} />
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={Music}
        title="Curators"
        description="Your playlist curator network"
        actions={
          <button
            onClick={() =>
              tab === 'outreach' ? setShowAddOutreach(true) : setShowAddCurator(true)
            }
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {tab === 'outreach' ? 'Add Playlist' : 'Add Curator'}
          </button>
        }
      />

      <div className="border-b border-gray-200 bg-white/80 px-6">
        <div className="flex gap-1">
          {[
            { id: 'outreach' as Tab, label: 'Outreach Tracker', icon: Send },
            { id: 'directory' as Tab, label: 'Curator Directory', icon: Users },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-teal-500 text-teal-500'
                  : 'border-transparent text-gray-400 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/80 p-6">
        {tab === 'outreach' && (
          <OutreachTab
            entries={outreachEntries}
            isLoading={outreachLoading}
            onToggleField={toggleOutreachField}
            onEdit={setEditingOutreach}
            onDelete={(entry) => {
              if (confirm(`Remove "${entry.playlist_name}" from tracking?`))
                deleteOutreach.mutate(entry.id)
            }}
          />
        )}
        {tab === 'directory' && (
          <DirectoryTab
            curators={curators}
            isLoading={isLoading}
            onSelectCurator={setSelectedCurator}
          />
        )}
      </div>

      <AddCuratorModal
        open={showAddCurator}
        onClose={() => setShowAddCurator(false)}
        onSubmit={(curator) => addCurator.mutate(curator)}
        isSubmitting={addCurator.isPending}
      />

      <AddOutreachModal
        open={showAddOutreach}
        onClose={() => setShowAddOutreach(false)}
        onSubmit={(entry) => addOutreach.mutate(entry)}
        isSubmitting={addOutreach.isPending}
      />

      {editingOutreach && (
        <EditOutreachModal
          entry={editingOutreach}
          onClose={() => setEditingOutreach(null)}
          onSave={(updates) => {
            updateOutreach.mutate({ id: editingOutreach.id, ...updates })
            setEditingOutreach(null)
          }}
        />
      )}
    </div>
  )
}
