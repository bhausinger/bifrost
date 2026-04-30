import { STEP_META, STEP_LABELS } from './leadGeneratorTypes'
import type { LeadGeneratorModalProps } from './leadGeneratorTypes'
import { useLeadGenerator } from './useLeadGenerator'
import { LeadGeneratorConfig } from './LeadGeneratorConfig'
import { LeadGeneratorResults } from './LeadGeneratorResults'
import { LeadGeneratorReview } from './LeadGeneratorReview'

export function LeadGeneratorModal({ onClose }: LeadGeneratorModalProps): React.JSX.Element {
  const hook = useLeadGenerator()

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-3 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-modal">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-6 py-5">
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                {STEP_META[hook.step].label}
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                SoundCloud Artist Discovery
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

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
                      isActive
                        ? 'text-[#ff5500]'
                        : isComplete
                          ? 'text-gray-400'
                          : 'text-gray-600'
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
          {hook.step === 'config' && (
            <LeadGeneratorConfig
              seedUrl={hook.seedUrl}
              setSeedUrl={hook.setSeedUrl}
              selectedGenres={hook.selectedGenres}
              toggleGenre={hook.toggleGenre}
              minFollowers={hook.minFollowers}
              setMinFollowers={hook.setMinFollowers}
              maxFollowers={hook.maxFollowers}
              setMaxFollowers={hook.setMaxFollowers}
              uploadRecency={hook.uploadRecency}
              setUploadRecency={hook.setUploadRecency}
              maxResults={hook.maxResults}
              setMaxResults={hook.setMaxResults}
              discoveryError={hook.discoveryError}
            />
          )}

          {hook.step === 'discovering' && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-8">
                <div className="absolute inset-0 animate-ping rounded-full bg-[#ff5500]/10" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-2 animate-ping rounded-full bg-[#ff5500]/15" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5500] to-amber-500 shadow-lg shadow-[#ff5500]/25">
                  <svg className="h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Scanning SoundCloud
              </h3>
              <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
                Searching related artists, followings, followers, and genre tags
                for artists similar to your seed profile
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff5500]" />
                This usually takes 10-30 seconds
              </div>
            </div>
          )}

          {hook.step === 'results' && (
            <LeadGeneratorResults
              discoveredLeads={hook.discoveredLeads}
              toggleLeadSelect={hook.toggleLeadSelect}
              selectAllLeads={hook.selectAllLeads}
              deselectAllLeads={hook.deselectAllLeads}
              handleExcludeLead={hook.handleExcludeLead}
              excludingIndex={hook.excludingIndex}
              selectedLeadCount={hook.selectedLeadCount}
              newLeadCount={hook.newLeadCount}
              excludedCount={hook.excludedCount}
              totalFound={hook.totalFound}
              filterStats={hook.filterStats}
            />
          )}

          {hook.step === 'scraping' && (
            <div className="space-y-6 py-8 text-center">
              <div>
                <div className="mb-2 font-mono text-2xl font-bold text-gray-900">
                  {hook.scrapeProgress.done} / {hook.scrapeProgress.total}
                </div>
                <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-[#ff5500] transition-all"
                    style={{ width: `${hook.scrapeProgress.total ? (hook.scrapeProgress.done / hook.scrapeProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-400">ETA: {hook.scrapeProgress.eta}</div>
              </div>
              <div className="flex justify-center gap-8 text-sm">
                <div>
                  <div className="font-mono text-lg font-bold text-emerald-600">{hook.scrapeProgress.emailsFound}</div>
                  <div className="text-gray-400">Emails Found</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-gray-400">{hook.scrapeProgress.done - hook.scrapeProgress.emailsFound}</div>
                  <div className="text-gray-400">No Email</div>
                </div>
              </div>
              {hook.liveFeed.length > 0 && (
                <div ref={hook.feedRef} className="mx-auto max-w-md max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-3 text-left text-xs">
                  {hook.liveFeed.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className={item.hasEmail ? 'text-emerald-500' : 'text-gray-300'}>{item.hasEmail ? '\u2713' : '\u2717'}</span>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {hook.step === 'review' && (
            <LeadGeneratorReview
              scrapedLeads={hook.scrapedLeads}
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

          {hook.step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-4xl font-bold tracking-tight text-gray-900">
                {hook.importProgress.done}
                <span className="text-gray-300"> / </span>
                <span className="text-gray-400">{hook.importProgress.total}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">artists imported</p>
              <div className="mx-auto mt-6 w-full max-w-md">
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{
                      width: `${(hook.importProgress.done / hook.importProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Adding artists to your pipeline...
              </p>
            </div>
          )}

          {hook.step === 'done' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Import Complete
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Artists have been added to your pipeline
              </p>
              <div className="mt-8 flex gap-4">
                <div className="flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50 px-8 py-4">
                  <span className="text-2xl font-bold text-emerald-600">
                    {hook.importResults.imported}
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-500">
                    Imported
                  </span>
                </div>
                {hook.importResults.skipped > 0 && (
                  <div className="flex flex-col items-center rounded-xl border border-amber-200 bg-amber-50 px-8 py-4">
                    <span className="text-2xl font-bold text-amber-600">
                      {hook.importResults.skipped}
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-amber-500">
                      Skipped
                    </span>
                  </div>
                )}
                {hook.importResults.failed > 0 && (
                  <div className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-8 py-4">
                    <span className="text-2xl font-bold text-red-600">
                      {hook.importResults.failed}
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-red-500">
                      Failed
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            {hook.step === 'done' ? 'Close' : 'Cancel'}
          </button>

          {hook.step === 'config' && (
            <button
              onClick={hook.handleDiscover}
              disabled={!hook.seedUrl.includes('soundcloud.com')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5500] to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#ff5500]/25 transition-all hover:shadow-md hover:shadow-[#ff5500]/30 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 disabled:shadow-none"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Discover Artists
            </button>
          )}

          {hook.step === 'results' && (
            <button
              onClick={hook.handleScrape}
              disabled={hook.selectedLeadCount === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5500] to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#ff5500]/25 transition-all hover:shadow-md hover:shadow-[#ff5500]/30 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 disabled:shadow-none"
            >
              Scrape Selected ({hook.selectedLeadCount})
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
