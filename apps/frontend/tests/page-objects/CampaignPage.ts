import { Page, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

export class CampaignPage {
  private helpers: TestHelpers;

  constructor(private page: Page) {
    this.helpers = new TestHelpers(page);
  }

  // Selectors
  private selectors = {
    // Campaign list
    campaignsList: '[data-testid="campaigns-list"], .campaigns-list',
    campaignCard: '[data-testid="campaign-card"], .campaign-card',
    createCampaignButton: 'button:has-text("Create Campaign"), [data-testid="create-campaign"]',
    searchInput: 'input[placeholder*="Search"], [data-testid="search-campaigns"]',
    filterDropdown: '[data-testid="filter-dropdown"], select[name="filter"]',
    sortDropdown: '[data-testid="sort-dropdown"], select[name="sort"]',
    
    // Campaign form
    campaignForm: '[data-testid="campaign-form"], form',
    nameInput: 'input[name="name"], [data-testid="campaign-name"]',
    descriptionInput: 'textarea[name="description"], [data-testid="campaign-description"]',
    budgetInput: 'input[name="budget"], [data-testid="campaign-budget"]',
    startDateInput: 'input[name="startDate"], [data-testid="start-date"]',
    endDateInput: 'input[name="endDate"], [data-testid="end-date"]',
    statusSelect: 'select[name="status"], [data-testid="campaign-status"]',
    saveButton: 'button:has-text("Save"), button[type="submit"]',
    cancelButton: 'button:has-text("Cancel")',
    
    // Campaign details
    campaignTitle: '[data-testid="campaign-title"], h1, h2',
    campaignStatus: '[data-testid="campaign-status"]',
    campaignBudget: '[data-testid="campaign-budget"]',
    campaignDates: '[data-testid="campaign-dates"]',
    editButton: 'button:has-text("Edit"), [data-testid="edit-campaign"]',
    deleteButton: 'button:has-text("Delete"), [data-testid="delete-campaign"]',
    
    // Campaign analytics
    analyticsSection: '[data-testid="campaign-analytics"], .analytics',
    streamCountChart: '[data-testid="stream-count-chart"]',
    engagementChart: '[data-testid="engagement-chart"]',
    revenueChart: '[data-testid="revenue-chart"]',
    performanceMetrics: '[data-testid="performance-metrics"]',
    
    // Associated artists
    artistsSection: '[data-testid="campaign-artists"], .campaign-artists',
    addArtistButton: 'button:has-text("Add Artist"), [data-testid="add-artist-to-campaign"]',
    artistsList: '[data-testid="artists-list"]',
    removeArtistButton: '[data-testid="remove-artist"], button:has-text("Remove")',
    
    // Stream tracking
    streamTrackingSection: '[data-testid="stream-tracking"]',
    addStreamDataButton: 'button:has-text("Add Stream Data"), [data-testid="add-stream-data"]',
    streamCountInput: 'input[name="streamCount"], [data-testid="stream-count"]',
    streamDateInput: 'input[name="streamDate"], [data-testid="stream-date"]',
    updateStreamsButton: 'button:has-text("Update"), [data-testid="update-streams"]',
    
    // Actions
    exportButton: 'button:has-text("Export"), [data-testid="export-campaign"]',
    duplicateButton: 'button:has-text("Duplicate"), [data-testid="duplicate-campaign"]',
    archiveButton: 'button:has-text("Archive"), [data-testid="archive-campaign"]',
    
    // Modals and confirmations
    deleteModal: '[data-testid="delete-modal"], .delete-modal',
    confirmDeleteButton: 'button:has-text("Confirm"), [data-testid="confirm-delete"]',
    addArtistModal: '[data-testid="add-artist-modal"]',
    artistSearchInput: 'input[placeholder*="Search artists"]',
    selectArtistButton: 'button:has-text("Select"), [data-testid="select-artist"]',
  };

  /**
   * Navigate to campaigns page
   */
  async navigateTo() {
    await this.helpers.navigateTo('/campaigns');
    await this.verifyOnCampaignsPage();
  }

  /**
   * Navigate to specific campaign
   */
  async navigateToCampaign(campaignId: string) {
    await this.helpers.navigateTo(`/campaigns/${campaignId}`);
    await this.verifyOnCampaignDetails();
  }

  /**
   * Verify we're on campaigns page
   */
  async verifyOnCampaignsPage() {
    await this.helpers.verifyURL('campaigns');
    await this.helpers.verifyElementVisible(this.selectors.createCampaignButton);
  }

  /**
   * Verify we're on campaign details page
   */
  async verifyOnCampaignDetails() {
    await this.helpers.verifyURL('campaigns/');
    await this.helpers.verifyElementVisible(this.selectors.campaignTitle);
  }

  /**
   * Create new campaign
   */
  async createCampaign(campaignData: {
    name: string;
    description?: string;
    budget?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    console.log(`📝 Creating campaign: ${campaignData.name}`);
    
    // Navigate to campaigns and click create
    await this.navigateTo();
    await this.helpers.clickAndWait(this.selectors.createCampaignButton);
    
    // Fill form
    await this.helpers.fillAndVerify(this.selectors.nameInput, campaignData.name);
    
    if (campaignData.description) {
      await this.helpers.fillAndVerify(this.selectors.descriptionInput, campaignData.description);
    }
    
    if (campaignData.budget) {
      await this.helpers.fillAndVerify(this.selectors.budgetInput, campaignData.budget.toString());
    }
    
    if (campaignData.startDate) {
      await this.helpers.fillAndVerify(this.selectors.startDateInput, campaignData.startDate);
    }
    
    if (campaignData.endDate) {
      await this.helpers.fillAndVerify(this.selectors.endDateInput, campaignData.endDate);
    }
    
    if (campaignData.status) {
      await this.helpers.selectOption(this.selectors.statusSelect, campaignData.status);
    }
    
    // Save campaign
    await this.helpers.clickAndWait(this.selectors.saveButton);
    
    // Wait for success or error
    await Promise.race([
      this.helpers.waitForToast('success'),
      this.helpers.waitForToast('created'),
      this.page.waitForURL('**/campaigns/**', { timeout: 10000 })
    ]);
  }

  /**
   * Edit existing campaign
   */
  async editCampaign(updates: {
    name?: string;
    description?: string;
    budget?: number;
    status?: string;
  }) {
    console.log('✏️ Editing campaign');
    
    await this.helpers.clickAndWait(this.selectors.editButton);
    
    if (updates.name) {
      await this.helpers.fillAndVerify(this.selectors.nameInput, updates.name);
    }
    
    if (updates.description) {
      await this.helpers.fillAndVerify(this.selectors.descriptionInput, updates.description);
    }
    
    if (updates.budget) {
      await this.helpers.fillAndVerify(this.selectors.budgetInput, updates.budget.toString());
    }
    
    if (updates.status) {
      await this.helpers.selectOption(this.selectors.statusSelect, updates.status);
    }
    
    // Save changes
    await this.helpers.clickAndWait(this.selectors.saveButton);
    await this.helpers.waitForToast('updated');
  }

  /**
   * Delete campaign
   */
  async deleteCampaign() {
    console.log('🗑️ Deleting campaign');
    
    await this.helpers.clickAndWait(this.selectors.deleteButton);
    
    // Confirm deletion
    await this.helpers.verifyElementVisible(this.selectors.deleteModal);
    await this.helpers.clickAndWait(this.selectors.confirmDeleteButton);
    
    // Should redirect to campaigns list
    await this.helpers.verifyURL('campaigns');
    await this.helpers.waitForToast('deleted');
  }

  /**
   * Search campaigns
   */
  async searchCampaigns(searchTerm: string) {
    await this.helpers.fillAndVerify(this.selectors.searchInput, searchTerm);
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Filter campaigns
   */
  async filterCampaigns(filterValue: string) {
    await this.helpers.selectOption(this.selectors.filterDropdown, filterValue);
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Sort campaigns
   */
  async sortCampaigns(sortValue: string) {
    await this.helpers.selectOption(this.selectors.sortDropdown, sortValue);
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Add artist to campaign
   */
  async addArtistToCampaign(artistName: string) {
    console.log(`🎵 Adding artist ${artistName} to campaign`);
    
    await this.helpers.clickAndWait(this.selectors.addArtistButton);
    
    // Search for artist in modal
    await this.helpers.verifyElementVisible(this.selectors.addArtistModal);
    await this.helpers.fillAndVerify(this.selectors.artistSearchInput, artistName);
    
    // Select first matching artist
    await this.helpers.clickAndWait(this.selectors.selectArtistButton);
    
    // Verify artist was added
    await this.helpers.waitForToast('artist added');
  }

  /**
   * Remove artist from campaign
   */
  async removeArtistFromCampaign(artistName: string) {
    console.log(`🗑️ Removing artist ${artistName} from campaign`);
    
    // Find the specific artist and click remove
    const artistElement = this.page.locator(`[data-testid="artist-item"]:has-text("${artistName}")`);
    const removeButton = artistElement.locator(this.selectors.removeArtistButton);
    
    await removeButton.click();
    await this.helpers.waitForToast('artist removed');
  }

  /**
   * Update stream count
   */
  async updateStreamCount(streamCount: number, date?: string) {
    console.log(`📊 Updating stream count: ${streamCount}`);
    
    await this.helpers.clickAndWait(this.selectors.addStreamDataButton);
    
    await this.helpers.fillAndVerify(this.selectors.streamCountInput, streamCount.toString());
    
    if (date) {
      await this.helpers.fillAndVerify(this.selectors.streamDateInput, date);
    }
    
    await this.helpers.clickAndWait(this.selectors.updateStreamsButton);
    await this.helpers.waitForToast('stream data updated');
  }

  /**
   * Verify campaign analytics are displayed
   */
  async verifyAnalyticsDisplayed() {
    await this.helpers.verifyElementVisible(this.selectors.analyticsSection);
    
    // Check for charts
    const charts = [
      this.selectors.streamCountChart,
      this.selectors.engagementChart,
      this.selectors.revenueChart
    ];

    for (const selector of charts) {
      try {
        await this.helpers.verifyChartRendered(selector);
      } catch (error) {
        console.log(`Chart not rendered: ${selector}`);
      }
    }
  }

  /**
   * Verify campaign list contains campaigns
   */
  async verifyCampaignsListHasData() {
    await this.helpers.verifyElementVisible(this.selectors.campaignsList);
    
    const campaigns = this.page.locator(this.selectors.campaignCard);
    await expect(campaigns.first()).toBeVisible();
  }

  /**
   * Get campaign count
   */
  async getCampaignCount(): Promise<number> {
    const campaigns = this.page.locator(this.selectors.campaignCard);
    return await campaigns.count();
  }

  /**
   * Export campaign data
   */
  async exportCampaign() {
    console.log('📤 Exporting campaign data');
    
    await this.helpers.clickAndWait(this.selectors.exportButton);
    await this.helpers.waitForToast('export');
  }

  /**
   * Duplicate campaign
   */
  async duplicateCampaign() {
    console.log('📋 Duplicating campaign');
    
    await this.helpers.clickAndWait(this.selectors.duplicateButton);
    await this.helpers.waitForToast('duplicated');
  }

  /**
   * Archive campaign
   */
  async archiveCampaign() {
    console.log('📦 Archiving campaign');
    
    await this.helpers.clickAndWait(this.selectors.archiveButton);
    await this.helpers.waitForToast('archived');
  }

  /**
   * Verify campaign details
   */
  async verifyCampaignDetails(expectedData: {
    name?: string;
    status?: string;
    budget?: number;
  }) {
    if (expectedData.name) {
      await this.helpers.verifyElementText(this.selectors.campaignTitle, expectedData.name);
    }
    
    if (expectedData.status) {
      await this.helpers.verifyElementText(this.selectors.campaignStatus, expectedData.status);
    }
    
    if (expectedData.budget) {
      await this.helpers.verifyElementText(this.selectors.campaignBudget, expectedData.budget.toString());
    }
  }

  /**
   * Test complete campaign workflow
   */
  async testCampaignWorkflow(testData: any) {
    // Create campaign
    await this.createCampaign(testData.campaign);
    
    // Edit campaign
    await this.editCampaign({ name: testData.campaign.name + ' (Updated)' });
    
    // Add artist to campaign
    if (testData.artist) {
      await this.addArtistToCampaign(testData.artist.name);
    }
    
    // Update stream count
    await this.updateStreamCount(1000);
    
    // Verify analytics
    await this.verifyAnalyticsDisplayed();
    
    // Export campaign
    await this.exportCampaign();
  }
}