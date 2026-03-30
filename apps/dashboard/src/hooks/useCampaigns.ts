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
      const { pipeline_entry_id, ...rest } = campaign
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...rest,
          pipeline_entry_id,
          status: 'active',
          actual_streams: 0,
        })
        .select()
        .single()
      if (error) throw error

      // Move the pipeline entry to "completed" so it's off the board
      if (pipeline_entry_id) {
        await supabase
          .from('pipeline_entries')
          .update({ stage: 'completed' })
          .eq('id', pipeline_entry_id)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
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
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['campaigns'] })
      const previous = queryClient.getQueryData<CampaignWithArtist[]>(['campaigns'])
      queryClient.setQueryData<CampaignWithArtist[]>(['campaigns'], (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...updates } : c))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['campaigns'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}
