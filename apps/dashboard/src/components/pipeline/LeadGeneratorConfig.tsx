import { Select } from '@/components/ui'
import { GENRES, UPLOAD_RECENCY } from './leadGeneratorTypes'

type LeadGeneratorConfigProps = {
  seedUrl: string
  setSeedUrl: (url: string) => void
  selectedGenres: string[]
  toggleGenre: (genre: string) => void
  minFollowers: number
  setMinFollowers: (n: number) => void
  maxFollowers: number
  setMaxFollowers: (n: number) => void
  uploadRecency: number
  setUploadRecency: (n: number) => void
  maxResults: number
  setMaxResults: (n: number) => void
  discoveryError: string
}

export function LeadGeneratorConfig({
  seedUrl,
  setSeedUrl,
  selectedGenres,
  toggleGenre,
  minFollowers,
  setMinFollowers,
  maxFollowers,
  setMaxFollowers,
  uploadRecency,
  setUploadRecency,
  maxResults,
  setMaxResults,
  discoveryError,
}: LeadGeneratorConfigProps): React.JSX.Element {
  return (
    <div className="p-6">
      {discoveryError && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {discoveryError}
        </div>
      )}

      <div className="mb-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Seed Artist
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
            <svg className="h-5 w-5 text-[#ff5500]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.56 3.637c.28-.067.574-.1.878-.1h.003c4.116.012 7.559 3.97 7.559 8.898 0 .118-.003.237-.008.355-.026.597-.51 1.06-1.106 1.06h-.002c-.597-.001-1.08-.49-1.056-1.088.004-.109.006-.218.006-.327 0-3.714-2.378-6.74-5.396-6.895v7.22c0 2.69-2.242 4.924-5.117 5.229a5.32 5.32 0 01-.57.031c-2.857 0-5.207-2.171-5.383-4.935A5.045 5.045 0 011.36 13c0-2.793 2.306-5.064 5.145-5.064.447 0 .882.057 1.295.163v5.148c0 .268.1.51.264.69a.964.964 0 00.718.315c.057 0 .114-.005.169-.015a2.86 2.86 0 001.933-1.087c.41-.523.657-1.175.657-1.88V3.637h.02z"/>
            </svg>
          </div>
          <input
            type="text"
            value={seedUrl}
            onChange={(e) => setSeedUrl(e.target.value)}
            placeholder="https://soundcloud.com/artist-name"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm font-medium text-gray-900 shadow-sm placeholder:text-gray-400 transition-all focus:border-[#ff5500]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20"
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          Paste a SoundCloud profile URL — we'll find similar artists
        </p>
      </div>

      <div className="mb-6">
        <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Genre Filter
          <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-300">
            optional
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map((genre) => {
            const active = selectedGenres.includes(genre)
            return (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#ff5500] text-white shadow-sm shadow-[#ff5500]/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                {genre}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Min Followers
          </label>
          <input
            type="number"
            value={minFollowers}
            onChange={(e) => setMinFollowers(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-[#ff5500]/50 focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Max Followers
          </label>
          <input
            type="number"
            value={maxFollowers}
            onChange={(e) => setMaxFollowers(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-[#ff5500]/50 focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Upload Recency
          </label>
          <Select
            fullWidth
            value={String(uploadRecency)}
            onChange={(v) => setUploadRecency(Number(v))}
            options={UPLOAD_RECENCY.map((o) => ({ value: String(o.value), label: o.label }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Max Results
          </label>
          <input
            type="number"
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            min={1}
            max={500}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-[#ff5500]/50 focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20"
          />
        </div>
      </div>
    </div>
  )
}
