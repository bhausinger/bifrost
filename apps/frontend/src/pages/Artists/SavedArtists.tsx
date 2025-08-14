import React, { useEffect, useState } from 'react';
import { useArtistStore } from '@/stores/artistStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function SavedArtists() {
  const {
    artists,
    isLoading,
    error,
    fetchArtists,
    clearError,
  } = useArtistStore();

  const { isAuthenticated } = useAuthStore();
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (isAuthenticated) {
      fetchArtists();
    }
  }, [isAuthenticated, fetchArtists]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedArtists = [...artists].sort((a, b) => {
    let aValue: any = a[sortField as keyof typeof a];
    let bValue: any = b[sortField as keyof typeof b];

    // Handle date fields
    if (sortField === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle numeric fields
    if (sortField === 'follower_count' || sortField === 'track_count') {
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <p className="text-gray-600">Please log in to view your saved artists.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Saved Artists</h1>
          <p className="text-gray-600 mt-1">
            Manage your discovered artists ({artists.length} saved)
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex justify-between items-center">
            <p className="text-red-800">{error}</p>
            <Button variant="secondary" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Artists Table */}
      {artists.length === 0 ? (
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                No saved artists yet
              </h3>
              <p className="text-gray-600">
                Use the Discovery tab to find and save artists for your campaigns.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="name">Artist</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="genre">Genre</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="follower_count">Followers</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="track_count">Tracks</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="location">Location</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="created_at">Saved</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedArtists.map((artist) => (
                  <tr key={artist.id} className="hover:bg-gray-50">
                    {/* Artist */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {artist.avatar_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={artist.avatar_url}
                              alt={artist.name}
                              onError={(e) => {
                                e.currentTarget.src = `https://via.placeholder.com/40x40/6B7280/FFFFFF?text=${artist.name.charAt(0).toUpperCase()}`;
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {artist.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {artist.name}
                            </div>
                            {artist.is_verified && (
                              <div className="ml-2 text-blue-500">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {artist.discovery_source && (
                            <div className="text-xs text-gray-500">
                              via {artist.discovery_source}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Genre */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {artist.genre ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {artist.genre}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    
                    {/* Followers */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatNumber(artist.follower_count)}
                    </td>
                    
                    {/* Tracks */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatNumber(artist.track_count)}
                    </td>
                    
                    {/* Location */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {artist.location || '-'}
                    </td>
                    
                    {/* Saved Date */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(artist.created_at)}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex space-x-2">
                        {artist.soundcloud_url && (
                          <a
                            href={artist.soundcloud_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-500"
                            title="View SoundCloud profile"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          </a>
                        )}
                        <button
                          onClick={() => {
                            // TODO: Implement create campaign with pre-filled artist
                            console.log('Create campaign for artist:', artist.id);
                          }}
                          className="text-green-600 hover:text-green-500"
                          title="Create campaign for this artist"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
    </div>
  );
}