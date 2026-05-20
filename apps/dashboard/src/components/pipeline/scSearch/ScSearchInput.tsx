import { Textarea } from '@/components/ui'

type ScSearchInputProps = {
  rawInput: string
  setRawInput: (v: string) => void
  parsedCount: number
  searchError: string
}

export function ScSearchInput({
  rawInput,
  setRawInput,
  parsedCount,
  searchError,
}: ScSearchInputProps): React.JSX.Element {
  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Paste Artist Names</h3>
        <p className="mt-1 text-xs text-gray-500">
          One artist name per line. We'll search SoundCloud for matching profiles.
        </p>
      </div>

      <Textarea
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        placeholder={`Artist Name 1\nArtist Name 2\nArtist Name 3\n...`}
        rows={16}
        className="font-mono text-sm"
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {parsedCount > 0 ? (
            <span>
              <span className="font-semibold text-gray-700">{parsedCount}</span> artist
              {parsedCount !== 1 ? 's' : ''} ready to search
            </span>
          ) : (
            'Paste your list above'
          )}
        </div>
        {parsedCount > 500 && (
          <span className="text-xs font-medium text-amber-600">Max 500 per batch</span>
        )}
      </div>

      {searchError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchError}
        </div>
      )}
    </div>
  )
}
