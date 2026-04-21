import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useExcludeArtist } from '@/hooks/useExcludeList'
import { useUpdateArtist, useDeleteArtist } from '@/hooks/useArtists'
import { ExcludeModal } from '@/components/exclude/ExcludeModal'
import type { PipelineEntry, Artist } from '@/types'

type PipelineDetailEditProps = {
  entry: PipelineEntry & { artist: Artist }
  onClose: () => void
}

export function PipelineDetailEdit({ entry, onClose }: PipelineDetailEditProps): JSX.Element {
  const excludeArtist = useExcludeArtist()
  const updateArtist = useUpdateArtist()
  const deleteArtist = useDeleteArtist()

  const [showExcludeModal, setShowExcludeModal] = useState(false)
  const [editEmail, setEditEmail] = useState(entry.artist.email ?? '')
  const [editSoundcloud, setEditSoundcloud] = useState(entry.artist.soundcloud_url ?? '')
  const [editSpotify, setEditSpotify] = useState(entry.artist.spotify_url ?? '')
  const [editInstagram, setEditInstagram] = useState(entry.artist.instagram_handle ?? '')
  const [editNotes, setEditNotes] = useState(entry.notes ?? '')
  const [editSaving, setEditSaving] = useState(false)
  const [editSavedAt, setEditSavedAt] = useState<Date | null>(null)

  async function handleSaveEdit(): Promise<void> {
    setEditSaving(true)
    try {
      await updateArtist.mutateAsync({
        id: entry.artist_id,
        email: editEmail || null,
        soundcloud_url: editSoundcloud || null,
        spotify_url: editSpotify || null,
        instagram_handle: editInstagram || null,
      })
      await supabase.from('pipeline_entries').update({ notes: editNotes || null }).eq('id', entry.id)
      setEditSavedAt(new Date())
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!confirm(`Permanently delete ${entry.artist.name}? This cannot be undone.`)) return
    await deleteArtist.mutateAsync(entry.artist_id)
    onClose()
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email Address</label>
          <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="input-field w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">SoundCloud URL</label>
          <input type="url" value={editSoundcloud} onChange={(e) => setEditSoundcloud(e.target.value)} className="input-field w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Spotify URL</label>
          <input type="url" value={editSpotify} onChange={(e) => setEditSpotify(e.target.value)} className="input-field w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Instagram Handle</label>
          <input type="text" value={editInstagram} onChange={(e) => setEditInstagram(e.target.value)} className="input-field w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Notes</label>
          <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} className="input-field w-full text-sm" />
        </div>
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveEdit}
              disabled={editSaving}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
            {editSavedAt && (
              <span className="text-xs text-emerald-600">Saved {editSavedAt.toLocaleTimeString()}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExcludeModal(true)}
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              Exclude
            </button>
            <button
              onClick={handleDelete}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {showExcludeModal && (
        <ExcludeModal
          artistName={entry.artist.name}
          onConfirm={async (reason, notes) => {
            if (entry.artist.email) {
              await excludeArtist.mutateAsync({
                artistId: entry.artist_id,
                email: entry.artist.email,
                reason,
                notes,
              })
            }
            setShowExcludeModal(false)
            onClose()
          }}
          onCancel={() => setShowExcludeModal(false)}
        />
      )}
    </>
  )
}
