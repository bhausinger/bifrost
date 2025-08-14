import React, { useEffect, useState } from 'react';
import { useCampaignStore } from '@/stores/campaignStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { CampaignForm } from '../CampaignForm/CampaignForm';

export function CampaignList() {
  const {
    campaigns,
    isLoading,
    error,
    fetchCampaigns,
    deleteCampaign,
    selectCampaign,
    clearError,
  } = useCampaignStore();

  const { isAuthenticated } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (isAuthenticated) {
      fetchCampaigns();
    }
  }, [isAuthenticated, fetchCampaigns]);

  const handleDeleteCampaign = async (id: string) => {
    try {
      await deleteCampaign(id);
      setCampaignToDelete(null);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    let aValue: any = a[sortField as keyof typeof a];
    let bValue: any = b[sortField as keyof typeof b];

    // Handle date fields
    if (sortField === 'created_at' || sortField === 'start_date') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle numeric fields
    if (sortField === 'budget' || sortField === 'campaign_size') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    // Handle string fields
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatBudget = (budget: number | null | undefined) => {
    if (!budget) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(budget);
  };

  const formatNumber = (num: number | null | undefined) => {
    if (!num) return '-';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getTrackName = (url: string | null | undefined) => {
    if (!url) return 'No track link';
    try {
      const urlPath = new URL(url).pathname;
      const parts = urlPath.split('/');
      const trackName = parts[parts.length - 1];
      return trackName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Track';
    } catch {
      return 'Invalid link';
    }
  };

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 hover:bg-gray-50 px-2 py-1 rounded text-left w-full"
    >
      <span>{children}</span>
      {sortField === field && (
        <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view your campaigns.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">
            Manage your music promotion campaigns ({campaigns.length} total)
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Campaign
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex justify-between items-center">
            <p className="text-red-800">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={clearError}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      {campaigns.length === 0 ? (
        <Card className="text-center py-12">
          <div className="space-y-4">
            <div className="text-gray-400">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                No campaigns yet
              </h3>
              <p className="text-gray-600">
                Get started by creating your first campaign.
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Your First Campaign
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="artist_name">Artist</SortButton>
                  </th>
                  <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="track_link">Track</SortButton>
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="genre">Genre</SortButton>
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="type">Type</SortButton>
                  </th>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="status">Status</SortButton>
                  </th>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="campaign_size">Goal</SortButton>
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="budget">Budget</SortButton>
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="start_date">Started</SortButton>
                  </th>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    {/* Artist */}
                    <td className="px-4 py-3 text-sm text-gray-900 truncate">
                      {campaign.artist_name || '-'}
                    </td>
                    
                    {/* Track */}
                    <td className="px-4 py-3">
                      {campaign.track_link ? (
                        <a
                          href={campaign.track_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-500 text-sm underline truncate block"
                          title={getTrackName(campaign.track_link)}
                        >
                          {getTrackName(campaign.track_link)}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    
                    {/* Genre */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {campaign.genre || '-'}
                    </td>
                    
                    {/* Type */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {campaign.type}
                    </td>
                    
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          campaign.status
                        )}`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    
                    {/* Goal */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatNumber(campaign.campaign_size)}
                    </td>
                    
                    {/* Budget */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatBudget(campaign.budget)}
                    </td>
                    
                    {/* Started */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(campaign.start_date)}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => selectCampaign(campaign)}
                          title="Edit campaign"
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement email functionality
                            console.log('Email campaign:', campaign.id);
                          }}
                          title="Send email about this campaign"
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Campaign Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Campaign"
        size="lg"
      >
        <CampaignForm
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCampaigns();
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!campaignToDelete}
        onClose={() => setCampaignToDelete(null)}
        title="Delete Campaign"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this campaign? This action cannot be undone.
          </p>
          <div className="flex space-x-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setCampaignToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => campaignToDelete && handleDeleteCampaign(campaignToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}