import { useState } from 'react';
import { 
  useCampaignArtists, 
  useAddMultipleArtistsToCampaign, 
  useRemoveArtistFromCampaign 
} from '@/hooks/api/useCampaigns';
import { ArtistSearch } from '@/components/artists/ArtistSearch';
import { Button, Card, CardHeader, CardTitle, CardContent, Modal, LoadingSpinner } from '@/components/ui';
import { PlusIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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

interface CampaignArtist {
  id: string;
  status: string;
  added_at: string;
  artists: Artist;
}

interface CampaignArtistsProps {
  campaignId: string;
}

export function CampaignArtists({ campaignId }: CampaignArtistsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);

  const { data: campaignArtists = [], isLoading, error } = useCampaignArtists(campaignId);
  const addMultipleArtistsMutation = useAddMultipleArtistsToCampaign();
  const removeArtistMutation = useRemoveArtistFromCampaign();

  const handleAddArtists = async () => {
    if (selectedArtists.length === 0) {
      toast.error('Please select at least one artist');
      return;
    }

    try {
      await addMultipleArtistsMutation.mutateAsync({
        campaignId,
        artistIds: selectedArtists.map(artist => artist.id)
      });
      
      toast.success(`${selectedArtists.length} artists added to campaign`);
      setShowAddModal(false);
      setSelectedArtists([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add artists');
    }
  };

  const handleRemoveArtist = async (artistId: string, artistName: string) => {
    if (window.confirm(`Remove ${artistName} from this campaign?`)) {
      try {
        await removeArtistMutation.mutateAsync({ campaignId, artistId });
        toast.success(`${artistName} removed from campaign`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to remove artist');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <LoadingSpinner />
            <span className="ml-2">Loading campaign artists...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading campaign artists: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campaign Artists ({campaignArtists.length})</CardTitle>
            <Button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Artists
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {campaignArtists.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No artists in this campaign yet</p>
              <Button onClick={() => setShowAddModal(true)} variant="outline">
                Add your first artist
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaignArtists.map((campaignArtist: CampaignArtist) => {
                const artist = campaignArtist.artists;
                return (
                  <div
                    key={campaignArtist.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {artist.displayName || artist.name}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          {artist.genres.length > 0 && (
                            <span>{artist.genres.slice(0, 2).join(', ')}</span>
                          )}
                          {artist.contactInfo?.hasEmail && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">✉️ Has email</span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Added: {formatDate(campaignArtist.added_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          campaignArtist.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {campaignArtist.status}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveArtist(artist.id, artist.displayName || artist.name)}
                        disabled={removeArtistMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Artists Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedArtists([]);
        }}
        title="Add Artists to Campaign"
        className="max-w-6xl"
      >
        <div className="space-y-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Search and select artists to add to this campaign. Only artists not already in the campaign will be shown.
          </div>

          {/* Selected Artists Summary */}
          {selectedArtists.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Selected Artists ({selectedArtists.length})
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedArtists([])}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedArtists.map(artist => (
                  <span
                    key={artist.id}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-sm"
                  >
                    {artist.displayName || artist.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Artist Search Component */}
          <ArtistSearch
            multiSelect={true}
            selectedArtists={selectedArtists}
            onSelectMultiple={(artists) => setSelectedArtists(artists)}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setSelectedArtists([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddArtists}
              loading={addMultipleArtistsMutation.isPending}
              disabled={selectedArtists.length === 0}
            >
              Add {selectedArtists.length > 0 ? `${selectedArtists.length} ` : ''}Artists
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}