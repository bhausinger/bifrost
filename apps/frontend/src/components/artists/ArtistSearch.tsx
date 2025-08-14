import { useState, useMemo } from 'react';
import { useArtists } from '@/hooks/api';
import { Input, Button, Card, LoadingSpinner } from '@/components/ui';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface Artist {
  id: string;
  name: string;
  displayName?: string;
  genres: string[];
  contactInfo?: {
    email?: string;
    hasEmail?: boolean;
    socialLinks?: string[];
  };
  lastContactedAt?: string;
  createdAt: string;
}

interface ArtistSearchProps {
  onSelectArtist?: (artist: Artist) => void;
  onSelectMultiple?: (artists: Artist[]) => void;
  selectedArtists?: Artist[];
  multiSelect?: boolean;
  showFilters?: boolean;
}

export function ArtistSearch({ 
  onSelectArtist, 
  onSelectMultiple,
  selectedArtists = [],
  multiSelect = false,
  showFilters = true
}: ArtistSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [hasEmailFilter, setHasEmailFilter] = useState<boolean | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const { data: artists = [], isLoading, error } = useArtists();

  // Filter and search artists
  const filteredArtists = useMemo(() => {
    return artists.filter(artist => {
      const matchesSearch = !searchTerm || 
        artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (artist.displayName?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesGenre = !genreFilter || 
        artist.genres.some((genre: string) => 
          genre.toLowerCase().includes(genreFilter.toLowerCase())
        );
      
      const matchesEmail = hasEmailFilter === null ||
        (hasEmailFilter === true && artist.contactInfo?.hasEmail) ||
        (hasEmailFilter === false && !artist.contactInfo?.hasEmail);
      
      return matchesSearch && matchesGenre && matchesEmail;
    });
  }, [artists, searchTerm, genreFilter, hasEmailFilter]);

  // Get unique genres for filter
  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    artists.forEach(artist => {
      artist.genres.forEach((genre: string) => genres.add(genre));
    });
    return Array.from(genres).sort();
  }, [artists]);

  const handleArtistSelect = (artist: Artist) => {
    if (multiSelect) {
      const isSelected = selectedArtists.some(a => a.id === artist.id);
      let newSelection: Artist[];
      
      if (isSelected) {
        newSelection = selectedArtists.filter(a => a.id !== artist.id);
      } else {
        newSelection = [...selectedArtists, artist];
      }
      
      onSelectMultiple?.(newSelection);
    } else {
      onSelectArtist?.(artist);
    }
  };

  const handleSelectAll = () => {
    if (multiSelect) {
      onSelectMultiple?.(filteredArtists);
    }
  };

  const handleClearSelection = () => {
    if (multiSelect) {
      onSelectMultiple?.([]);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setGenreFilter('');
    setHasEmailFilter(null);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <LoadingSpinner />
          <span className="ml-2">Loading artists...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          Error loading artists: {error.message}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search artists by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Toggle */}
          {showFilters && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="flex items-center gap-2"
              >
                <FunnelIcon className="h-4 w-4" />
                Filters
                {(genreFilter || hasEmailFilter !== null) && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </Button>

              {multiSelect && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedArtists.length} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All ({filteredArtists.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearSelection}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Genre
                </label>
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All genres</option>
                  {availableGenres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Status
                </label>
                <select
                  value={hasEmailFilter === null ? '' : hasEmailFilter.toString()}
                  onChange={(e) => setHasEmailFilter(
                    e.target.value === '' ? null : e.target.value === 'true'
                  )}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All artists</option>
                  <option value="true">Has email</option>
                  <option value="false">No email</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Results */}
      <Card className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Artists ({filteredArtists.length})
          </h3>
        </div>

        {filteredArtists.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No artists found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArtists.map(artist => {
              const isSelected = selectedArtists.some(a => a.id === artist.id);
              
              return (
                <div
                  key={artist.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleArtistSelect(artist)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {artist.displayName || artist.name}
                      </h4>
                      {multiSelect && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent click
                          className="h-4 w-4 text-blue-600"
                        />
                      )}
                    </div>
                    
                    {artist.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {artist.genres.slice(0, 3).map((genre: string) => (
                          <span
                            key={genre}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                          >
                            {genre}
                          </span>
                        ))}
                        {artist.genres.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            +{artist.genres.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>
                        {artist.contactInfo?.hasEmail ? '✉️ Has email' : '❌ No email'}
                      </span>
                      {artist.lastContactedAt && (
                        <span>
                          Last contacted: {new Date(artist.lastContactedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}