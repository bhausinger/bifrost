import { useQuery } from '@tanstack/react-query'
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
