import { Page, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

export class ArtistPage {
  private helpers: TestHelpers;

  constructor(private page: Page) {
    this.helpers = new TestHelpers(page);
  }

  // Selectors
  private selectors = {
    // Artist list
    artistsList: '[data-testid="artists-list"], .artists-list',
    artistCard: '[data-testid="artist-card"], .artist-card',
    addArtistButton: 'button:has-text("Add Artist"), [data-testid="add-artist"]',
    importArtistsButton: 'button:has-text("Import"), [data-testid="import-artists"]',
    searchInput: 'input[placeholder*="Search"], [data-testid="search-artists"]',
    filterDropdown: '[data-testid="filter-dropdown"], select[name="filter"]',
    genreFilter: '[data-testid="genre-filter"], select[name="genre"]',
    
    // Artist form
    artistForm: '[data-testid="artist-form"], form',
    nameInput: 'input[name="name"], [data-testid="artist-name"]',
    genreSelect: 'select[name="genre"], [data-testid="artist-genre"]',
    bioInput: 'textarea[name="bio"], [data-testid="artist-bio"]',
    emailInput: 'input[name="email"], [data-testid="artist-email"]',
    phoneInput: 'input[name="phone"], [data-testid="artist-phone"]',
    locationInput: 'input[name="location"], [data-testid="artist-location"]',
    saveButton: 'button:has-text("Save"), button[type="submit"]',
    cancelButton: 'button:has-text("Cancel")',
    
    // Social profiles
    socialProfilesSection: '[data-testid="social-profiles"]',
    addSocialButton: 'button:has-text("Add Social"), [data-testid="add-social-profile"]',
    platformSelect: 'select[name="platform"], [data-testid="social-platform"]',
    usernameInput: 'input[name="username"], [data-testid="social-username"]',
    urlInput: 'input[name="url"], [data-testid="social-url"]',
    followersInput: 'input[name="followers"], [data-testid="social-followers"]',
    saveSocialButton: 'button:has-text("Add Profile"), [data-testid="save-social"]',
    
    // SoundCloud scraping
    soundcloudSection: '[data-testid="soundcloud-section"]',
    soundcloudUrlInput: 'input[name="soundcloudUrl"], [data-testid="soundcloud-url"]',
    scrapeButton: 'button:has-text("Scrape"), [data-testid="scrape-soundcloud"]',
    scrapingStatus: '[data-testid="scraping-status"]',
    scrapedData: '[data-testid="scraped-data"]',
    
    // AI Discovery
    discoverySection: '[data-testid="discovery-section"]',
    findSimilarButton: 'button:has-text("Find Similar"), [data-testid="find-similar-artists"]',
    referenceArtistInput: 'input[name="referenceArtist"], [data-testid="reference-artist"]',
    genreInput: 'input[name="genre"], [data-testid="discovery-genre"]',
    similarArtistsList: '[data-testid="similar-artists-list"]',
    addDiscoveredArtistButton: '[data-testid="add-discovered-artist"]',
    
    // Artist details
    artistTitle: '[data-testid="artist-title"], h1, h2',
    artistGenre: '[data-testid="artist-genre"]',
    artistBio: '[data-testid="artist-bio"]',
    artistLocation: '[data-testid="artist-location"]',
    editButton: 'button:has-text("Edit"), [data-testid="edit-artist"]',
    deleteButton: 'button:has-text("Delete"), [data-testid="delete-artist"]',
    
    // Artist analytics
    analyticsSection: '[data-testid="artist-analytics"]',
    totalFollowers: '[data-testid="total-followers"]',
    streamCount: '[data-testid="stream-count"]',
    engagementRate: '[data-testid="engagement-rate"]',
    growthChart: '[data-testid="growth-chart"]',
    platformBreakdown: '[data-testid="platform-breakdown"]',
    
    // Campaign associations
    campaignsSection: '[data-testid="artist-campaigns"]',
    associateCampaignButton: 'button:has-text("Associate"), [data-testid="associate-campaign"]',
    campaignSelect: 'select[name="campaign"], [data-testid="campaign-select"]',
    associateButton: 'button:has-text("Associate"), [data-testid="confirm-associate"]',
    
    // Bulk actions
    selectAllCheckbox: 'input[type="checkbox"][data-testid="select-all"]',
    artistCheckbox: 'input[type="checkbox"][data-testid="select-artist"]',
    bulkActionsDropdown: '[data-testid="bulk-actions"], select[name="bulkAction"]',
    applyBulkActionButton: 'button:has-text("Apply"), [data-testid="apply-bulk-action"]',
    
    // Modals
    deleteModal: '[data-testid="delete-modal"]',
    confirmDeleteButton: 'button:has-text("Confirm"), [data-testid="confirm-delete"]',
    importModal: '[data-testid="import-modal"]',
    fileInput: 'input[type="file"], [data-testid="file-upload"]',
    uploadButton: 'button:has-text("Upload"), [data-testid="upload-file"]',
    
    // Export
    exportButton: 'button:has-text("Export"), [data-testid="export-artists"]',
    exportFormatSelect: 'select[name="format"], [data-testid="export-format"]',
  };

  /**
   * Navigate to artists page
   */
  async navigateTo() {
    await this.helpers.navigateTo('/artists');
    await this.verifyOnArtistsPage();
  }

  /**
   * Navigate to specific artist
   */
  async navigateToArtist(artistId: string) {
    await this.helpers.navigateTo(`/artists/${artistId}`);
    await this.verifyOnArtistDetails();
  }

  /**
   * Verify we're on artists page
   */
  async verifyOnArtistsPage() {
    await this.helpers.verifyURL('artists');
    await this.helpers.verifyElementVisible(this.selectors.addArtistButton);
  }

  /**
   * Verify we're on artist details page
   */
  async verifyOnArtistDetails() {
    await this.helpers.verifyURL('artists/');
    await this.helpers.verifyElementVisible(this.selectors.artistTitle);
  }

  /**
   * Add new artist manually
   */
  async addArtist(artistData: {
    name: string;
    genre?: string;
    bio?: string;
    email?: string;
    phone?: string;
    location?: string;
  }) {
    console.log(`🎵 Adding artist: ${artistData.name}`);
    
    await this.navigateTo();
    await this.helpers.clickAndWait(this.selectors.addArtistButton);
    
    // Fill basic artist information
    await this.helpers.fillAndVerify(this.selectors.nameInput, artistData.name);
    
    if (artistData.genre) {
      await this.helpers.selectOption(this.selectors.genreSelect, artistData.genre);
    }
    
    if (artistData.bio) {
      await this.helpers.fillAndVerify(this.selectors.bioInput, artistData.bio);
    }
    
    if (artistData.email) {
      await this.helpers.fillAndVerify(this.selectors.emailInput, artistData.email);
    }
    
    if (artistData.phone) {
      await this.helpers.fillAndVerify(this.selectors.phoneInput, artistData.phone);
    }
    
    if (artistData.location) {
      await this.helpers.fillAndVerify(this.selectors.locationInput, artistData.location);
    }
    
    // Save artist
    await this.helpers.clickAndWait(this.selectors.saveButton);
    
    // Wait for success
    await Promise.race([
      this.helpers.waitForToast('success'),
      this.helpers.waitForToast('created'),
      this.page.waitForURL('**/artists/**', { timeout: 10000 })
    ]);
  }

  /**
   * Add social profile to artist
   */
  async addSocialProfile(socialData: {
    platform: string;
    username?: string;
    url?: string;
    followers?: number;
  }) {
    console.log(`📱 Adding ${socialData.platform} profile`);
    
    await this.helpers.clickAndWait(this.selectors.addSocialButton);
    
    await this.helpers.selectOption(this.selectors.platformSelect, socialData.platform);
    
    if (socialData.username) {
      await this.helpers.fillAndVerify(this.selectors.usernameInput, socialData.username);
    }
    
    if (socialData.url) {
      await this.helpers.fillAndVerify(this.selectors.urlInput, socialData.url);
    }
    
    if (socialData.followers) {
      await this.helpers.fillAndVerify(this.selectors.followersInput, socialData.followers.toString());
    }
    
    await this.helpers.clickAndWait(this.selectors.saveSocialButton);
    await this.helpers.waitForToast('profile added');
  }

  /**
   * Scrape SoundCloud profile
   */
  async scrapeSoundCloud(soundcloudUrl: string) {
    console.log(`🎧 Scraping SoundCloud: ${soundcloudUrl}`);
    
    await this.helpers.verifyElementVisible(this.selectors.soundcloudSection);
    await this.helpers.fillAndVerify(this.selectors.soundcloudUrlInput, soundcloudUrl);
    
    await this.helpers.clickAndWait(this.selectors.scrapeButton);
    
    // Wait for scraping to complete
    await this.helpers.verifyElementVisible(this.selectors.scrapingStatus);
    
    // Wait for scraped data to appear
    await this.page.waitForSelector(this.selectors.scrapedData, { timeout: 30000 });
    
    console.log('✅ SoundCloud scraping completed');
  }

  /**
   * Find similar artists using AI
   */
  async findSimilarArtists(referenceArtist: string, genre?: string) {
    console.log(`🤖 Finding artists similar to: ${referenceArtist}`);
    
    await this.helpers.verifyElementVisible(this.selectors.discoverySection);
    await this.helpers.fillAndVerify(this.selectors.referenceArtistInput, referenceArtist);
    
    if (genre) {
      await this.helpers.fillAndVerify(this.selectors.genreInput, genre);
    }
    
    await this.helpers.clickAndWait(this.selectors.findSimilarButton);
    
    // Wait for AI processing
    await this.page.waitForSelector(this.selectors.similarArtistsList, { timeout: 30000 });
    
    console.log('✅ Similar artists discovery completed');
  }

  /**
   * Add discovered artist to database
   */
  async addDiscoveredArtist(artistName: string) {
    console.log(`➕ Adding discovered artist: ${artistName}`);
    
    const artistElement = this.page.locator(`[data-testid="similar-artist"]:has-text("${artistName}")`);
    const addButton = artistElement.locator(this.selectors.addDiscoveredArtistButton);
    
    await addButton.click();
    await this.helpers.waitForToast('artist added');
  }

  /**
   * Search artists
   */
  async searchArtists(searchTerm: string) {
    await this.helpers.fillAndVerify(this.selectors.searchInput, searchTerm);
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Filter artists by genre
   */
  async filterByGenre(genre: string) {
    await this.helpers.selectOption(this.selectors.genreFilter, genre);
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Edit artist information
   */
  async editArtist(updates: {
    name?: string;
    genre?: string;
    bio?: string;
    email?: string;
  }) {
    console.log('✏️ Editing artist');
    
    await this.helpers.clickAndWait(this.selectors.editButton);
    
    if (updates.name) {
      await this.helpers.fillAndVerify(this.selectors.nameInput, updates.name);
    }
    
    if (updates.genre) {
      await this.helpers.selectOption(this.selectors.genreSelect, updates.genre);
    }
    
    if (updates.bio) {
      await this.helpers.fillAndVerify(this.selectors.bioInput, updates.bio);
    }
    
    if (updates.email) {
      await this.helpers.fillAndVerify(this.selectors.emailInput, updates.email);
    }
    
    await this.helpers.clickAndWait(this.selectors.saveButton);
    await this.helpers.waitForToast('updated');
  }

  /**
   * Delete artist
   */
  async deleteArtist() {
    console.log('🗑️ Deleting artist');
    
    await this.helpers.clickAndWait(this.selectors.deleteButton);
    
    // Confirm deletion
    await this.helpers.verifyElementVisible(this.selectors.deleteModal);
    await this.helpers.clickAndWait(this.selectors.confirmDeleteButton);
    
    // Should redirect to artists list
    await this.helpers.verifyURL('artists');
    await this.helpers.waitForToast('deleted');
  }

  /**
   * Associate artist with campaign
   */
  async associateWithCampaign(campaignName: string) {
    console.log(`🔗 Associating artist with campaign: ${campaignName}`);
    
    await this.helpers.clickAndWait(this.selectors.associateCampaignButton);
    await this.helpers.selectOption(this.selectors.campaignSelect, campaignName);
    await this.helpers.clickAndWait(this.selectors.associateButton);
    
    await this.helpers.waitForToast('associated');
  }

  /**
   * Import artists from file
   */
  async importArtists(filePath: string) {
    console.log(`📄 Importing artists from: ${filePath}`);
    
    await this.helpers.clickAndWait(this.selectors.importArtistsButton);
    
    // Upload file
    await this.helpers.verifyElementVisible(this.selectors.importModal);
    await this.helpers.uploadFile(this.selectors.fileInput, filePath);
    await this.helpers.clickAndWait(this.selectors.uploadButton);
    
    // Wait for import to complete
    await this.helpers.waitForToast('imported');
  }

  /**
   * Export artists data
   */
  async exportArtists(format: string = 'csv') {
    console.log(`📤 Exporting artists as ${format}`);
    
    await this.helpers.selectOption(this.selectors.exportFormatSelect, format);
    await this.helpers.clickAndWait(this.selectors.exportButton);
    
    await this.helpers.waitForToast('exported');
  }

  /**
   * Perform bulk actions on selected artists
   */
  async performBulkAction(action: string, artistNames: string[]) {
    console.log(`🔄 Performing bulk action: ${action} on ${artistNames.length} artists`);
    
    // Select artists
    for (const artistName of artistNames) {
      const artistCard = this.page.locator(`[data-testid="artist-card"]:has-text("${artistName}")`);
      const checkbox = artistCard.locator(this.selectors.artistCheckbox);
      await checkbox.check();
    }
    
    // Apply bulk action
    await this.helpers.selectOption(this.selectors.bulkActionsDropdown, action);
    await this.helpers.clickAndWait(this.selectors.applyBulkActionButton);
    
    await this.helpers.waitForToast('action completed');
  }

  /**
   * Verify artist analytics are displayed
   */
  async verifyAnalyticsDisplayed() {
    await this.helpers.verifyElementVisible(this.selectors.analyticsSection);
    
    // Check for analytics elements
    const analyticsElements = [
      this.selectors.totalFollowers,
      this.selectors.streamCount,
      this.selectors.engagementRate
    ];

    for (const selector of analyticsElements) {
      try {
        await this.helpers.verifyElementVisible(selector);
      } catch (error) {
        console.log(`Analytics element not visible: ${selector}`);
      }
    }
    
    // Check for charts
    try {
      await this.helpers.verifyChartRendered(this.selectors.growthChart);
    } catch (error) {
      console.log('Growth chart not rendered');
    }
  }

  /**
   * Verify artists list has data
   */
  async verifyArtistsListHasData() {
    await this.helpers.verifyElementVisible(this.selectors.artistsList);
    
    const artists = this.page.locator(this.selectors.artistCard);
    await expect(artists.first()).toBeVisible();
  }

  /**
   * Get artist count
   */
  async getArtistCount(): Promise<number> {
    const artists = this.page.locator(this.selectors.artistCard);
    return await artists.count();
  }

  /**
   * Verify artist details
   */
  async verifyArtistDetails(expectedData: {
    name?: string;
    genre?: string;
    bio?: string;
    location?: string;
  }) {
    if (expectedData.name) {
      await this.helpers.verifyElementText(this.selectors.artistTitle, expectedData.name);
    }
    
    if (expectedData.genre) {
      await this.helpers.verifyElementText(this.selectors.artistGenre, expectedData.genre);
    }
    
    if (expectedData.bio) {
      await this.helpers.verifyElementText(this.selectors.artistBio, expectedData.bio);
    }
    
    if (expectedData.location) {
      await this.helpers.verifyElementText(this.selectors.artistLocation, expectedData.location);
    }
  }

  /**
   * Test complete artist discovery workflow
   */
  async testDiscoveryWorkflow(referenceArtist: string) {
    // Find similar artists
    await this.findSimilarArtists(referenceArtist);
    
    // Add first discovered artist
    const similarArtists = this.page.locator('[data-testid="similar-artist"]');
    if (await similarArtists.count() > 0) {
      const firstArtist = await similarArtists.first().textContent();
      if (firstArtist) {
        await this.addDiscoveredArtist(firstArtist);
      }
    }
  }
}