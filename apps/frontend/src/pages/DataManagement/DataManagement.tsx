import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useGetImportTemplate,
  useValidateImport,
  useImportArtists,
  useExportCampaigns,
  useExportArtists,
  useExportAnalytics,
  useCreateBackup,
  useDataStats,
  downloadBlob,
  type ValidationResult,
  type ImportResult,
} from '@/hooks/api/useDataManagement';

interface ImportSectionProps {
  onImportComplete: (result: ImportResult) => void;
}

const ImportSection: React.FC<ImportSectionProps> = ({ onImportComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTemplate = useGetImportTemplate();
  const validateImport = useValidateImport();
  const importArtists = useImportArtists();

  const handleDownloadTemplate = async () => {
    try {
      const blob = await getTemplate.mutateAsync('artists');
      downloadBlob(blob, 'campaign-manager-artists-template.csv');
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationResult(null);
      setShowPreview(false);
    }
  };

  const handleValidateFile = async () => {
    if (!selectedFile) return;

    try {
      const result = await validateImport.mutateAsync(selectedFile);
      setValidationResult(result);
      setShowPreview(true);
    } catch (error: any) {
      setValidationResult({
        valid: false,
        rowCount: 0,
        preview: [],
        warnings: [],
        errors: [error.response?.data?.message || 'Validation failed'],
      });
      setShowPreview(true);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !validationResult?.valid) return;

    try {
      const result = await importArtists.mutateAsync(selectedFile);
      onImportComplete(result);
      
      // Reset form
      setSelectedFile(null);
      setValidationResult(null);
      setShowPreview(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Artists</h3>
      
      <div className="space-y-4">
        {/* Download Template */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Download CSV Template</h4>
              <p className="text-sm text-blue-700">
                Get the CSV template with example data and required columns
              </p>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              size="sm"
              disabled={getTemplate.isPending}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {getTemplate.isPending ? 'Downloading...' : 'Download Template'}
            </Button>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
          {selectedFile && (
            <p className="mt-1 text-sm text-gray-600">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Validate Button */}
        {selectedFile && !showPreview && (
          <Button
            onClick={handleValidateFile}
            disabled={validateImport.isPending}
            className="w-full"
          >
            {validateImport.isPending ? 'Validating...' : 'Validate File'}
          </Button>
        )}

        {/* Validation Results */}
        {showPreview && validationResult && (
          <div className="space-y-4">
            <div className={`border rounded-lg p-4 ${
              validationResult.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <span className={validationResult.valid ? 'text-green-600' : 'text-red-600'}>
                  {validationResult.valid ? '✓' : '✗'}
                </span>
                <h4 className={`font-medium ${
                  validationResult.valid ? 'text-green-900' : 'text-red-900'
                }`}>
                  {validationResult.valid ? 'Validation Successful' : 'Validation Failed'}
                </h4>
              </div>
              
              {validationResult.valid && (
                <p className="text-sm text-green-700">
                  Found {validationResult.rowCount} valid rows ready for import
                </p>
              )}

              {validationResult.errors && validationResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-700">Errors:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-yellow-700">Warnings:</p>
                  <ul className="text-sm text-yellow-600 list-disc list-inside">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Preview */}
            {validationResult.valid && validationResult.preview.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Data Preview</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Genres</th>
                        <th className="px-3 py-2 text-left">Location</th>
                        <th className="px-3 py-2 text-left">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {validationResult.preview.slice(0, 3).map((row, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2">
                            {Array.isArray(row.genres) ? row.genres.join(', ') : row.genres || '-'}
                          </td>
                          <td className="px-3 py-2">{row.location || '-'}</td>
                          <td className="px-3 py-2">{row.contactEmail || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validationResult.preview.length > 3 && (
                    <p className="text-sm text-gray-500 mt-2">
                      ... and {validationResult.preview.length - 3} more rows
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Import Button */}
            {validationResult.valid && (
              <Button
                onClick={handleImport}
                disabled={importArtists.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {importArtists.isPending ? 'Importing...' : `Import ${validationResult.rowCount} Artists`}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

interface ExportSectionProps {
  onExportComplete: (filename: string) => void;
}

const ExportSection: React.FC<ExportSectionProps> = ({ onExportComplete }) => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeSocialProfiles, setIncludeSocialProfiles] = useState(true);

  const exportCampaigns = useExportCampaigns();
  const exportArtists = useExportArtists();
  const exportAnalytics = useExportAnalytics();
  const createBackup = useCreateBackup();

  const handleExportCampaigns = async () => {
    try {
      const result = await exportCampaigns.mutateAsync({
        format: exportFormat,
        includeMetrics,
        includeSocialProfiles,
      });
      downloadBlob(result.data, result.filename);
      onExportComplete(result.filename);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportArtists = async () => {
    try {
      const result = await exportArtists.mutateAsync({
        format: exportFormat,
        includeMetrics,
        includeSocialProfiles,
      });
      downloadBlob(result.data, result.filename);
      onExportComplete(result.filename);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportAnalytics = async () => {
    try {
      const result = await exportAnalytics.mutateAsync({
        format: exportFormat,
        includeMetrics,
      });
      downloadBlob(result.data, result.filename);
      onExportComplete(result.filename);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const result = await createBackup.mutateAsync();
      downloadBlob(result.data, result.filename);
      onExportComplete(result.filename);
    } catch (error) {
      console.error('Backup failed:', error);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
      
      <div className="space-y-4">
        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
              className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Include Options
            </label>
            <div className="space-y-1">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeMetrics}
                  onChange={(e) => setIncludeMetrics(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include Metrics</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeSocialProfiles}
                  onChange={(e) => setIncludeSocialProfiles(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include Social Profiles</span>
              </label>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            onClick={handleExportCampaigns}
            disabled={exportCampaigns.isPending}
            variant="outline"
            className="w-full"
          >
            {exportCampaigns.isPending ? 'Exporting...' : 'Export Campaigns'}
          </Button>
          
          <Button
            onClick={handleExportArtists}
            disabled={exportArtists.isPending}
            variant="outline"
            className="w-full"
          >
            {exportArtists.isPending ? 'Exporting...' : 'Export Artists'}
          </Button>
          
          <Button
            onClick={handleExportAnalytics}
            disabled={exportAnalytics.isPending}
            variant="outline"
            className="w-full"
          >
            {exportAnalytics.isPending ? 'Exporting...' : 'Export Analytics'}
          </Button>
          
          <Button
            onClick={handleCreateBackup}
            disabled={createBackup.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {createBackup.isPending ? 'Creating...' : 'Full Backup'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export const DataManagement: React.FC = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  }>>([]);

  const { data: stats, isLoading: statsLoading } = useDataStats();

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleImportComplete = (result: ImportResult) => {
    if (result.success) {
      addNotification('success', `Successfully imported ${result.successCount} artists`);
    } else {
      addNotification('error', `Import completed with ${result.errorCount} errors`);
    }
  };

  const handleExportComplete = (filename: string) => {
    addNotification('success', `Successfully exported data to ${filename}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
        <p className="text-gray-600">
          Import, export, and manage your campaign data
        </p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-600">Total Campaigns</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.campaigns?.total || 0}</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-600">Total Artists</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.artists?.total || 0}</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-600">Stream Metrics</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.analytics?.totalMetrics || 0}</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-600">Storage Used</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.storage?.estimatedSize || '0 MB'}</p>
          </Card>
        </div>
      )}

      {/* Import Section */}
      <ImportSection onImportComplete={handleImportComplete} />

      {/* Export Section */}
      <ExportSection onExportComplete={handleExportComplete} />

      {/* Data Validation & Migration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Data Validation</h4>
            <p className="text-sm text-gray-600 mb-3">
              Check your data for inconsistencies and missing information
            </p>
            <Button variant="outline" size="sm" disabled>
              Run Validation (Coming Soon)
            </Button>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Data Migration</h4>
            <p className="text-sm text-gray-600 mb-3">
              Migrate data between different versions or formats
            </p>
            <Button variant="outline" size="sm" disabled>
              Migration Tools (Coming Soon)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};