import { STEP_META, STEP_LABELS, type ScSearchModalProps } from './scSearchTypes'
import { useScSearch } from './useScSearch'
import { ScSearchInput } from './ScSearchInput'
import { ScSearchResults } from './ScSearchResults'
import { ScSearchReview } from './ScSearchReview'
import { SearchingState, ScrapingState, ImportingState, DoneState } from './ScSearchStates'

export function ScSearchModal({ onClose }: ScSearchModalProps): React.JSX.Element {
  const hook = useScSearch()

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-3 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-modal">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-6 py-5">
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                {STEP_META[hook.step].label}
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">SoundCloud Name Search</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Progress */}
          <div className="relative mt-4 flex items-center gap-1">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1
              const isActive = stepNum === hook.currentStepNum
              const isComplete = stepNum < hook.currentStepNum
              return (
                <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full items-center">
                    <div
                      className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                        isComplete
                          ? 'bg-[#ff5500]'
                          : isActive
                            ? 'bg-gradient-to-r from-[#ff5500] to-[#ff5500]/30'
                            : 'bg-white/10'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium tracking-wide uppercase transition-colors ${
                      isActive ? 'text-[#ff5500]' : isComplete ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {hook.step === 'input' && (
            <ScSearchInput
              rawInput={hook.rawInput}
              setRawInput={hook.setRawInput}
              parsedCount={hook.parsedNames.length}
              searchError={hook.searchError}
            />
          )}

          {hook.step === 'searching' && <SearchingState />}

          {hook.step === 'results' && (
            <ScSearchResults
              searchResults={hook.searchResults}
              searchStats={hook.searchStats}
              toggleResultSelect={hook.toggleResultSelect}
              selectAllMatched={hook.selectAllMatched}
              deselectAll={hook.deselectAll}
              pickAlternative={hook.pickAlternative}
              selectedResultCount={hook.selectedResultCount}
              copyResults={hook.copyResults}
            />
          )}

          {hook.step === 'scraping' && (
            <ScrapingState
              progress={hook.scrapeProgress}
              liveFeed={hook.liveFeed}
              feedRef={hook.feedRef}
            />
          )}

          {hook.step === 'review' && (
            <ScSearchReview
              scrapedResults={hook.scrapedResults}
              toggleScrapedSelect={hook.toggleScrapedSelect}
              selectAllWithEmails={hook.selectAllWithEmails}
              deselectAllScraped={hook.deselectAllScraped}
              updateEmail={hook.updateEmail}
              downloadCsv={hook.downloadCsv}
              importStage={hook.importStage}
              setImportStage={hook.setImportStage}
              selectedScrapedCount={hook.selectedScrapedCount}
            />
          )}

          {hook.step === 'importing' && <ImportingState progress={hook.importProgress} />}

          {hook.step === 'done' && <DoneState results={hook.importResults} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            {hook.step === 'done' ? 'Close' : 'Cancel'}
          </button>

          {hook.step === 'input' && (
            <button
              onClick={hook.handleSearch}
              disabled={hook.parsedNames.length === 0 || hook.parsedNames.length > 500}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5500] to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#ff5500]/25 transition-all hover:shadow-md hover:shadow-[#ff5500]/30 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 disabled:shadow-none"
            >
              Search {hook.parsedNames.length} Names
            </button>
          )}

          {hook.step === 'results' && (
            <button
              onClick={hook.handleScrape}
              disabled={hook.selectedResultCount === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5500] to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#ff5500]/25 transition-all hover:shadow-md hover:shadow-[#ff5500]/30 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 disabled:shadow-none"
            >
              Scrape Selected ({hook.selectedResultCount})
            </button>
          )}

          {hook.step === 'review' && (
            <button
              onClick={hook.handleImport}
              disabled={hook.selectedScrapedCount === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/25 transition-all hover:shadow-md hover:shadow-emerald-500/30 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 disabled:shadow-none"
            >
              Import {hook.selectedScrapedCount} Artists
            </button>
          )}
        </div>
      </div>
    </>
  )
}
