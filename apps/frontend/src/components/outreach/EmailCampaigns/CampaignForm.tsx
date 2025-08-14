import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface CampaignFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (campaign: CampaignFormData) => void;
}

export interface CampaignFormData {
  name: string;
  description?: string;
  templateId: string;
  targetArtistIds: string[];
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  sendingSchedule: {
    emailsPerDay: number;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  tags: string[];
}

interface Artist {
  id: string;
  name: string;
  displayName?: string;
  contactInfo?: {
    email: string;
    hasEmail: boolean;
    socialLinks?: string[];
  };
  genres: string[];
  lastContactedAt?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  type: string;
  variables: string[];
}

export function CampaignForm({ isOpen, onClose, onSubmit }: CampaignFormProps) {
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    templateId: '',
    targetArtistIds: [],
    sendingSchedule: {
      emailsPerDay: 50,
      startTime: '09:00',
      endTime: '17:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    tags: []
  });

  const [artists, setArtists] = useState<Artist[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [showContactedRecently, setShowContactedRecently] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    filterArtists();
  }, [artists, searchTerm, selectedGenre, showContactedRecently]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load artists with email contact info
      const artistsResponse = await fetch('/api/artists', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (artistsResponse.ok) {
        const artistsData = await artistsResponse.json();
        // Filter to only artists with email contact info
        const artistsWithEmails = artistsData.data.filter((artist: Artist) => {
          if (!artist.contactInfo) return false;
          const contactInfo = typeof artist.contactInfo === 'string' 
            ? JSON.parse(artist.contactInfo) 
            : artist.contactInfo;
          return contactInfo?.email && contactInfo?.hasEmail === true;
        });
        setArtists(artistsWithEmails);
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
      console.error('Error loading campaign form data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterArtists = () => {
    let filtered = artists;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(artist =>
        artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (artist.displayName?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by genre
    if (selectedGenre) {
      filtered = filtered.filter(artist =>
        artist.genres.some(genre => 
          genre.toLowerCase().includes(selectedGenre.toLowerCase())
        )
      );
    }

    // Filter out recently contacted artists
    if (!showContactedRecently) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      filtered = filtered.filter(artist => {
        if (!artist.lastContactedAt) return true;
        return new Date(artist.lastContactedAt) < thirtyDaysAgo;
      });
    }

    setFilteredArtists(filtered);
  };

  const toggleArtistSelection = (artistId: string) => {
    setFormData(prev => ({
      ...prev,
      targetArtistIds: prev.targetArtistIds.includes(artistId)
        ? prev.targetArtistIds.filter(id => id !== artistId)
        : [...prev.targetArtistIds, artistId]
    }));
  };

  const selectAllVisible = () => {
    const visibleIds = filteredArtists.map(artist => artist.id);
    setFormData(prev => ({
      ...prev,
      targetArtistIds: [...new Set([...prev.targetArtistIds, ...visibleIds])]
    }));
  };

  const clearSelection = () => {
    setFormData(prev => ({
      ...prev,
      targetArtistIds: []
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (!formData.templateId) {
      newErrors.templateId = 'Please select an email template';
    }

    if (formData.targetArtistIds.length === 0) {
      newErrors.targetArtistIds = 'Please select at least one artist';
    }

    if (formData.sendingSchedule.emailsPerDay < 1 || formData.sendingSchedule.emailsPerDay > 500) {
      newErrors.emailsPerDay = 'Emails per day must be between 1 and 500';
    }

    if (formData.scheduledStartDate && formData.scheduledEndDate) {
      const startDate = new Date(formData.scheduledStartDate);
      const endDate = new Date(formData.scheduledEndDate);
      if (startDate >= endDate) {
        newErrors.dates = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        templateId: '',
        targetArtistIds: [],
        sendingSchedule: {
          emailsPerDay: 50,
          startTime: '09:00',
          endTime: '17:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        tags: []
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAllGenres = () => {
    const genres = new Set<string>();
    artists.forEach(artist => {
      artist.genres.forEach(genre => genres.add(genre));
    });
    return Array.from(genres).sort();
  };

  const getArtistEmail = (artist: Artist): string => {
    if (!artist.contactInfo) return '';
    const contactInfo = typeof artist.contactInfo === 'string' 
      ? JSON.parse(artist.contactInfo) 
      : artist.contactInfo;
    return contactInfo?.email || '';
  };

  const wasContactedRecently = (artist: Artist): boolean => {
    if (!artist.lastContactedAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(artist.lastContactedAt) > thirtyDaysAgo;
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Create Campaign">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Email Campaign"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Electronic Artists Outreach"
              error={errors.name}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Template *
            </label>
            <select
              value={formData.templateId}
              onChange={(e) => setFormData(prev => ({ ...prev, templateId: e.target.value }))}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.templateId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a template</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.type.replace('_', ' ')})
                </option>
              ))}
            </select>
            {errors.templateId && (
              <p className="mt-1 text-sm text-red-600">{errors.templateId}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the purpose of this campaign..."
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Scheduling */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date (Optional)
            </label>
            <Input
              type="datetime-local"
              value={formData.scheduledStartDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledStartDate: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date (Optional)
            </label>
            <Input
              type="datetime-local"
              value={formData.scheduledEndDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledEndDate: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emails per Day
            </label>
            <Input
              type="number"
              min="1"
              max="500"
              value={formData.sendingSchedule.emailsPerDay}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                sendingSchedule: {
                  ...prev.sendingSchedule,
                  emailsPerDay: parseInt(e.target.value) || 50
                }
              }))}
              error={errors.emailsPerDay}
            />
          </div>
        </div>

        {errors.dates && (
          <p className="text-sm text-red-600">{errors.dates}</p>
        )}

        {/* Artist Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Select Artists ({formData.targetArtistIds.length} selected)
            </label>
            <div className="space-x-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={selectAllVisible}
              >
                Select All Visible
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearSelection}
              >
                Clear Selection
              </Button>
            </div>
          </div>

          {errors.targetArtistIds && (
            <p className="mb-2 text-sm text-red-600">{errors.targetArtistIds}</p>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Search Artists
              </label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Filter by Genre
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Genres</option>
                {getAllGenres().map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showContactedRecently}
                  onChange={(e) => setShowContactedRecently(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                Show recently contacted
              </label>
            </div>
          </div>

          {/* Artist List */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            {filteredArtists.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {artists.length === 0 
                  ? 'No artists with email addresses found. Use the Discovery system to find artists first.'
                  : 'No artists match your filters.'
                }
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredArtists.map(artist => {
                  const isSelected = formData.targetArtistIds.includes(artist.id);
                  const recentlyContacted = wasContactedRecently(artist);
                  
                  return (
                    <div
                      key={artist.id}
                      className={`p-3 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleArtistSelection(artist.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {artist.displayName || artist.name}
                            </p>
                            {recentlyContacted && (
                              <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" title="Contacted recently" />
                            )}
                            <CheckCircleIcon className="w-4 h-4 text-green-500" title="Has email address" />
                          </div>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{getArtistEmail(artist)}</span>
                            {artist.genres.length > 0 && (
                              <span>• {artist.genres.slice(0, 2).join(', ')}</span>
                            )}
                            {recentlyContacted && (
                              <span>• Contacted {new Date(artist.lastContactedAt!).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Showing {filteredArtists.length} of {artists.length} artists with email addresses.
            {formData.targetArtistIds.length > 0 && (
              <> Campaign will create {formData.targetArtistIds.length} email drafts.</>
            )}
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || formData.targetArtistIds.length === 0}
          >
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}