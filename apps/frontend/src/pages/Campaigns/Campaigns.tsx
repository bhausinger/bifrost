import React, { useState } from 'react';
import { useCampaignStore } from '@/stores/campaignStore';
import { CampaignList } from '@/components/campaigns/CampaignList';
import { CampaignDetail } from '@/components/campaigns/CampaignDetail';

export function Campaigns() {
  const { selectedCampaign } = useCampaignStore();
  const [showDetail, setShowDetail] = useState(false);

  // Show detail view if a campaign is selected
  React.useEffect(() => {
    setShowDetail(!!selectedCampaign);
  }, [selectedCampaign]);

  const handleBackToList = () => {
    setShowDetail(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {showDetail && selectedCampaign ? (
        <CampaignDetail onBack={handleBackToList} />
      ) : (
        <CampaignList />
      )}
    </div>
  );
}