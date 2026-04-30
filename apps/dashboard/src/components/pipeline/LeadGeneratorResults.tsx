import type { DiscoveredLead, FilterStats } from './leadGeneratorTypes'

type LeadGeneratorResultsProps = {
  discoveredLeads: DiscoveredLead[]
  toggleLeadSelect: (index: number) => void
  selectAllLeads: () => void
  deselectAllLeads: () => void
  handleExcludeLead: (index: number) => void
  excludingIndex: number | null
  selectedLeadCount: number
  newLeadCount: number
  excludedCount: number
  totalFound: number
  filterStats: FilterStats | null
}

export function LeadGeneratorResults({
  discoveredLeads,
  toggleLeadSelect,
  selectAllLeads,
  deselectAllLeads,
  handleExcludeLead,
  excludingIndex,
  selectedLeadCount,
  newLeadCount,
  excludedCount,
  totalFound,
  filterStats,
}: LeadGeneratorResultsProps): React.JSX.Element {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <span className="text-sm font-bold text-emerald-600">{newLeadCount}</span>
            </div>
            <div className="text-xs text-gray-500">
              new leads
              {excludedCount > 0 && (
                <span className="text-amber-600"> ({excludedCount} known, excluded)</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
              <span className="text-sm font-bold text-gray-500">{totalFound.toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-500">scanned</div>
          </div>
          {filterStats && (
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              {filterStats.below_min > 0 && <span>{filterStats.below_min} too small</span>}
              {filterStats.above_max > 0 && <span>{filterStats.above_max} too big</span>}
              {filterStats.no_tracks > 0 && <span>{filterStats.no_tracks} no tracks</span>}
              {filterStats.too_old > 0 && <span>{filterStats.too_old} inactive</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAllLeads}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            Select All
          </button>
          <button
            onClick={deselectAllLeads}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            Clear
          </button>
          <div className="ml-2 rounded-lg bg-[#ff5500]/10 px-3 py-1.5 text-xs font-semibold text-[#ff5500]">
            {selectedLeadCount} selected
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-10 px-4 py-2.5" />
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Artist
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Followers
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Tracks
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Genre
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Location
              </th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {discoveredLeads.map((lead, i) => (
              <tr
                key={i}
                className="group border-b border-gray-50 transition-colors hover:bg-gray-50/80"
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={lead.selected}
                    onChange={() => toggleLeadSelect(i)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-[#ff5500] focus:ring-[#ff5500]/30"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {lead.avatar_url ? (
                      <img
                        src={lead.avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-xs font-bold text-gray-500">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm font-medium text-gray-900 transition-colors hover:text-[#ff5500]"
                      >
                        {lead.name}
                      </a>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500">
                  {lead.followers.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500">
                  {lead.track_count}
                </td>
                <td className="px-4 py-2.5">
                  {lead.genre && (
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                      {lead.genre}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400">
                  {[lead.city, lead.country].filter(Boolean).join(', ')}
                </td>
                <td className="px-2 py-2.5">
                  <button
                    onClick={() => handleExcludeLead(i)}
                    disabled={excludingIndex === i}
                    title="Exclude artist"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
