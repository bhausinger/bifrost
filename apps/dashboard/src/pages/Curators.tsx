import { useState } from 'react'
import { Music, Plus, Send, Users } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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

export function Curators() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('outreach')
  const [selectedCurator, setSelectedCurator] = useState<CuratorWithPlaylists | null>(null)
  const [showAddCurator, setShowAddCurator] = useState(false)
  const [showAddOutreach, setShowAddOutreach] = useState(false)
  const [editingOutreach, setEditingOutreach] = useState<CuratorOutreach | null>(null)

  // ─── Data ───
  const { data: curators, isLoading } = useQuery({
    queryKey: ['curators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curators')
        .select('*, playlists(*)')
        .order('name')
      if (error) throw error
      return data as CuratorWithPlaylists[]
    },
  })

  const { data: outreachEntries, isLoading: outreachLoading } = useQuery({
    queryKey: ['curator-outreach'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curator_outreach')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as CuratorOutreach[]
    },
  })

  const addCurator = useMutation({
    mutationFn: async (curator: { name: string; contact_name?: string; email?: string; genres?: string[]; price_per_10k?: number; payment_method?: string; payment_handle?: string; payment_code?: string; notes?: string }) => {
      const { data, error } = await supabase.from('curators').insert(curator).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curators'] })
      setShowAddCurator(false)
    },
  })

  const addOutreach = useMutation({
    mutationFn: async (entry: Partial<CuratorOutreach>) => {
      const { data, error } = await supabase.from('curator_outreach').insert(entry).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-outreach'] })
      setShowAddOutreach(false)
    },
  })

  const updateOutreach = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CuratorOutreach> & { id: string }) => {
      const { error } = await supabase.from('curator_outreach').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-outreach'] })
    },
  })

  const deleteOutreach = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('curator_outreach').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-outreach'] })
    },
  })

  function toggleOutreachField(entry: CuratorOutreach, field: ProgressField): void {
    updateOutreach.mutate({
      id: entry.id,
      [field]: entry[field] ? null : new Date().toISOString(),
    })
  }

  // ─── Profile View ───
  if (selectedCurator) {
    return <CuratorProfile curator={selectedCurator} onBack={() => setSelectedCurator(null)} />
  }

  // ─── Main View with Tabs ───
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={Music}
        title="Curators"
        description="Your playlist curator network"
        actions={
          <button
            onClick={() => tab === 'outreach' ? setShowAddOutreach(true) : setShowAddCurator(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {tab === 'outreach' ? 'Add Playlist' : 'Add Curator'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white/80 px-6">
        <div className="flex gap-1">
          {([
            { id: 'outreach' as Tab, label: 'Outreach Tracker', icon: Send },
            { id: 'directory' as Tab, label: 'Curator Directory', icon: Users },
          ]).map((t) => (
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
            onDelete={(entry) => { if (confirm(`Remove "${entry.playlist_name}" from tracking?`)) deleteOutreach.mutate(entry.id) }}
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
