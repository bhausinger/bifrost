import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface DiscoverySearchFormProps {
  onSearch: (params: {
    query: string;
    genre?: string;
    source?: string;
    limit?: number;
  }) => void;
  isLoading: boolean;
}

const GENRES = [
  'Electronic',
  'Hip Hop',
  'Pop',
  'Rock',
  'Indie',
  'House',
  'Techno',
  'Dubstep',
  'Trap',
  'Future Bass',
  'Ambient',
  'Jazz',
  'Classical',
  'Folk',
  'R&B',
  'Reggae',
  'Country',
  'Alternative'
];

export function DiscoverySearchForm({ onSearch, isLoading }: DiscoverySearchFormProps) {
  const [searchType, setSearchType] = useState<'keyword' | 'similar_to_anchor'>('keyword');
  const [query, setQuery] = useState('');
  const [anchorArtist, setAnchorArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [limit, setLimit] = useState(20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchType === 'keyword' && !query.trim()) {
      return;
    }
    
    if (searchType === 'similar_to_anchor' && !anchorArtist.trim()) {
      return;
    }

    onSearch({
      query: searchType === 'keyword' ? query.trim() : `similar to ${anchorArtist.trim()}`,
      anchorArtist: searchType === 'similar_to_anchor' ? anchorArtist.trim() : undefined,
      searchType,
      genre: genre || undefined,
      source: 'soundcloud',
      limit,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Search for Artists
        </h2>
        <p className="text-gray-600 text-sm">
          Enter keywords to search for artists on SoundCloud. You can search by artist name, 
          music style, or any relevant terms.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Discovery Method *
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="keyword"
                checked={searchType === 'keyword'}
                onChange={(e) => setSearchType(e.target.value as 'keyword' | 'similar_to_anchor')}
                disabled={isLoading}
                className="mr-2"
              />
              <span className="text-sm">Keyword Search - Find artists by genre or style</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="similar_to_anchor"
                checked={searchType === 'similar_to_anchor'}
                onChange={(e) => setSearchType(e.target.value as 'keyword' | 'similar_to_anchor')}
                disabled={isLoading}
                className="mr-2"
              />
              <span className="text-sm">Similar Artists - Find artists similar to a specific artist</span>
            </label>
          </div>
        </div>

        {/* Conditional Input Fields */}
        {searchType === 'keyword' ? (
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
              Search Query *
            </label>
            <Input
              id="query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'electronic music', 'deep house', 'melodic techno'"
              required
              disabled={isLoading}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="anchorArtist" className="block text-sm font-medium text-gray-700 mb-1">
              Anchor Artist *
            </label>
            <Input
              id="anchorArtist"
              type="text"
              value={anchorArtist}
              onChange={(e) => setAnchorArtist(e.target.value)}
              placeholder="e.g., 'bitbird', 'Deadmau5', 'ODESZA'"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter an artist name to find similar artists with comparable style and sound
            </p>
          </div>
        )}

        {/* Genre Filter */}
        <div>
          <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1">
            Genre Filter (Optional)
          </label>
          <select
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            disabled={isLoading}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Genres</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Results Limit */}
        <div>
          <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Results
          </label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={isLoading}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value={10}>10 results</option>
            <option value={20}>20 results</option>
            <option value={30}>30 results</option>
            <option value={50}>50 results</option>
          </select>
        </div>

        {/* Search Examples */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            {searchType === 'keyword' ? 'Keyword Search Examples:' : 'Anchor Artist Examples:'}
          </h4>
          <div className="space-y-1 text-sm text-blue-800">
            {searchType === 'keyword' ? (
              <>
                <p>• "melodic techno" - Find artists in melodic techno</p>
                <p>• "underground house" - Discover underground house producers</p>
                <p>• "future bass remix" - Find future bass remix artists</p>
                <p>• "berlin techno" - Search for Berlin-based techno artists</p>
              </>
            ) : (
              <>
                <p>• "bitbird" - Find artists similar to the bitbird label style</p>
                <p>• "ODESZA" - Discover artists with similar melodic electronic sound</p>
                <p>• "Flume" - Find artists with comparable experimental production</p>
                <p>• "Porter Robinson" - Search for artists with similar emotional electronic music</p>
              </>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              isLoading || 
              (searchType === 'keyword' && !query.trim()) ||
              (searchType === 'similar_to_anchor' && !anchorArtist.trim())
            }
            className="min-w-[120px]"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Searching...</span>
              </div>
            ) : (
              'Discover Artists'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}