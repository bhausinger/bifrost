import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Campaign, Artist } from '@/types'

type CampaignWithArtist = Campaign & { artist: Artist }

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, artist:artists(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as CampaignWithArtist[]
    },
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaign: {
      artist_id: string
      pipeline_entry_id?: string
      name: string
      track_name?: string
      track_spotify_url?: string
      total_budget?: number
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaign,
          status: 'active',
          actual_streams: 0,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Campaign> & { id: string }) => {
      const { error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}
