import { useScraperImport } from './useScraperImport'
import { ScraperResults } from './ScraperResults'
import type { ScraperModalProps } from './scraperTypes'

export function ScraperModal({ onClose }: ScraperModalProps) {
  const {
    step,
    urls,
    setUrls,
    results,
    progress,
    importStage,
    setImportStage,
    importProgress,
    importResults,
    fileInputRef,
    handleFileUpload,
    parseUrls,
    handleScrape,
    toggleSelect,
    selectAllWithEmails,
    deselectAll,
    updateEmail,
    handleImport,
    downloadCsv,
    selectedCount,
  } = useScraperImport()

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-panel fixed inset-4 z-50 mx-auto flex max-w-4xl flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-gray-900">
            {step === 'input' && 'Import from Scraper'}
            {step === 'scraping' && 'Scraping...'}
            {step === 'results' && `Results (${results.length} found)`}
            {step === 'importing' && 'Importing...'}
            {step === 'done' && 'Import Complete'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Paste SoundCloud URLs (one per line)
                </label>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={12}
                  placeholder={
                    'https://soundcloud.com/artist1\nhttps://soundcloud.com/artist2\nhttps://soundcloud.com/artist3'
                  }
                  className="input-field w-full font-mono"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Upload .txt / .csv
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <span className="text-sm text-gray-400">
                  {parseUrls().length} valid URLs
                </span>
              </div>
            </div>
          )}

          {step === 'scraping' && (
            <div className="space-y-6 py-8 text-center">
              <div>
                <div className="mb-2 font-mono text-2xl font-bold text-gray-900">
                  {progress.done} / {progress.total}
                </div>
                <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{
                      width: `${(progress.done / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  ETA: {progress.eta}
                </div>
              </div>
              <div className="flex justify-center gap-8 text-sm">
                <div>
                  <div className="font-mono text-lg font-bold text-emerald-600">
                    {progress.successful}
                  </div>
                  <div className="text-gray-400">Successful</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-blue-600">
                    {progress.emailsFound}
                  </div>
                  <div className="text-gray-400">Emails Found</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-red-600">
                    {progress.failed}
                  </div>
                  <div className="text-gray-400">Failed</div>
                </div>
              </div>
            </div>
          )}

          {step === 'results' && (
            <ScraperResults
              results={results}
              toggleSelect={toggleSelect}
              selectAllWithEmails={selectAllWithEmails}
              deselectAll={deselectAll}
              downloadCsv={downloadCsv}
              updateEmail={updateEmail}
              importStage={importStage}
              setImportStage={setImportStage}
              selectedCount={selectedCount}
            />
          )}

          {step === 'importing' && (
            <div className="py-8 text-center">
              <div className="mb-2 font-mono text-2xl font-bold text-gray-900">
                {importProgress.done} / {importProgress.total}
              </div>
              <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{
                    width: `${(importProgress.done / importProgress.total) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Importing artists to pipeline...
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 py-8 text-center">
              <div className="rounded-md bg-emerald-50 p-6">
                <div className="font-display text-lg font-medium text-emerald-600">
                  Import Complete
                </div>
                <div className="mt-3 flex justify-center gap-8 text-sm">
                  <div>
                    <div className="font-mono text-lg font-bold text-emerald-600">
                      {importResults.imported}
                    </div>
                    <div className="text-gray-400">Imported</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-amber-600">
                      {importResults.skipped}
                    </div>
                    <div className="text-gray-400">Skipped</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-red-600">
                      {importResults.failed}
                    </div>
                    <div className="text-gray-400">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>

          {step === 'input' && (
            <button
              onClick={handleScrape}
              disabled={parseUrls().length === 0}
              className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Scrape {parseUrls().length} URLs
            </button>
          )}

          {step === 'results' && (
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import {selectedCount} Artists
            </button>
          )}
        </div>
      </div>
    </>
  )
}
