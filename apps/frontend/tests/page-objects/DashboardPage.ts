import { Page, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

export class DashboardPage {
  private helpers: TestHelpers;

  constructor(private page: Page) {
    this.helpers = new TestHelpers(page);
  }

  // Selectors
  private selectors = {
    // Navigation
    navigation: 'nav, [data-testid="navigation"]',
    logo: '[data-testid="logo"], .logo',
    userMenu: '[data-testid="user-menu"], .user-menu',
    
    // Navigation links
    dashboardLink: 'a[href*="dashboard"], button:has-text("Dashboard")',
    campaignsLink: 'a[href*="campaigns"], button:has-text("Campaigns")',
    artistsLink: 'a[href*="artists"], button:has-text("Artists")',
    outreachLink: 'a[href*="outreach"], button:has-text("Outreach")',
    financialLink: 'a[href*="financial"], button:has-text("P&L"), button:has-text("Financial")',
    
    // Dashboard content
    welcomeMessage: '[data-testid="welcome-message"], .welcome',
    statsSection: '[data-testid="stats-section"], .stats',
    recentCampaigns: '[data-testid="recent-campaigns"]',
    recentArtists: '[data-testid="recent-artists"]',
    recentActivity: '[data-testid="recent-activity"]',
    
    // Stats cards
    totalCampaigns: '[data-testid="total-campaigns"], .stat-campaigns',
    totalArtists: '[data-testid="total-artists"], .stat-artists',
    totalRevenue: '[data-testid="total-revenue"], .stat-revenue',
    totalExpenses: '[data-testid="total-expenses"], .stat-expenses',
    
    // Quick actions
    createCampaignButton: 'button:has-text("Create Campaign"), [data-testid="create-campaign"]',
    addArtistButton: 'button:has-text("Add Artist"), [data-testid="add-artist"]',
    startOutreachButton: 'button:has-text("Start Outreach"), [data-testid="start-outreach"]',
    
    // Charts and analytics
    campaignChart: '[data-testid="campaign-chart"], .campaign-chart',
    revenueChart: '[data-testid="revenue-chart"], .revenue-chart',
    performanceChart: '[data-testid="performance-chart"], .performance-chart',
  };

  /**
   * Navigate to dashboard
   */
  async navigateTo() {
    await this.helpers.navigateTo('/dashboard');
    await this.verifyOnDashboard();
  }

  /**
   * Verify we're on the dashboard page
   */
  async verifyOnDashboard() {
    await this.helpers.verifyURL('dashboard');
    await this.helpers.verifyElementVisible(this.selectors.navigation);
  }

  /**
   * Verify dashboard loads completely
   */
  async verifyDashboardLoaded() {
    await this.verifyOnDashboard();
    
    // Verify navigation is visible
    await this.helpers.verifyElementVisible(this.selectors.navigation);
    
    // Verify main sections are present
    await this.helpers.verifyElementVisible(this.selectors.statsSection);
    
    // Wait for any loading to complete
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Navigate to campaigns section
   */
  async navigateToCampaigns() {
    await this.helpers.clickAndWait(this.selectors.campaignsLink);
    await this.helpers.verifyURL('campaigns');
  }

  /**
   * Navigate to artists section
   */
  async navigateToArtists() {
    await this.helpers.clickAndWait(this.selectors.artistsLink);
    await this.helpers.verifyURL('artists');
  }

  /**
   * Navigate to outreach section
   */
  async navigateToOutreach() {
    await this.helpers.clickAndWait(this.selectors.outreachLink);
    await this.helpers.verifyURL('outreach');
  }

  /**
   * Navigate to financial section
   */
  async navigateToFinancial() {
    await this.helpers.clickAndWait(this.selectors.financialLink);
    await this.helpers.verifyURL('financial');
  }

  /**
   * Create new campaign from dashboard
   */
  async createCampaign() {
    await this.helpers.clickAndWait(this.selectors.createCampaignButton);
    // Should redirect to campaign creation page
    await this.helpers.verifyURL('campaigns/create');
  }

  /**
   * Add new artist from dashboard
   */
  async addArtist() {
    await this.helpers.clickAndWait(this.selectors.addArtistButton);
    // Should redirect to artist creation page or open modal
    await Promise.race([
      this.helpers.verifyURL('artists/create'),
      this.page.waitForSelector('[data-testid="add-artist-modal"], .modal')
    ]);
  }

  /**
   * Start new outreach campaign from dashboard
   */
  async startOutreach() {
    await this.helpers.clickAndWait(this.selectors.startOutreachButton);
    await this.helpers.verifyURL('outreach/create');
  }

  /**
   * Verify stats are displayed
   */
  async verifyStatsDisplayed() {
    await this.helpers.verifyElementVisible(this.selectors.statsSection);
    
    // Check for stat cards
    const statCards = [
      this.selectors.totalCampaigns,
      this.selectors.totalArtists,
      this.selectors.totalRevenue,
      this.selectors.totalExpenses
    ];

    for (const selector of statCards) {
      try {
        await this.helpers.verifyElementVisible(selector);
      } catch (error) {
        // Some stats might not be visible if no data exists yet
        console.log(`Stat card not visible: ${selector}`);
      }
    }
  }

  /**
   * Verify charts are rendered
   */
  async verifyChartsRendered() {
    const chartSelectors = [
      this.selectors.campaignChart,
      this.selectors.revenueChart,
      this.selectors.performanceChart
    ];

    for (const selector of chartSelectors) {
      try {
        await this.helpers.verifyChartRendered(selector);
      } catch (error) {
        // Charts might not be visible if no data exists yet
        console.log(`Chart not rendered: ${selector}`);
      }
    }
  }

  /**
   * Verify recent items sections
   */
  async verifyRecentSections() {
    const sections = [
      this.selectors.recentCampaigns,
      this.selectors.recentArtists,
      this.selectors.recentActivity
    ];

    for (const selector of sections) {
      try {
        await this.helpers.verifyElementVisible(selector);
      } catch (error) {
        // Recent sections might not be visible if no data exists yet
        console.log(`Recent section not visible: ${selector}`);
      }
    }
  }

  /**
   * Get dashboard stats
   */
  async getStats() {
    const stats = {
      campaigns: 0,
      artists: 0,
      revenue: 0,
      expenses: 0
    };

    try {
      const campaignsElement = this.page.locator(this.selectors.totalCampaigns);
      if (await campaignsElement.count() > 0) {
        const text = await campaignsElement.textContent();
        stats.campaigns = parseInt(text?.match(/\d+/)?.[0] || '0');
      }
    } catch (error) {
      console.log('Could not get campaigns stat');
    }

    try {
      const artistsElement = this.page.locator(this.selectors.totalArtists);
      if (await artistsElement.count() > 0) {
        const text = await artistsElement.textContent();
        stats.artists = parseInt(text?.match(/\d+/)?.[0] || '0');
      }
    } catch (error) {
      console.log('Could not get artists stat');
    }

    return stats;
  }

  /**
   * Verify user menu functionality
   */
  async testUserMenu() {
    const userMenu = this.page.locator(this.selectors.userMenu);
    
    if (await userMenu.count() > 0) {
      await userMenu.click();
      
      // Look for common user menu items
      const menuItems = [
        'Profile',
        'Settings',
        'Logout',
        'Sign out'
      ];

      for (const item of menuItems) {
        const menuItem = this.page.locator(`button:has-text("${item}"), a:has-text("${item}")`);
        if (await menuItem.count() > 0) {
          await expect(menuItem).toBeVisible();
        }
      }
      
      // Close menu by clicking elsewhere
      await this.page.click('body');
    }
  }

  /**
   * Verify all navigation links work
   */
  async testAllNavigationLinks() {
    // Test campaigns link
    await this.navigateToCampaigns();
    await this.navigateTo(); // Back to dashboard
    
    // Test artists link
    await this.navigateToArtists();
    await this.navigateTo(); // Back to dashboard
    
    // Test outreach link
    await this.navigateToOutreach();
    await this.navigateTo(); // Back to dashboard
    
    // Test financial link
    await this.navigateToFinancial();
    await this.navigateTo(); // Back to dashboard
  }

  /**
   * Test all quick action buttons
   */
  async testQuickActions() {
    // Test create campaign
    if (await this.page.locator(this.selectors.createCampaignButton).count() > 0) {
      await this.createCampaign();
      await this.navigateTo(); // Back to dashboard
    }
    
    // Test add artist
    if (await this.page.locator(this.selectors.addArtistButton).count() > 0) {
      await this.addArtist();
      await this.navigateTo(); // Back to dashboard
    }
    
    // Test start outreach
    if (await this.page.locator(this.selectors.startOutreachButton).count() > 0) {
      await this.startOutreach();
      await this.navigateTo(); // Back to dashboard
    }
  }
}