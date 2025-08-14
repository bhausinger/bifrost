import React, { useState } from 'react';
import { useCampaignStore } from '@/stores/campaignStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { CampaignForm } from '../CampaignForm/CampaignForm';

interface CampaignDetailProps {
  onBack?: () => void;
}

export function CampaignDetail({ onBack }: CampaignDetailProps) {
  const { selectedCampaign, updateCampaign, deleteCampaign, selectCampaign } = useCampaignStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!selectedCampaign) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No campaign selected.</p>
        {onBack && (
          <Button variant="secondary" onClick={onBack} className="mt-4">
            Back to Campaigns
          </Button>
        )}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100';
      case 'PAUSED':
        return 'text-yellow-600 bg-yellow-100';
      case 'COMPLETED':
        return 'text-blue-600 bg-blue-100';
      case 'DRAFT':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatBudget = (budget: number | null | undefined) => {
    if (!budget) return 'No budget set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(budget);
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateCampaign(selectedCampaign.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update campaign status:', error);
    }
  };

  const handleDeleteCampaign = async () => {
    try {
      await deleteCampaign(selectedCampaign.id);
      setShowDeleteModal(false);
      selectCampaign(null);
      onBack?.();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const getStatusOptions = () => {
    const allStatuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'];
    return allStatuses.filter(status => status !== selectedCampaign.status);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onBack}
              className="flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{selectedCampaign.name}</h1>
            <div className="flex items-center space-x-2 mt-2">
              <span
                className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                  selectedCampaign.status
                )}`}
              >
                {selectedCampaign.status}
              </span>
              <span className="text-gray-500 text-sm">
                Campaign ID: {selectedCampaign.id}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowEditModal(true)}
          >
            Edit Campaign
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(true)}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Campaign Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Details</h2>
            <div className="space-y-4">
              {selectedCampaign.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Description</h3>
                  <p className="text-gray-900 mt-1">{selectedCampaign.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Campaign Type</h3>
                  <p className="text-gray-900 mt-1">{selectedCampaign.type}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Budget</h3>
                  <p className="text-gray-900 mt-1">{formatBudget(selectedCampaign.budget)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Start Date</h3>
                  <p className="text-gray-900 mt-1">{formatDate(selectedCampaign.start_date)}</p>
                </div>
                {selectedCampaign.end_date && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">End Date</h3>
                    <p className="text-gray-900 mt-1">{formatDate(selectedCampaign.end_date)}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">Created</h3>
                <p className="text-gray-900 mt-1">{formatDate(selectedCampaign.created_at)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">Last Updated</h3>
                <p className="text-gray-900 mt-1">{formatDate(selectedCampaign.updated_at)}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Change Status</h3>
                <div className="space-y-2">
                  {getStatusOptions().map((status) => (
                    <Button
                      key={status}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      className="w-full justify-start"
                    >
                      Mark as {status}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Campaign Stats Placeholder */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Metrics</h2>
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Metrics tracking coming soon</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Campaign Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Campaign"
      >
        <CampaignForm
          initialData={selectedCampaign}
          onSuccess={() => {
            setShowEditModal(false);
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Campaign"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete "{selectedCampaign.name}"? This action cannot be undone.
          </p>
          <div className="flex space-x-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteCampaign}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Campaign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}