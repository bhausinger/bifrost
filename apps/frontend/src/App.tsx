import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Auth } from '@/pages/Auth';
import { Dashboard } from '@/pages/Dashboard';
import { Campaigns } from '@/pages/campaigns/Campaigns';
import { CampaignDetail } from '@/pages/campaigns/CampaignDetail';
import { Artists } from '@/pages/artists/Artists';
import { ArtistDetail } from '@/pages/artists/ArtistDetail';
import { Outreach } from '@/pages/outreach/Outreach';
import { Analytics } from '@/pages/analytics/Analytics';
import { Finance } from '@/pages/finance/Finance';
import { Settings } from '@/pages/settings/Settings';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<Auth />} />
      
      {/* Protected routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/artists" element={<Artists />} />
              <Route path="/artists/:id" element={<ArtistDetail />} />
              <Route path="/outreach" element={<Outreach />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;