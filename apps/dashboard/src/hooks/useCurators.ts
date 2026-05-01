import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { CuratorOutreach } from '@/types'
import type { CuratorWithPlaylists } from '@/components/curators/curatorUtils'

export function useCurators(): ReturnType<typeof useQuery<CuratorWithPlaylists[]>> {
  return useQuery({
    queryKey: ['curators'],
    queryFn: async (): Promise<CuratorWithPlaylists[]> => {
      const { data, error } = await supabase
        .from('curators')
        .select('*, playlists(*)')
        .order('name')
      if (error) throw error
      return data as CuratorWithPlaylists[]
    },
  })
}

export function useCreateCurator(): ReturnType<
  typeof useMutation<
    Database['public']['Tables']['curators']['Row'],
    Error,
    {
      name: string
      contact_name?: string
      email?: string
      genres?: string[]
      price_per_10k?: number
      payment_method?: string
      payment_handle?: string
      payment_code?: string
      notes?: string
    }
  >
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (curator: {
      name: string
      contact_name?: string
      email?: string
      genres?: string[]
      price_per_10k?: number
      payment_method?: string
      payment_handle?: string
      payment_code?: string
      notes?: string
    }): Promise<Database['public']['Tables']['curators']['Row']> => {
      const { data, error } = await supabase.from('curators').insert(curator).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curators'] })
    },
  })
}

export function useCuratorOutreach(): ReturnType<typeof useQuery<CuratorOutreach[]>> {
  return useQuery({
    queryKey: ['curator-outreach'],
    queryFn: async (): Promise<CuratorOutreach[]> => {
      const { data, error } = await supabase
        .from('curator_outreach')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as CuratorOutreach[]
    },
  })
}

export function useCreateOutreach(): ReturnType<
  typeof useMutation<
    Database['public']['Tables']['curator_outreach']['Row'],
    Error,
    Database['public']['Tables']['curator_outreach']['Insert']
  >
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      entry: Database['public']['Tables']['curator_outreach']['Insert'],
    ): Promise<Database['public']['Tables']['curator_outreach']['Row']> => {
      const { data, error } = await supabase
        .from('curator_outreach')
        .insert(entry)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-outreach'] })
    },
  })
}

export function useUpdateOutreach(): ReturnType<
  typeof useMutation<void, Error, Partial<CuratorOutreach> & { id: string }>
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CuratorOutreach> & { id: string }): Promise<void> => {
      const { error } = await supabase.from('curator_outreach').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-outreach'] })
    },
  })
}

export function useDeleteOutreach(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('curator_outreach').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-outreach'] })
    },
  })
}
