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
      const { error } = await supabase.rpc('exclude_artist', {
        p_artist_id: artistId,
        p_email: email,
        p_reason: reason,
        p_notes: notes ?? null,
      })
      if (error) throw error
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
      const { data, error } = await supabase.rpc('is_excluded', {
        p_email: email,
      })
      if (error) throw error
      return data as boolean
    },
    enabled: !!email,
  })
}
