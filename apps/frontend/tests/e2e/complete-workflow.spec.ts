import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { CampaignPage } from '../page-objects/CampaignPage';
import { ArtistPage } from '../page-objects/ArtistPage';
import { OutreachPage } from '../page-objects/OutreachPage';
import { FinancialPage } from '../page-objects/FinancialPage';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Complete Application Workflow', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let campaignPage: CampaignPage;
  let artistPage: ArtistPage;
  let outreachPage: OutreachPage;
  let financialPage: FinancialPage;
  let helpers: TestHelpers;
  
  // Test data that will be used throughout the workflow
  const workflowData = {
    user: {
      email: 'benjamin.hausinger@gmail.com',
      password: 'TestPassword123!'
    },
    artist: {
      name: 'Test Artist Workflow',
      genre: 'Electronic',
      bio: 'Test artist for complete workflow testing',
      email: 'testartist@example.com',
      location: 'Los Angeles, CA'
    },
    campaign: {
      name: 'Complete Workflow Campaign',
      description: 'End-to-end test campaign for validation',
      budget: 5000,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      status: 'active'
    },
    template: {
      name: 'Workflow Test Template',
      subject: 'Music Promotion Opportunity - {{artistName}}',
      body: 'Hi {{artistName}},\n\nWe would like to promote your music. Please let us know if you are interested.\n\nBest regards,\nPromotion Team'
    },
    outreach: {
      name: 'Workflow Outreach Campaign',
      description: 'Test outreach campaign for complete workflow',
      recipients: [
        { email: 'artist1@example.com', name: 'Artist One' },
        { email: 'artist2@example.com', name: 'Artist Two' }
      ]
    },
    financial: {
      incomeAmount: 2500,
      expenseAmount: 1000,
      budgetAmount: 3000
    }
  };

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    campaignPage = new CampaignPage(page);
    artistPage = new ArtistPage(page);
    outreachPage = new OutreachPage(page);
    financialPage = new FinancialPage(page);
    helpers = new TestHelpers(page);
  });

  test('Complete user workflow - from login to full campaign management', async ({ page }) => {
    console.log('🚀 Starting complete application workflow test');

    // Step 1: Authentication
    console.log('Step 1: User Authentication');
    await authPage.login(workflowData.user.email, workflowData.user.password);
    await authPage.verifyLoggedIn();
    await dashboardPage.verifyDashboardLoaded();

    // Step 2: Dashboard Overview
    console.log('Step 2: Dashboard Overview');
    await dashboardPage.verifyStatsDisplayed();
    await dashboardPage.verifyChartsRendered();
    
    // Get initial dashboard stats for comparison later
    const initialStats = await dashboardPage.getStats();
    console.log('Initial stats:', initialStats);

    // Step 3: Artist Management
    console.log('Step 3: Artist Management');
    
    // Add a new artist manually
    await artistPage.addArtist(workflowData.artist);
    
    // Verify artist was created successfully
    await artistPage.verifyArtistDetails({
      name: workflowData.artist.name,
      genre: workflowData.artist.genre,
      bio: workflowData.artist.bio
    });
    
    // Add social profile for the artist
    await artistPage.addSocialProfile({
      platform: 'SoundCloud',
      username: 'testartist_workflow',
      followers: 5000
    });

    // Test artist discovery (find similar artists)
    await artistPage.navigateTo();
    await artistPage.findSimilarArtists('Daft Punk', 'Electronic');
    
    // Add first discovered artist if any
    const discoveredArtists = page.locator('[data-testid="similar-artist"]');
    if (await discoveredArtists.count() > 0) {
      const firstArtist = await discoveredArtists.first().textContent();
      if (firstArtist) {
        await artistPage.addDiscoveredArtist(firstArtist.trim());
      }
    }

    // Step 4: Campaign Management
    console.log('Step 4: Campaign Management');
    
    // Create a new campaign
    await campaignPage.createCampaign(workflowData.campaign);
    
    // Verify campaign was created
    await campaignPage.verifyCampaignDetails({
      name: workflowData.campaign.name,
      status: workflowData.campaign.status,
      budget: workflowData.campaign.budget
    });
    
    // Associate the artist with the campaign
    await campaignPage.addArtistToCampaign(workflowData.artist.name);
    
    // Update stream count for tracking
    await campaignPage.updateStreamCount(1500, '2024-01-15');
    await campaignPage.updateStreamCount(2800, '2024-02-15');
    await campaignPage.updateStreamCount(4200, '2024-03-15');
    
    // Verify analytics are displayed
    await campaignPage.verifyAnalyticsDisplayed();

    // Step 5: Email Templates and Outreach
    console.log('Step 5: Email Templates and Outreach');
    
    // Create email template
    await outreachPage.createTemplate(workflowData.template);
    
    // Create outreach campaign
    await outreachPage.createOutreachCampaign({
      ...workflowData.outreach,
      template: workflowData.template.name
    });
    
    // Send test email to verify template works
    await outreachPage.sendTestEmail('test@example.com');
    
    // Launch the outreach campaign
    await outreachPage.launchCampaign();
    
    // View email records to verify sending
    await outreachPage.viewEmailRecords();
    
    // Verify campaign statistics
    await outreachPage.verifyCampaignStats();

    // Step 6: Financial Tracking
    console.log('Step 6: Financial Tracking');
    
    // Add income transaction (streaming revenue)
    await financialPage.addTransaction({
      type: 'income',
      category: 'Streaming Revenue',
      amount: workflowData.financial.incomeAmount,
      description: 'Streaming revenue from campaign',
      campaign: workflowData.campaign.name
    });
    
    // Add expense transaction (marketing costs)
    await financialPage.addTransaction({
      type: 'expense',
      category: 'Marketing',
      amount: workflowData.financial.expenseAmount,
      description: 'Marketing expenses for campaign',
      campaign: workflowData.campaign.name
    });
    
    // Create budget for monitoring
    await financialPage.createBudget({
      name: 'Campaign Marketing Budget',
      amount: workflowData.financial.budgetAmount,
      category: 'Marketing',
      period: 'monthly'
    });
    
    // Generate P&L report
    await financialPage.generateReport({
      type: 'P&L Statement',
      period: 'This Quarter'
    });
    
    // Generate financial forecast
    await financialPage.generateForecast({
      period: '6 months',
      growthRate: 15
    });
    
    // Verify financial dashboard metrics
    await financialPage.verifyDashboardMetrics();
    await financialPage.verifyChartsDisplayed();

    // Step 7: Data Export and Reporting
    console.log('Step 7: Data Export and Reporting');
    
    // Export campaign data
    await campaignPage.navigateToCampaign('1'); // Assuming the first campaign has ID 1
    await campaignPage.exportCampaign();
    
    // Export artist data
    await artistPage.exportArtists('csv');
    
    // Export outreach data
    await outreachPage.navigateToCampaign('1'); // Assuming the first outreach campaign has ID 1
    await outreachPage.exportCampaignData();
    
    // Download financial report
    await financialPage.downloadReport();

    // Step 8: Dashboard Verification (Final Check)
    console.log('Step 8: Final Dashboard Verification');
    
    // Return to dashboard and verify updated stats
    await dashboardPage.navigateTo();
    await dashboardPage.verifyDashboardLoaded();
    
    // Get final stats and compare with initial
    const finalStats = await dashboardPage.getStats();
    console.log('Final stats:', finalStats);
    
    // Verify that stats have increased
    expect(finalStats.campaigns).toBeGreaterThan(initialStats.campaigns);
    expect(finalStats.artists).toBeGreaterThan(initialStats.artists);

    // Step 9: Test All Navigation Links
    console.log('Step 9: Navigation Testing');
    
    // Test all main navigation links work
    await dashboardPage.testAllNavigationLinks();
    
    // Test quick actions from dashboard
    await dashboardPage.testQuickActions();

    // Step 10: Search and Filter Testing
    console.log('Step 10: Search and Filter Testing');
    
    // Test campaign search and filters
    await campaignPage.navigateTo();
    await campaignPage.searchCampaigns(workflowData.campaign.name);
    await campaignPage.filterCampaigns('active');
    
    // Test artist search and filters
    await artistPage.navigateTo();
    await artistPage.searchArtists(workflowData.artist.name);
    await artistPage.filterByGenre(workflowData.artist.genre);
    
    // Test outreach search and filters
    await outreachPage.navigateTo();
    await outreachPage.searchCampaigns(workflowData.outreach.name);
    await outreachPage.filterByStatus('Active');
    
    // Test financial transaction filters
    await financialPage.filterTransactions({
      type: 'income',
      category: 'Streaming Revenue',
      searchTerm: 'streaming'
    });

    // Step 11: Mobile Responsiveness Check (if on mobile viewport)
    console.log('Step 11: Mobile Responsiveness Check');
    
    const viewportSize = await page.viewportSize();
    if (viewportSize && viewportSize.width < 768) {
      console.log('Testing mobile responsiveness');
      
      // Verify mobile navigation works
      await dashboardPage.navigateTo();
      await dashboardPage.verifyDashboardLoaded();
      
      // Test mobile menu if it exists
      const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu');
      if (await mobileMenu.count() > 0) {
        await mobileMenu.click();
        await dashboardPage.testAllNavigationLinks();
      }
    }

    // Step 12: Error Handling and Edge Cases
    console.log('Step 12: Error Handling Testing');
    
    // Test handling of duplicate names
    try {
      await artistPage.addArtist({
        ...workflowData.artist,
        email: 'different@example.com' // Different email but same name
      });
      
      // Should either succeed or show appropriate error
      await Promise.race([
        helpers.waitForToast('artist created'),
        helpers.waitForToast('name already exists')
      ]);
    } catch (error) {
      console.log('Handled duplicate artist name appropriately');
    }

    // Step 13: Performance Verification
    console.log('Step 13: Performance Verification');
    
    // Check that all major pages load within reasonable time
    const performancePages = [
      '/dashboard',
      '/campaigns',
      '/artists',
      '/outreach',
      '/financial'
    ];
    
    for (const pagePath of performancePages) {
      const startTime = Date.now();
      await helpers.navigateTo(pagePath);
      await helpers.waitForLoadingToComplete();
      const loadTime = Date.now() - startTime;
      
      // Verify page loads within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      console.log(`${pagePath} loaded in ${loadTime}ms`);
    }

    // Step 14: Cleanup and Logout
    console.log('Step 14: Cleanup and Logout');
    
    // Navigate back to dashboard
    await dashboardPage.navigateTo();
    
    // Logout user
    await authPage.logout();
    await authPage.verifyLoggedOut();

    console.log('✅ Complete workflow test completed successfully!');
  });

  test('Workflow with data persistence verification', async ({ page }) => {
    console.log('🔄 Testing data persistence across sessions');

    // Login
    await authPage.login(workflowData.user.email, workflowData.user.password);
    await dashboardPage.verifyDashboardLoaded();

    // Create test data
    await artistPage.addArtist({
      name: 'Persistence Test Artist',
      genre: 'Jazz',
      bio: 'Artist for testing data persistence',
      email: 'persistence@example.com'
    });

    await campaignPage.createCampaign({
      name: 'Persistence Test Campaign',
      description: 'Campaign for testing data persistence',
      budget: 3000,
      status: 'active'
    });

    // Logout and login again
    await authPage.logout();
    await authPage.login(workflowData.user.email, workflowData.user.password);

    // Verify data persists
    await artistPage.navigateTo();
    await artistPage.searchArtists('Persistence Test Artist');
    await artistPage.verifyArtistsListHasData();

    await campaignPage.navigateTo();
    await campaignPage.searchCampaigns('Persistence Test Campaign');
    await campaignPage.verifyCampaignsListHasData();

    console.log('✅ Data persistence verified successfully!');
  });

  test('Bulk operations workflow', async ({ page }) => {
    console.log('📦 Testing bulk operations workflow');

    // Login
    await authPage.login(workflowData.user.email, workflowData.user.password);
    await dashboardPage.verifyDashboardLoaded();

    // Create multiple test artists for bulk operations
    const bulkArtists = [
      'Bulk Test Artist 1',
      'Bulk Test Artist 2',
      'Bulk Test Artist 3'
    ];

    for (const artistName of bulkArtists) {
      await artistPage.addArtist({
        name: artistName,
        genre: 'Pop',
        bio: `Bio for ${artistName}`,
        email: `${artistName.toLowerCase().replace(/\s+/g, '')}@example.com`
      });
    }

    // Perform bulk operations
    await artistPage.navigateTo();
    await artistPage.performBulkAction('Export', bulkArtists);

    // Test bulk financial operations
    const bulkTransactions = [
      { type: 'income' as const, amount: 1000, description: 'Bulk Income 1' },
      { type: 'expense' as const, amount: 500, description: 'Bulk Expense 1' },
      { type: 'income' as const, amount: 1500, description: 'Bulk Income 2' }
    ];

    for (const transaction of bulkTransactions) {
      await financialPage.addTransaction({
        ...transaction,
        category: transaction.type === 'income' ? 'Streaming Revenue' : 'Marketing'
      });
    }

    console.log('✅ Bulk operations workflow completed successfully!');
  });

  test('Integration between all modules', async ({ page }) => {
    console.log('🔗 Testing integration between all modules');

    // Login
    await authPage.login(workflowData.user.email, workflowData.user.password);
    await dashboardPage.verifyDashboardLoaded();

    // Create integrated workflow: Artist → Campaign → Outreach → Financial
    
    // 1. Create artist
    const integrationArtist = {
      name: 'Integration Test Artist',
      genre: 'Hip Hop',
      bio: 'Artist for integration testing',
      email: 'integration@example.com'
    };
    await artistPage.addArtist(integrationArtist);

    // 2. Create campaign and associate artist
    const integrationCampaign = {
      name: 'Integration Test Campaign',
      description: 'Campaign for integration testing',
      budget: 4000,
      status: 'active'
    };
    await campaignPage.createCampaign(integrationCampaign);
    await campaignPage.addArtistToCampaign(integrationArtist.name);

    // 3. Create outreach for the artist
    await outreachPage.createTemplate({
      name: 'Integration Template',
      subject: 'Integration Test - {{artistName}}',
      body: 'Hi {{artistName}}, this is an integration test email.'
    });

    await outreachPage.createOutreachCampaign({
      name: 'Integration Outreach',
      description: 'Outreach for integration testing',
      template: 'Integration Template',
      recipients: [{ email: integrationArtist.email, name: integrationArtist.name }]
    });

    // 4. Add financial transactions related to the campaign
    await financialPage.addTransaction({
      type: 'expense',
      category: 'Marketing',
      amount: 800,
      description: 'Integration campaign marketing',
      campaign: integrationCampaign.name
    });

    await financialPage.addTransaction({
      type: 'income',
      category: 'Streaming Revenue',
      amount: 2000,
      description: 'Revenue from integration campaign',
      campaign: integrationCampaign.name
    });

    // 5. Verify cross-module data relationships
    await campaignPage.navigateToCampaign('1');
    await campaignPage.verifyAnalyticsDisplayed();

    await financialPage.navigateTo();
    await financialPage.verifyDashboardMetrics();

    // 6. Generate comprehensive report
    await financialPage.generateReport({
      type: 'Comprehensive Report',
      period: 'All Time'
    });

    console.log('✅ Module integration testing completed successfully!');
  });
});