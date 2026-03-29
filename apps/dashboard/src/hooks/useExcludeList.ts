import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ExcludedArtist } from '@/types'

export function useExcludedArtists() {
  return useQuery({
    queryKey: ['excluded'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('excluded_artists')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ExcludedArtist[]
    },
  })
}

export function useExcludeArtist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      artistId,
      email,
      reason = 'opt_out',
      notes,
    }: {
      artistId: string
      email: string
      reason?: string
      notes?: string
    }) => {
      // Try RPC first (if migration 00002 was applied), fall back to direct queries
      const { error: rpcError } = await supabase.rpc('exclude_artist', {
        p_artist_id: artistId,
        p_email: email,
        p_reason: reason,
        p_notes: notes ?? null,
      })

      if (rpcError) {
        // Fallback: do it manually with direct queries
        const { data: artist } = await supabase
          .from('artists')
          .select('name')
          .eq('id', artistId)
          .single()

        // Check if already excluded, then insert or update
        const { data: existing } = await supabase
          .from('excluded_artists')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('excluded_artists')
            .update({ reason, notes: notes ?? null })
            .eq('id', existing.id)
        } else {
          const { error: insertError } = await supabase
            .from('excluded_artists')
            .insert({
              email,
              artist_name: artist?.name ?? 'Unknown',
              artist_id: artistId,
              reason,
              notes: notes ?? null,
            })
          if (insertError) throw insertError
        }

        // Move active pipeline entries to "lost"
        const { error: updateError } = await supabase
          .from('pipeline_entries')
          .update({ stage: 'lost', lost_reason: reason })
          .eq('artist_id', artistId)
          .not('stage', 'in', '("completed","lost")')
        if (updateError) throw updateError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excluded'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}

export function useRestoreArtist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (excludedId: string) => {
      const { error } = await supabase
        .from('excluded_artists')
        .delete()
        .eq('id', excludedId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excluded'] })
    },
  })
}

export function useIsExcluded(email: string | null) {
  return useQuery({
    queryKey: ['is-excluded', email],
    queryFn: async () => {
      if (!email) return false
      // Try RPC first, fall back to direct query
      const { data, error } = await supabase.rpc('is_excluded', {
        p_email: email,
      })
      if (!error) return data as boolean

      // Fallback: direct query
      const { data: row } = await supabase
        .from('excluded_artists')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      return !!row
    },
    enabled: !!email,
  })
}
