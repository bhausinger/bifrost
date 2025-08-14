import React, { useState } from 'react';
import { ArtistDiscovery } from '@/components/artists/Discovery';
import { SavedArtists } from './SavedArtists';

export function Artists() {
  const [activeTab, setActiveTab] = useState<'discovery' | 'saved'>('discovery');

  const tabs = [
    { id: 'discovery', name: 'Discovery', description: 'Find new artists to promote' },
    { id: 'saved', name: 'Saved Artists', description: 'Manage your saved artists' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'discovery' | 'saved')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'discovery' && <ArtistDiscovery />}
        {activeTab === 'saved' && <SavedArtists />}
      </div>
    </div>
  );
}