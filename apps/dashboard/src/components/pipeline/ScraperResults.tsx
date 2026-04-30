import { Select } from '@/components/ui'
import { IMPORT_STAGE_OPTIONS } from './scraperTypes'
import type { ScrapedArtist, PipelineStage } from './scraperTypes'

type ScraperResultsProps = {
  results: ScrapedArtist[]
  toggleSelect: (index: number) => void
  selectAllWithEmails: () => void
  deselectAll: () => void
  downloadCsv: () => void
  updateEmail: (index: number, email: string) => void
  importStage: PipelineStage
  setImportStage: (stage: PipelineStage) => void
  selectedCount: number
}

export function ScraperResults({
  results,
  toggleSelect,
  selectAllWithEmails,
  deselectAll,
  downloadCsv,
  updateEmail,
  importStage,
  setImportStage,
  selectedCount,
}: ScraperResultsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={selectAllWithEmails}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Select All With Emails
          </button>
          <button
            onClick={deselectAll}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Deselect All
          </button>
          <button
            onClick={downloadCsv}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Download CSV
          </button>
        </div>
        <span className="text-sm text-gray-400">
          {selectedCount} selected
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
        <label className="text-sm text-gray-500">Import to stage:</label>
        <Select
          value={importStage}
          onChange={(v) => setImportStage(v as PipelineStage)}
          options={IMPORT_STAGE_OPTIONS}
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-3 py-2" />
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Artist
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Email
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Followers
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Links
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((artist, i) => (
              <tr
                key={i}
                className={`border-t border-gray-100 ${
                  artist.isDuplicate ? 'bg-amber-500/5' : ''
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={artist.selected}
                    disabled={artist.isDuplicate}
                    onChange={() => toggleSelect(i)}
                    className="rounded accent-teal-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-900">
                    {artist.name}
                  </div>
                  {artist.isDuplicate && (
                    <div className="text-xs text-amber-600">
                      {artist.duplicateNote}
                    </div>
                  )}
                  {artist.genres.length > 0 && (
                    <div className="text-xs text-gray-400">
                      {artist.genres.slice(0, 3).join(', ')}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="email"
                    value={artist.editedEmail}
                    onChange={(e) => updateEmail(i, e.target.value)}
                    placeholder="No email found"
                    className="input-field w-full text-xs"
                  />
                </td>
                <td className="px-3 py-2 font-mono text-gray-500">
                  {artist.follower_count?.toLocaleString() ?? '-'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1.5">
                    {artist.soundcloud_url && (
                      <a
                        href={artist.soundcloud_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-600 hover:underline"
                      >
                        SC
                      </a>
                    )}
                    {artist.instagram_handle && (
                      <span className="text-xs text-pink-400">IG</span>
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
