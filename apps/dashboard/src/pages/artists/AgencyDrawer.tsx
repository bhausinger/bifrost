import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Users } from 'lucide-react'
import { DetailCard, DetailCardHeader } from '@/components/ui'
import type { Agency, Artist, Campaign } from '@/types'

type ArtistWithCampaigns = Artist & { campaigns: Campaign[] }

type AgencyDrawerProps = {
  agencyId: string
  onClose: () => void
}

function useAgencyDetail(agencyId: string) {
  return useQuery({
    queryKey: ['agency-detail', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', agencyId)
        .single()
      if (error) throw error
      return data as Agency
    },
  })
}

function useAgencyArtists(agencyId: string) {
  return useQuery({
    queryKey: ['agency-artists', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*, campaigns(id, name, status, total_budget, actual_streams)')
        .eq('agency_id', agencyId)
        .order('name')
      if (error) throw error
      return data as ArtistWithCampaigns[]
    },
  })
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  placing: 'bg-blue-50 text-blue-700',
  pitching: 'bg-violet-50 text-violet-700',
  paused: 'bg-amber-50 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-50 text-red-600',
}

export function AgencyDrawer({ agencyId, onClose }: AgencyDrawerProps): JSX.Element {
  const { data: agency, isLoading: isLoadingAgency } = useAgencyDetail(agencyId)
  const { data: artists, isLoading: isLoadingArtists } = useAgencyArtists(agencyId)

  const title = agency?.name ?? 'Agency'

  return (
    <DetailCard
      open
      onClose={onClose}
      header={
        <DetailCardHeader
          title={title}
          subtitle={agency?.contact_name ?? undefined}
          avatarGradient="from-violet-400 to-purple-500"
          onClose={onClose}
        />
      }
    >
      {isLoadingAgency ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500" />
        </div>
      ) : agency ? (
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Contact Info
            </h3>
            <div className="space-y-2">
              {agency.contact_name && (
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="text-xs font-medium text-gray-400">Contact</span>
                  <span className="text-sm font-medium text-gray-900">{agency.contact_name}</span>
                </div>
              )}
              {agency.email && (
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="text-xs font-medium text-gray-400">Email</span>
                  <a
                    href={`mailto:${agency.email}`}
                    className="text-sm font-medium text-teal-600 hover:underline"
                  >
                    {agency.email}
                  </a>
                </div>
              )}
              {agency.notes && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="text-xs font-medium text-gray-400">Notes</span>
                  <p className="mt-1 text-sm text-gray-700">{agency.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Artists
              {artists && artists.length > 0 && (
                <span className="ml-1.5 text-gray-300">({artists.length})</span>
              )}
            </h3>
            {isLoadingArtists ? (
              <p className="text-xs text-gray-400">Loading artists...</p>
            ) : !artists || artists.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center">
                <Users className="mx-auto h-5 w-5 text-gray-300" />
                <p className="mt-1.5 text-xs text-gray-400">No artists under this agency</p>
              </div>
            ) : (
              <div className="space-y-3">
                {artists.map((artist) => (
                  <div
                    key={artist.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{artist.name}</span>
                      {artist.email && (
                        <span className="truncate text-xs text-gray-400">{artist.email}</span>
                      )}
                    </div>
                    {artist.campaigns.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {artist.campaigns.map((campaign) => (
                          <div key={campaign.id} className="flex items-center gap-2 pl-2">
                            <div className="h-1 w-1 rounded-full bg-gray-300" />
                            <span className="truncate text-xs text-gray-600">{campaign.name}</span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[campaign.status] ?? 'bg-gray-100 text-gray-500'}`}
                            >
                              {campaign.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-gray-400">Agency not found</div>
      )}
    </DetailCard>
  )
}
