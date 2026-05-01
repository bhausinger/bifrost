import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Placement, Playlist, Curator } from '@/types'

type PlacementWithDetails = Placement & {
  playlist: Playlist & { curator: Curator }
}

export function useCampaignPlacements(campaignId: string | null) {
  return useQuery({
    queryKey: ['placements', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('placements')
        .select('*, playlist:playlists(*, curator:curators(*))')
        .eq('campaign_id', campaignId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PlacementWithDetails[]
    },
    enabled: !!campaignId,
  })
}

export function useCreatePlacement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (placement: {
      campaign_id: string
      playlist_id: string
      cost?: number
      status?: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('placements')
        .insert({
          ...placement,
          status: placement.status ?? 'placed',
          placed_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['placements', variables.campaign_id] })
    },
  })
}

export function useCreatePlaylist() {
  return useMutation({
    mutationFn: async (playlist: {
      name: string
      spotify_url?: string
      spotify_playlist_id?: string
      curator_id: string
      follower_count?: number
    }) => {
      if (playlist.spotify_url) {
        const { data: existing } = await supabase
          .from('playlists')
          .select('id')
          .eq('spotify_url', playlist.spotify_url)
          .maybeSingle()
        if (existing) return existing
      }

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          name: playlist.name,
          spotify_url: playlist.spotify_url ?? null,
          spotify_playlist_id: playlist.spotify_playlist_id ?? null,
          curator_id: playlist.curator_id,
          follower_count: playlist.follower_count ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
  })
}
