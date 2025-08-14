import { useState } from 'react';
import { useUpdateArtist, useDeleteArtist } from '@/hooks/api';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Modal } from '@/components/ui';
import { PencilIcon, TrashIcon, UserIcon, LinkIcon } from '@heroicons/react/24/outline';
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

interface SocialLink {
  platform: string;
  url: string;
}

interface ArtistProfileProps {
  artist: Artist;
  onUpdate?: (updatedArtist: Artist) => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function ArtistProfile({ artist, onUpdate, onDelete, showActions = true }: ArtistProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editData, setEditData] = useState({
    name: artist.name,
    displayName: artist.displayName || '',
    genres: artist.genres.join(', '),
    email: artist.contactInfo?.email || '',
    socialLinks: artist.contactInfo?.socialLinks || []
  });

  const updateMutation = useUpdateArtist();
  const deleteMutation = useDeleteArtist();

  const parseSocialLinks = (links: string[]): SocialLink[] => {
    return links.map(link => {
      let platform = 'Unknown';
      
      if (link.includes('soundcloud.com')) platform = 'SoundCloud';
      else if (link.includes('instagram.com')) platform = 'Instagram';
      else if (link.includes('twitter.com') || link.includes('x.com')) platform = 'Twitter/X';
      else if (link.includes('spotify.com')) platform = 'Spotify';
      else if (link.includes('bandcamp.com')) platform = 'Bandcamp';
      else if (link.includes('youtube.com')) platform = 'YouTube';
      else if (link.includes('facebook.com')) platform = 'Facebook';
      
      return { platform, url: link };
    });
  };

  const handleSave = async () => {
    try {
      const updatedArtist = {
        name: editData.name,
        displayName: editData.displayName || undefined,
        genres: editData.genres.split(',').map(g => g.trim()).filter(g => g.length > 0),
        contactInfo: {
          ...artist.contactInfo,
          email: editData.email || undefined,
          hasEmail: !!editData.email,
          socialLinks: editData.socialLinks
        }
      };

      await updateMutation.mutateAsync({ id: artist.id, data: updatedArtist });
      toast.success('Artist updated successfully');
      setIsEditing(false);
      onUpdate?.({ ...artist, ...updatedArtist });
    } catch (error) {
      toast.error('Failed to update artist');
      console.error('Update error:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(artist.id);
      toast.success('Artist deleted successfully');
      setShowDeleteModal(false);
      onDelete?.();
    } catch (error) {
      toast.error('Failed to delete artist');
      console.error('Delete error:', error);
    }
  };

  const addSocialLink = () => {
    setEditData(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, '']
    }));
  };

  const updateSocialLink = (index: number, value: string) => {
    setEditData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) => i === index ? value : link)
    }));
  };

  const removeSocialLink = (index: number) => {
    setEditData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index)
    }));
  };

  const socialLinks = parseSocialLinks(artist.contactInfo?.socialLinks || []);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <CardTitle>{artist.displayName || artist.name}</CardTitle>
                {artist.displayName && artist.displayName !== artist.name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ({artist.name})
                  </p>
                )}
              </div>
            </div>
            
            {showActions && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={isEditing}
                >
                  <PencilIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <Input
                label="Name"
                value={editData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              
              <Input
                label="Display Name"
                value={editData.displayName}
                onChange={(e) => setEditData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Optional display name"
              />
              
              <Input
                label="Genres"
                value={editData.genres}
                onChange={(e) => setEditData(prev => ({ ...prev, genres: e.target.value }))}
                placeholder="e.g., Electronic, House, Techno"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple genres with commas</p>
              
              <Input
                label="Email"
                type="email"
                value={editData.email}
                onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="artist@example.com"
              />

              {/* Social Links */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Social Links
                </label>
                <div className="space-y-2">
                  {editData.socialLinks.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={link}
                        onChange={(e) => updateSocialLink(index, e.target.value)}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSocialLink(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSocialLink}
                    className="w-full"
                  >
                    Add Social Link
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  loading={updateMutation.isPending}
                  disabled={!editData.name}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      name: artist.name,
                      displayName: artist.displayName || '',
                      genres: artist.genres.join(', '),
                      email: artist.contactInfo?.email || '',
                      socialLinks: artist.contactInfo?.socialLinks || []
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Genres */}
              {artist.genres.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Genres
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {artist.genres.map(genre => (
                      <span
                        key={genre}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Information
                </h4>
                <div className="space-y-2">
                  {artist.contactInfo?.email ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✉️</span>
                      <a
                        href={`mailto:${artist.contactInfo.email}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {artist.contactInfo.email}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>❌</span>
                      No email address
                    </div>
                  )}
                  
                  {artist.lastContactedAt && (
                    <div className="text-sm text-gray-500">
                      Last contacted: {new Date(artist.lastContactedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Social Media
                  </h4>
                  <div className="space-y-1">
                    {socialLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-gray-400" />
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          {link.platform}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Added: {new Date(artist.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Artist"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{artist.displayName || artist.name}</strong>? 
            This action cannot be undone.
          </p>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteMutation.isPending}
            >
              Delete Artist
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}