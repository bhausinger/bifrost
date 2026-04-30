import { Select } from '@/components/ui'
import { IMPORT_STAGE_OPTIONS } from './leadGeneratorTypes'
import type { ScrapedLead } from './leadGeneratorTypes'
import type { PipelineStage } from '@/types'

type LeadGeneratorReviewProps = {
  scrapedLeads: ScrapedLead[]
  toggleScrapedSelect: (index: number) => void
  selectAllWithEmails: () => void
  deselectAllScraped: () => void
  updateEmail: (index: number, email: string) => void
  downloadCsv: () => void
  importStage: PipelineStage
  setImportStage: (stage: PipelineStage) => void
  selectedScrapedCount: number
}

export function LeadGeneratorReview({
  scrapedLeads,
  toggleScrapedSelect,
  selectAllWithEmails,
  deselectAllScraped,
  updateEmail,
  downloadCsv,
  importStage,
  setImportStage,
  selectedScrapedCount,
}: LeadGeneratorReviewProps): React.JSX.Element {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={selectAllWithEmails}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            Select With Emails
          </button>
          <button
            onClick={deselectAllScraped}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            onClick={downloadCsv}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </button>
          <div className="mx-2 h-4 w-px bg-gray-200" />
          <label className="text-xs text-gray-500">Stage:</label>
          <Select
            value={importStage}
            onChange={(v) => setImportStage(v as PipelineStage)}
            options={IMPORT_STAGE_OPTIONS}
          />
        </div>
        <div className="rounded-lg bg-[#ff5500]/10 px-3 py-1.5 text-xs font-semibold text-[#ff5500]">
          {selectedScrapedCount} selected
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
              <th className="min-w-[200px] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Email
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Followers
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Links
              </th>
            </tr>
          </thead>
          <tbody>
            {scrapedLeads.map((artist, i) => (
              <tr
                key={i}
                className={`group border-b border-gray-50 transition-colors ${
                  artist.isDuplicate
                    ? 'bg-amber-50/50'
                    : 'hover:bg-gray-50/80'
                }`}
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={artist.selected}
                    disabled={artist.isDuplicate}
                    onChange={() => toggleScrapedSelect(i)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-[#ff5500] focus:ring-[#ff5500]/30"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {(artist.image_url || artist.avatar_url) ? (
                      <img
                        src={artist.image_url || artist.avatar_url || ''}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-xs font-bold text-gray-500">
                        {artist.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {artist.name}
                      </div>
                      {artist.isDuplicate && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          <span className="h-1 w-1 rounded-full bg-amber-500" />
                          {artist.duplicateNote}
                        </span>
                      )}
                      {!artist.isDuplicate && artist.genre && (
                        <span className="text-[11px] text-gray-400">
                          {artist.genre}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="email"
                    value={artist.editedEmail}
                    onChange={(e) => updateEmail(i, e.target.value)}
                    placeholder="No email found"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 shadow-sm transition-all placeholder:text-gray-300 focus:border-[#ff5500]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#ff5500]/20"
                  />
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500">
                  {artist.followers?.toLocaleString() ?? '-'}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    {artist.url && (
                      <a
                        href={artist.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ff5500]/10 text-[10px] font-bold text-[#ff5500] transition-colors hover:bg-[#ff5500] hover:text-white"
                        title="SoundCloud"
                      >
                        SC
                      </a>
                    )}
                    {artist.instagram_handle && (
                      <a
                        href={`https://instagram.com/${artist.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-pink-50 text-[10px] font-bold text-pink-500 transition-colors hover:bg-pink-500 hover:text-white"
                        title="Instagram"
                      >
                        IG
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
