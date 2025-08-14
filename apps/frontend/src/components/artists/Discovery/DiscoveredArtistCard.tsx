import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DiscoveredArtist } from '@/stores/artistStore';

interface DiscoveredArtistCardProps {
  artist: DiscoveredArtist;
  onSave: () => void;
}

export function DiscoveredArtistCard({ artist, onSave }: DiscoveredArtistCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setIsSaved(true);
    } catch (error) {
      console.error('Failed to save artist:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Artist Avatar */}
      <div className="aspect-square bg-gray-100 relative">
        {artist.avatar_url ? (
          <img
            src={artist.avatar_url}
            alt={artist.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://via.placeholder.com/300x300/6B7280/FFFFFF?text=${artist.name.charAt(0).toUpperCase()}`;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
            <span className="text-white text-4xl font-bold">
              {artist.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Verified Badge */}
        {artist.is_verified && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Artist Info */}
      <div className="p-4 space-y-3">
        {/* Name and Genre */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg truncate" title={artist.name}>
            {artist.name}
          </h3>
          {artist.genre && (
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
              {artist.genre}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatNumber(artist.follower_count)} followers</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>{formatNumber(artist.track_count)} tracks</span>
          </div>
        </div>

        {/* Location */}
        {artist.location && (
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{artist.location}</span>
          </div>
        )}

        {/* Description */}
        {artist.description && (
          <p className="text-sm text-gray-600 line-clamp-2" title={artist.description}>
            {artist.description}
          </p>
        )}

        {/* Tags */}
        {artist.tags && artist.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {artist.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                #{tag}
              </span>
            ))}
            {artist.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{artist.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <a
            href={artist.soundcloud_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="secondary" size="sm" className="w-full">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              View Profile
            </Button>
          </a>
          
          {isSaved ? (
            <Button variant="secondary" size="sm" disabled className="flex-1">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Saved
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save Artist
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}