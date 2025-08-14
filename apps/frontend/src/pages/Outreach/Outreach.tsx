import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TemplateForm, TemplateFormData } from '@/components/outreach/EmailTemplates/TemplateForm';
import { CampaignForm, CampaignFormData } from '@/components/outreach/EmailCampaigns/CampaignForm';
import { 
  PlusIcon, 
  EnvelopeIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface GmailStatus {
  isConnected: boolean;
  email?: string;
  canSendEmails: boolean;
}

interface OutreachCampaign {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  template: {
    id: string;
    name: string;
    type: string;
  };
  statistics: {
    totalEmails: number;
    sentEmails: number;
    draftEmails: number;
    scheduledEmails: number;
    repliedEmails: number;
  };
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  variables: string[];
  isDefault: boolean;
  createdAt: string;
}

export function Outreach() {
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showGmailSetup, setShowGmailSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load Gmail status
      const gmailResponse = await fetch('/api/gmail/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (gmailResponse.ok) {
        const gmailData = await gmailResponse.json();
        setGmailStatus(gmailData.data);
      }

      // Load campaigns
      const campaignsResponse = await fetch('/api/outreach/campaigns', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        setCampaigns(campaignsData.data);
      }

      // Load templates
      const templatesResponse = await fetch('/api/outreach/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.data);
      }
    } catch (error) {
      console.error('Error loading outreach data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGmailConnect = async () => {
    try {
      const response = await fetch('/api/gmail/auth-url', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        window.open(data.data.authUrl, '_blank', 'width=500,height=600');
        
        // Poll for connection status
        const pollInterval = setInterval(async () => {
          const statusResponse = await fetch('/api/gmail/status', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.data.isConnected) {
              setGmailStatus(statusData.data);
              setShowGmailSetup(false);
              clearInterval(pollInterval);
            }
          }
        }, 2000);
        
        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
    }
  };

  const handleCreateTemplate = async (templateData: TemplateFormData) => {
    try {
      const response = await fetch('/api/outreach/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(templateData)
      });

      if (response.ok) {
        await loadData(); // Reload templates
      } else {
        throw new Error('Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  };

  const handleCreateCampaign = async (campaignData: CampaignFormData) => {
    try {
      const response = await fetch('/api/outreach/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(campaignData)
      });

      if (response.ok) {
        await loadData(); // Reload campaigns
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: ClockIcon },
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      PAUSED: { color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon },
      COMPLETED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon },
      CANCELLED: { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Outreach
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage email campaigns and track responses
            </p>
          </div>
          
          {/* Gmail Status */}
          <div className="flex items-center space-x-4">
            {gmailStatus?.isConnected ? (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Connected: {gmailStatus.email}
              </div>
            ) : (
              <Button
                onClick={() => setShowGmailSetup(true)}
                variant="outline"
                size="sm"
              >
                <Cog6ToothIcon className="w-4 h-4 mr-2" />
                Connect Gmail
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'campaigns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Templates ({templates.length})
          </button>
        </nav>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Email Campaigns</h2>
            <Button
              onClick={() => setShowCreateCampaign(true)}
              disabled={!gmailStatus?.isConnected || templates.length === 0}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <Card className="text-center py-12">
              <EnvelopeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first email campaign to start reaching out to artists.
              </p>
              {!gmailStatus?.isConnected ? (
                <p className="text-sm text-orange-600 mb-4">
                  Connect your Gmail account first to send emails.
                </p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-orange-600 mb-4">
                  Create an email template first before starting a campaign.
                </p>
              ) : null}
              <Button
                onClick={() => {
                  if (!gmailStatus?.isConnected) {
                    setShowGmailSetup(true);
                  } else if (templates.length === 0) {
                    setActiveTab('templates');
                  } else {
                    setShowCreateCampaign(true);
                  }
                }}
              >
                {!gmailStatus?.isConnected ? 'Connect Gmail' : 
                 templates.length === 0 ? 'Create Template' : 'Create Campaign'}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map(campaign => (
                <Card key={campaign.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {campaign.name}
                    </h3>
                    {getStatusBadge(campaign.status)}
                  </div>
                  
                  {campaign.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {campaign.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Template:</span>
                      <span className="font-medium">{campaign.template.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Emails:</span>
                      <span className="font-medium">{campaign.statistics.totalEmails}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sent:</span>
                      <span className="font-medium text-green-600">
                        {campaign.statistics.sentEmails}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Replies:</span>
                      <span className="font-medium text-blue-600">
                        {campaign.statistics.repliedEmails}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Created {new Date(campaign.createdAt).toLocaleDateString()}
                      </span>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Email Templates</h2>
            <Button onClick={() => setShowCreateTemplate(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card className="text-center py-12">
              <EnvelopeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first email template to use in campaigns.
              </p>
              <Button onClick={() => setShowCreateTemplate(true)}>
                Create Template
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map(template => (
                <Card key={template.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {template.name}
                    </h3>
                    {template.isDefault && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Default
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Type: </span>
                      <span className="font-medium">{template.type.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Subject: </span>
                      <span className="font-medium line-clamp-1">{template.subject}</span>
                    </div>
                    {template.variables.length > 0 && (
                      <div>
                        <span className="text-gray-500">Variables: </span>
                        <span className="font-medium">
                          {template.variables.map(v => `{{${v}}}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Created {new Date(template.createdAt).toLocaleDateString()}
                      </span>
                      <div className="space-x-2">
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                        <Button size="sm" variant="outline">
                          Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gmail Setup Modal */}
      <Modal
        isOpen={showGmailSetup}
        onClose={() => setShowGmailSetup(false)}
        title="Connect Gmail Account"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Connect your Gmail account to send outreach emails directly from Campaign Manager.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Gmail API Benefits
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Send up to 500 emails per day (free)</li>
                    <li>Professional emails from your Gmail account</li>
                    <li>Automatic delivery tracking</li>
                    <li>Reply monitoring</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowGmailSetup(false)}>
              Cancel
            </Button>
            <Button onClick={handleGmailConnect}>
              Connect Gmail
            </Button>
          </div>
        </div>
      </Modal>

      {/* Template Form */}
      <TemplateForm
        isOpen={showCreateTemplate}
        onClose={() => setShowCreateTemplate(false)}
        onSubmit={handleCreateTemplate}
      />

      {/* Campaign Form */}
      <CampaignForm
        isOpen={showCreateCampaign}
        onClose={() => setShowCreateCampaign(false)}
        onSubmit={handleCreateCampaign}
      />
    </div>
  );
}