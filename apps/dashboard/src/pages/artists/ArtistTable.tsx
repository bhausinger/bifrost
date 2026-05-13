import { X, ExternalLink, Pencil } from 'lucide-react'
import type { Artist } from '@/types'

const AVATAR_GRADIENTS = [
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-cyan-400 to-blue-500',
]

function getGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]!
}

export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function ArtistTable({
  artists,
  isExcluded,
  onExclude,
  onEdit,
  onAgencyClick,
}: {
  artists: Artist[]
  isExcluded: (a: Artist) => boolean
  onExclude: (a: Artist) => void
  onEdit: (a: Artist) => void
  onAgencyClick: (id: string) => void
}): JSX.Element {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Artist
            </th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Email
            </th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Genres
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
              Followers
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
              Tracks
            </th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Source
            </th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Agency
            </th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {artists.map((artist) => (
            <ArtistRow
              key={artist.id}
              artist={artist}
              excluded={isExcluded(artist)}
              onExclude={() => onExclude(artist)}
              onEdit={() => onEdit(artist)}
              onAgencyClick={onAgencyClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ArtistRow({
  artist,
  excluded,
  onExclude,
  onEdit,
  onAgencyClick,
}: {
  artist: Artist
  excluded: boolean
  onExclude: () => void
  onEdit: () => void
  onAgencyClick: (id: string) => void
}): JSX.Element {
  const gradient = getGradient(artist.name)
  return (
    <tr className={`group transition-colors hover:bg-gray-50 ${excluded ? 'opacity-50' : ''}`}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {artist.image_url ? (
            <img
              src={artist.image_url}
              alt=""
              className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
          ) : (
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} ring-2 ring-white shadow-sm`}
            >
              <span className="text-xs font-bold text-white">
                {artist.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-gray-900">{artist.name}</span>
              {excluded && (
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-600 ring-1 ring-inset ring-red-600/20">
                  Excluded
                </span>
              )}
            </div>
            {artist.location && (
              <div className="truncate text-xs text-gray-400">{artist.location}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3 text-gray-500">
        {artist.email ? (
          <a href={`mailto:${artist.email}`} className="hover:text-teal-600">
            {artist.email}
          </a>
        ) : (
          <span className="text-gray-300">&mdash;</span>
        )}
      </td>
      <td className="px-5 py-3">
        {(artist.genres ?? []).length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {(artist.genres ?? []).slice(0, 2).map((g) => (
              <span key={g} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {g}
              </span>
            ))}
            {(artist.genres ?? []).length > 2 && (
              <span className="text-xs text-gray-400">+{(artist.genres ?? []).length - 2}</span>
            )}
          </div>
        ) : (
          <span className="text-gray-300">&mdash;</span>
        )}
      </td>
      <td className="px-5 py-3 text-right font-mono text-sm text-gray-700">
        {formatCount(artist.follower_count)}
      </td>
      <td className="px-5 py-3 text-right font-mono text-sm text-gray-700">
        {formatCount(artist.track_count)}
      </td>
      <td className="px-5 py-3">
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          {artist.source}
        </span>
      </td>
      <td className="px-5 py-3">
        {artist.agency ? (
          <button
            onClick={() => onAgencyClick(artist.agency!.id)}
            className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 hover:bg-violet-100 transition-colors"
          >
            {artist.agency.name}
          </button>
        ) : (
          <span className="text-gray-300">&mdash;</span>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onEdit}
            className="rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-teal-600 group-hover:opacity-100"
            title="Edit artist"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {artist.soundcloud_url && (
            <a
              href={artist.soundcloud_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-orange-600 group-hover:opacity-100"
              title="Open SoundCloud"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {!excluded && artist.email && (
            <button
              onClick={onExclude}
              className="rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              title="Exclude artist"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
