import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy } from 'lucide-react'
import type { SearchMatch } from './scSearchTypes'
import { MIN_CONFIDENCE_DISPLAY } from './scSearchTypes'

type ScSearchResultsProps = {
  searchResults: SearchMatch[]
  searchStats: { total: number; matched: number; unmatched: number }
  toggleResultSelect: (index: number) => void
  selectAllMatched: () => void
  deselectAll: () => void
  pickAlternative: (resultIndex: number, altIndex: number) => void
  selectedResultCount: number
  copyResults: () => void
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return 'text-emerald-600 bg-emerald-50'
  if (c >= 0.6) return 'text-amber-600 bg-amber-50'
  return 'text-red-500 bg-red-50'
}

function confidenceLabel(c: number): string {
  if (c >= 0.8) return 'High'
  if (c >= 0.6) return 'Medium'
  return 'Low'
}

export function ScSearchResults({
  searchResults,
  searchStats,
  toggleResultSelect,
  selectAllMatched,
  deselectAll,
  pickAlternative,
  selectedResultCount,
  copyResults,
}: ScSearchResultsProps): React.JSX.Element {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  function handleCopy(): void {
    copyResults()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <span className="text-sm font-bold text-emerald-600">{searchStats.matched}</span>
            </div>
            <span className="text-xs text-gray-500">matched</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <span className="text-sm font-bold text-red-400">{searchStats.unmatched}</span>
            </div>
            <span className="text-xs text-gray-500">not found</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAllMatched}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Copy className="h-3 w-3" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <div className="ml-2 rounded-lg bg-[#ff5500]/10 px-3 py-1.5 text-xs font-semibold text-[#ff5500]">
            {selectedResultCount} selected
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-10 px-4 py-2.5" />
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Search Query
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Matched Profile
              </th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Confidence
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Followers
              </th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {searchResults.map((result, i) => (
              <ResultRow
                key={i}
                index={i}
                result={result}
                isExpanded={expandedIndex === i}
                onToggleExpand={() => setExpandedIndex(expandedIndex === i ? null : i)}
                onToggleSelect={() => toggleResultSelect(i)}
                onPickAlt={(altIndex) => pickAlternative(i, altIndex)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type ResultRowProps = {
  index: number
  result: SearchMatch
  isExpanded: boolean
  onToggleExpand: () => void
  onToggleSelect: () => void
  onPickAlt: (altIndex: number) => void
}

function ResultRow({
  result,
  isExpanded,
  onToggleExpand,
  onToggleSelect,
  onPickAlt,
}: ResultRowProps): React.JSX.Element {
  const hasAlts = result.alternatives.length > 0
  const isNoMatch = !result.match

  return (
    <>
      <tr
        className={`group border-b border-gray-50 transition-colors ${
          isNoMatch ? 'bg-gray-50/50' : 'hover:bg-gray-50/80'
        }`}
      >
        <td className="px-4 py-2.5">
          {result.match && (
            <input
              type="checkbox"
              checked={result.selected}
              onChange={onToggleSelect}
              className="h-3.5 w-3.5 rounded border-gray-300 text-[#ff5500] focus:ring-[#ff5500]/30"
            />
          )}
        </td>
        <td className="px-4 py-2.5 text-sm text-gray-700">{result.query}</td>
        <td className="px-4 py-2.5">
          {result.match ? (
            <div className="flex items-center gap-2">
              {result.match.avatar_url ? (
                <img
                  src={result.match.avatar_url}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-white shadow-sm"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500">
                  {result.match.name.charAt(0).toUpperCase()}
                </div>
              )}
              <a
                href={result.match.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-medium text-gray-900 hover:text-[#ff5500]"
              >
                {result.match.name}
              </a>
            </div>
          ) : (
            <span className="text-xs italic text-gray-400">No match found</span>
          )}
        </td>
        <td className="px-4 py-2.5 text-center">
          {result.match && result.confidence >= MIN_CONFIDENCE_DISPLAY && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${confidenceColor(result.confidence)}`}
            >
              {confidenceLabel(result.confidence)}
              <span className="font-mono text-[10px] opacity-60">
                {Math.round(result.confidence * 100)}%
              </span>
            </span>
          )}
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500">
          {result.match?.followers?.toLocaleString() ?? '-'}
        </td>
        <td className="px-2 py-2.5">
          {hasAlts && (
            <button
              onClick={onToggleExpand}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title={`${result.alternatives.length} alternative${result.alternatives.length > 1 ? 's' : ''}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </td>
      </tr>

      {/* Alternatives */}
      {isExpanded &&
        result.alternatives.map((alt, altI) => (
          <tr key={`alt-${altI}`} className="border-b border-gray-50 bg-blue-50/30">
            <td className="px-4 py-2" />
            <td className="px-4 py-2">
              <span className="text-[10px] uppercase tracking-wider text-blue-400">Alt</span>
            </td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                {alt.avatar_url ? (
                  <img
                    src={alt.avatar_url}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover opacity-80"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-400">
                    {alt.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <a
                  href={alt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 hover:text-[#ff5500]"
                >
                  {alt.name}
                </a>
                <button
                  onClick={() => onPickAlt(altI)}
                  className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600 transition-colors hover:bg-blue-200"
                >
                  Use this
                </button>
              </div>
            </td>
            <td className="px-4 py-2 text-center">
              <span className="font-mono text-[10px] text-gray-400">
                {Math.round(alt.confidence * 100)}%
              </span>
            </td>
            <td className="px-4 py-2 text-right font-mono text-[10px] text-gray-400">
              {alt.followers?.toLocaleString() ?? '-'}
            </td>
            <td />
          </tr>
        ))}
    </>
  )
}
