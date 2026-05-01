import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { Artist } from '@/types'

/** Fetches confirmed clients only (status = 'client'). Leads live in the pipeline. */
export function useArtists() {
  return useQuery({
    queryKey: ['artists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*, agency:agencies(id, name)')
        .eq('status', 'client')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Artist[]
    },
  })
}

export function useCreateArtist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (artist: Database['public']['Tables']['artists']['Insert']) => {
      const { data, error } = await supabase.from('artists').insert(artist).select().single()
      if (error) throw error
      return data as Artist
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}

export function useUpdateArtist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Artist> & { id: string }) => {
      const { error } = await supabase.from('artists').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })
}

export function useDeleteArtist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('artists').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })
}
