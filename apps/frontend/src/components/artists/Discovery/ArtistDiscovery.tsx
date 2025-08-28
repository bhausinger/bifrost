import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LiveProgressBar } from '@/components/ui/ProgressBar';
import useWebSocket from '@/hooks/useWebSocket';

interface AIArtist {
  name: string;
  genre: string;
  estimated_followers: string;
  reason: string;
  similar_to: string[];
  confidence_score: number;
  hasEmail?: boolean;
  emailStatus?: 'found' | 'not_found' | 'checking' | 'error';
  contactInfo?: {
    email?: string;
    socialLinks?: string[];
  };
}


export function ArtistDiscovery() {
  const { isAuthenticated, token } = useAuthStore();
  const [artistList, setArtistList] = useState('');
  const [processedArtists, setProcessedArtists] = useState<AIArtist[]>([]);
  const [isScrapingEmails, setIsScrapingEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrapingProgress, setScrapingProgress] = useState<{current: number, total: number} | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [scrapingMode, setScrapingMode] = useState<'auto' | 'quick' | 'deep'>('auto');
  
  // WebSocket connection for real-time progress
  const { isConnected, progress, joinScrapingRoom, leaveScrapingRoom } = useWebSocket();

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      // Development bypass for benjamin.hausinger@gmail.com
      ...(!token && import.meta.env.DEV && {
        'X-Admin-Bypass': 'benjamin.hausinger@gmail.com'
      }),
    };
  };

  const parseArtistList = (text: string): string[] => {
    // Split by common delimiters and clean up
    return text
      .split(/[\n,;]/)
      .map(artist => artist.trim())
      .filter(artist => artist.length > 0)
      .filter(artist => artist.length < 100); // Reasonable length check
  };

  const processArtists = () => {
    const artists = parseArtistList(artistList);
    if (artists.length === 0) {
      setError('Please enter some artist names');
      return;
    }

    if (artists.length > 200) {
      setError('Too many artists! Please limit to 200 or fewer.');
      return;
    }

    // Convert to AIArtist format
    const aiArtists: AIArtist[] = artists.map(name => ({
      name,
      genre: 'Electronic',
      estimated_followers: 'Unknown',
      reason: 'Manually added',
      similar_to: [],
      confidence_score: 100,
      emailStatus: undefined
    }));

    setProcessedArtists(aiArtists);
    setError(null);
  };

  // Clean up WebSocket connection when task completes or component unmounts
  useEffect(() => {
    return () => {
      if (currentTaskId) {
        leaveScrapingRoom(currentTaskId);
      }
    };
  }, [currentTaskId, leaveScrapingRoom]);

  // Handle progress updates from WebSocket
  useEffect(() => {
    if (progress) {
      setScrapingProgress({ 
        current: progress.completedArtists, 
        total: progress.totalArtists 
      });
      
      // Update individual artist statuses based on results
      if (progress.results && progress.results.length > 0) {
        setProcessedArtists(prev => prev.map(artist => {
          const result = progress.results.find(r => r.artistName === artist.name);
          if (result) {
            return {
              ...artist,
              hasEmail: result.hasEmail,
              emailStatus: result.success ? (result.hasEmail ? 'found' : 'not_found') : 'error',
              contactInfo: {
                email: result.emails?.join(', ') || undefined,
                socialLinks: Object.values(result.socialHandles || {})
              }
            };
          }
          return artist;
        }));
      }
      
      if (progress.status === 'completed' || progress.status === 'error') {
        setIsScrapingEmails(false);
        if (currentTaskId) {
          leaveScrapingRoom(currentTaskId);
        }
        setCurrentTaskId(null);
      }
    }
  }, [progress, currentTaskId, leaveScrapingRoom]);

  const scrapeAllEmails = async () => {
    if (processedArtists.length === 0) return;
    
    setIsScrapingEmails(true);
    setError(null);
    setScrapingProgress({ current: 0, total: processedArtists.length });
    
    try {
      const artistNames = processedArtists.map(artist => artist.name);
      
      const response = await fetch('/api/artists/ai/scrape-emails', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          artistNames,
          mode: scrapingMode,
          useWebSocket: true 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape emails');
      }

      const data = await response.json();
      
      // Join WebSocket room for real-time progress
      if (data.taskId && isConnected) {
        setCurrentTaskId(data.taskId);
        const userId = 'current-user'; // You might want to get this from auth store
        joinScrapingRoom(data.taskId, userId);
      }
      
      // Update artists with email information
      setProcessedArtists(prev => 
        prev.map(artist => {
          const emailData = data.results.find((r: any) => r.artist === artist.name);
          if (emailData) {
            return {
              ...artist,
              hasEmail: emailData.hasEmail,
              emailStatus: emailData.emailStatus,
              contactInfo: emailData.contactInfo
            };
          }
          return artist;
        })
      );
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to scrape emails');
    } finally {
      setIsScrapingEmails(false);
      setScrapingProgress(null);
    }
  };

  const saveArtistsWithEmails = async () => {
    const artistsWithEmails = processedArtists.filter(artist => artist.hasEmail);
    
    if (artistsWithEmails.length === 0) {
      setError('No artists with emails to save');
      return;
    }
    
    try {
      const response = await fetch('/api/artists/ai/save-with-emails', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ artists: artistsWithEmails }),
      });

      if (!response.ok) {
        throw new Error('Failed to save artists');
      }

      await response.json();
      
      // Remove saved artists from current list
      setProcessedArtists(prev => 
        prev.filter(artist => !artistsWithEmails.some(saved => saved.name === artist.name))
      );
      
      setError(null);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save artists');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to use AI artist discovery.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Artist Discovery & Email Scraper</h1>
        <p className="text-gray-600 mt-1">
          Paste a list of artists from ChatGPT or anywhere else, then scrape their SoundCloud emails.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex justify-between items-center">
            <p className="text-red-800">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Artist Input */}
        <div>
          <Card className="h-96 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Add Artists</h3>
              <p className="text-sm text-gray-600 mt-1">
                Paste artist names (one per line, comma separated, or semicolon separated)
              </p>
            </div>
            
            <div className="flex-1 p-4">
              <textarea
                value={artistList}
                onChange={(e) => setArtistList(e.target.value)}
                placeholder={`San Holo
ODESZA
Flume
Porter Robinson
Madeon

Or: "San Holo, ODESZA, Flume" etc...`}
                className="w-full h-full resize-none border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <Button 
                onClick={processArtists}
                disabled={!artistList.trim()}
                className="w-full"
              >
                Process Artists ({parseArtistList(artistList).length})
              </Button>
            </div>
          </Card>
        </div>

        {/* Processed Artists */}
        <div>
          <Card className="h-96 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium">
                Artists ({processedArtists.length})
              </h3>
              {processedArtists.length > 0 && (
                <div className="flex space-x-2">
                  {/* Scraping Mode Selector */}
                  <select 
                    value={scrapingMode}
                    onChange={(e) => setScrapingMode(e.target.value as 'auto' | 'quick' | 'deep')}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    disabled={isScrapingEmails}
                  >
                    <option value="quick">Quick (Emails only)</option>
                    <option value="auto">Auto (Smart Playwright)</option>
                    <option value="deep">Deep (Maximum info)</option>
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={scrapeAllEmails}
                    disabled={isScrapingEmails}
                  >
                    {isScrapingEmails ? 'Scraping...' : 'Scrape All Emails'}
                  </Button>
                  {processedArtists.some(a => a.hasEmail) && (
                    <Button
                      size="sm"
                      onClick={saveArtistsWithEmails}
                    >
                      Save with Emails ({processedArtists.filter(a => a.hasEmail).length})
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Live Progress Bar with WebSocket Updates */}
            {progress && isScrapingEmails && (
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <LiveProgressBar
                  totalArtists={progress.totalArtists}
                  completedArtists={progress.completedArtists}
                  currentArtist={progress.currentArtist}
                  estimatedTimeRemaining={progress.estimatedTimeRemaining}
                  status={progress.status}
                  error={progress.error}
                />
              </div>
            )}
            
            {/* Fallback Progress Bar for non-WebSocket mode */}
            {scrapingProgress && !progress && (
              <div className="px-4 py-2 border-b border-gray-200">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Scraping emails... (Mode: {scrapingMode})</span>
                  <span>{scrapingProgress.current}/{scrapingProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(scrapingProgress.current / scrapingProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* WebSocket Connection Status */}
            {isScrapingEmails && (
              <div className="px-4 py-1 text-xs text-gray-500 border-b border-gray-100">
                WebSocket: {isConnected ? (
                  <span className="text-green-600">✓ Connected</span>
                ) : (
                  <span className="text-orange-600">⚠ Disconnected</span>
                )}
                {scrapingMode === 'auto' && <span className="ml-2">• Auto Playwright enabled</span>}
                {scrapingMode === 'deep' && <span className="ml-2">• Deep mode (maximum info)</span>}
                {scrapingMode === 'quick' && <span className="ml-2">• Quick mode (emails only)</span>}
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-4">
              {processedArtists.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">Add artists using the form on the left</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {processedArtists.map((artist, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-3 text-sm"
                    >
                      <div className="font-medium flex items-center justify-between">
                        <span>{artist.name}</span>
                        {artist.emailStatus === 'found' && (
                          <span className="text-green-600 text-xs">✓ Email</span>
                        )}
                        {artist.emailStatus === 'not_found' && (
                          <span className="text-red-600 text-xs">✗ No Email</span>
                        )}
                        {artist.emailStatus === 'checking' && (
                          <LoadingSpinner size="sm" />
                        )}
                      </div>
                      {artist.contactInfo?.email && (
                        <div className="text-green-600 mt-1">
                          <p className="text-xs">📧 {artist.contactInfo.email}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}