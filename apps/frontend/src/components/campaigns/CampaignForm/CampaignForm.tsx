import React, { useState } from 'react';
import { useCampaignStore } from '@/stores/campaignStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CampaignFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

interface FormData {
  type: string;
  startDate: string;
  budget: string;
  genre: string;
  artistName: string;
  trackLink: string;
  campaignSize: string;
  notes: string;
}

const CAMPAIGN_TYPES = [
  { value: 'SOUNDCLOUD', label: 'SoundCloud' },
  { value: 'SPOTIFY', label: 'Spotify' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'EMAIL', label: 'Email Campaign' },
  { value: 'INFLUENCER', label: 'Influencer Outreach' },
  { value: 'BLOG', label: 'Blog Outreach' },
];

const GENRES = [
  { value: 'ELECTRONIC', label: 'Electronic' },
  { value: 'HIP_HOP', label: 'Hip Hop' },
  { value: 'POP', label: 'Pop' },
  { value: 'ROCK', label: 'Rock' },
  { value: 'INDIE', label: 'Indie' },
  { value: 'RNB', label: 'R&B' },
  { value: 'JAZZ', label: 'Jazz' },
  { value: 'FOLK', label: 'Folk' },
  { value: 'COUNTRY', label: 'Country' },
  { value: 'REGGAE', label: 'Reggae' },
  { value: 'LATIN', label: 'Latin' },
  { value: 'CLASSICAL', label: 'Classical' },
  { value: 'ALTERNATIVE', label: 'Alternative' },
  { value: 'HOUSE', label: 'House' },
  { value: 'TECHNO', label: 'Techno' },
  { value: 'DUBSTEP', label: 'Dubstep' },
  { value: 'TRAP', label: 'Trap' },
  { value: 'AMBIENT', label: 'Ambient' },
  { value: 'OTHER', label: 'Other' },
];

export function CampaignForm({ onSuccess, onCancel, initialData }: CampaignFormProps) {
  const { createCampaign, updateCampaign, isLoading, error } = useCampaignStore();
  
  const [formData, setFormData] = useState<FormData>({
    type: initialData?.type || 'SOUNDCLOUD',
    startDate: initialData?.start_date ? initialData.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
    budget: initialData?.budget?.toString() || '',
    genre: initialData?.genre || 'ELECTRONIC',
    artistName: initialData?.artist_name || '',
    trackLink: initialData?.track_link || '',
    campaignSize: initialData?.campaign_size?.toString() || '',
    notes: initialData?.notes || initialData?.description || '',
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.artistName.trim()) {
      newErrors.artistName = 'Artist name is required';
    }

    if (!formData.type) {
      newErrors.type = 'Campaign type is required';
    }

    if (!formData.genre) {
      newErrors.genre = 'Genre is required';
    }

    if (!formData.trackLink.trim()) {
      newErrors.trackLink = 'Track link is required';
    }

    if (!formData.campaignSize.trim()) {
      newErrors.campaignSize = 'Campaign length (play count goal) is required';
    } else if (isNaN(Number(formData.campaignSize)) || Number(formData.campaignSize) <= 0) {
      newErrors.campaignSize = 'Campaign length must be a valid positive number';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.budget && (isNaN(Number(formData.budget)) || Number(formData.budget) < 0)) {
      newErrors.budget = 'Budget must be a valid positive number';
    }

    // Basic URL validation for track link
    if (formData.trackLink && !formData.trackLink.startsWith('http')) {
      newErrors.trackLink = 'Track link must be a valid URL (starting with http:// or https://)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Generate campaign name automatically
      const campaignName = `${formData.artistName} - ${formData.type} Campaign`;
      
      const campaignData = {
        name: campaignName,
        description: formData.notes || undefined,
        type: formData.type,
        startDate: formData.startDate,
        budget: formData.budget ? Number(formData.budget) : undefined,
        genre: formData.genre,
        artistName: formData.artistName,
        trackLink: formData.trackLink,
        campaignSize: Number(formData.campaignSize),
      };

      if (initialData?.id) {
        await updateCampaign(initialData.id, campaignData);
      } else {
        await createCampaign(campaignData);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Failed to save campaign:', error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Artist Name */}
      <div>
        <label htmlFor="artistName" className="block text-sm font-medium text-gray-700 mb-1">
          Artist Name *
        </label>
        <Input
          id="artistName"
          type="text"
          value={formData.artistName}
          onChange={(e) => handleInputChange('artistName', e.target.value)}
          error={errors.artistName}
          placeholder="Enter artist name"
        />
      </div>

      {/* Campaign Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Campaign Type *
        </label>
        <select
          id="type"
          value={formData.type}
          onChange={(e) => handleInputChange('type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {CAMPAIGN_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.type && <p className="text-red-600 text-sm mt-1">{errors.type}</p>}
      </div>

      {/* Genre */}
      <div>
        <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1">
          Genre *
        </label>
        <select
          id="genre"
          value={formData.genre}
          onChange={(e) => handleInputChange('genre', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {GENRES.map((genre) => (
            <option key={genre.value} value={genre.value}>
              {genre.label}
            </option>
          ))}
        </select>
      </div>

      {/* Track Link */}
      <div>
        <label htmlFor="trackLink" className="block text-sm font-medium text-gray-700 mb-1">
          Track Link *
        </label>
        <Input
          id="trackLink"
          type="url"
          value={formData.trackLink}
          onChange={(e) => handleInputChange('trackLink', e.target.value)}
          error={errors.trackLink}
          placeholder="https://soundcloud.com/artist/track"
        />
      </div>

      {/* Campaign Size/Play Count Goal */}
      <div>
        <label htmlFor="campaignSize" className="block text-sm font-medium text-gray-700 mb-1">
          Campaign Size/Play Count Goal *
        </label>
        <Input
          id="campaignSize"
          type="text"
          value={formData.campaignSize}
          onChange={(e) => handleInputChange('campaignSize', e.target.value)}
          error={errors.campaignSize}
          placeholder="10000"
        />
      </div>

      {/* Budget/Paid */}
      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
          Budget/Paid (USD)
        </label>
        <Input
          id="budget"
          type="text"
          value={formData.budget}
          onChange={(e) => handleInputChange('budget', e.target.value)}
          error={errors.budget}
          placeholder="100.00"
        />
      </div>

      {/* Start Date */}
      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
          Start Date *
        </label>
        <Input
          id="startDate"
          type="date"
          value={formData.startDate}
          onChange={(e) => handleInputChange('startDate', e.target.value)}
          error={errors.startDate}
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Add any additional notes or details about this campaign"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex space-x-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        >
          {initialData?.id ? 'Update Campaign' : 'Create Campaign'}
        </Button>
      </div>
    </form>
  );
}