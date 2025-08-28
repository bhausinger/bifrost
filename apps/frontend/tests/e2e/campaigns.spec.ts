import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage';
import { CampaignPage } from '../page-objects/CampaignPage';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Campaign Management Tests', () => {
  let authPage: AuthPage;
  let campaignPage: CampaignPage;
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    campaignPage = new CampaignPage(page);
    helpers = new TestHelpers(page);
    
    // Login before each test
    await authPage.login('benjamin.hausinger@gmail.com', 'TestPassword123!');
    await authPage.verifyLoggedIn();
  });

  test.describe('Campaign Creation', () => {
    test('should create a new campaign successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      const campaignData = {
        name: testData.campaignName,
        description: testData.description,
        budget: testData.amount,
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        status: 'draft'
      };
      
      await campaignPage.createCampaign(campaignData);
      
      // Verify campaign was created and we're on campaign details page
      await campaignPage.verifyOnCampaignDetails();
      await campaignPage.verifyCampaignDetails({
        name: campaignData.name,
        status: campaignData.status,
        budget: campaignData.budget
      });
    });

    test('should show validation errors for invalid campaign data', async ({ page }) => {
      await campaignPage.navigateTo();
      await helpers.clickAndWait('button:has-text("Create Campaign")');
      
      // Try to submit empty form
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show validation errors
      await helpers.waitForToast('name is required');
    });

    test('should create campaign with minimal required data', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'draft'
      });
      
      await campaignPage.verifyOnCampaignDetails();
      await campaignPage.verifyCampaignDetails({
        name: testData.campaignName,
        status: 'draft'
      });
    });

    test('should handle duplicate campaign names appropriately', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create first campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'draft'
      });
      
      // Try to create another campaign with same name
      await campaignPage.createCampaign({
        name: testData.campaignName, // Same name
        status: 'active'
      });
      
      // Should either allow it or show appropriate error
      await Promise.race([
        helpers.waitForToast('campaign created'),
        helpers.waitForToast('name already exists')
      ]);
    });
  });

  test.describe('Campaign Editing', () => {
    test('should edit campaign details successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign first
      await campaignPage.createCampaign({
        name: testData.campaignName,
        description: testData.description,
        budget: testData.amount,
        status: 'draft'
      });
      
      // Edit the campaign
      const updates = {
        name: testData.campaignName + ' (Updated)',
        description: 'Updated description for testing',
        budget: testData.amount + 1000,
        status: 'active'
      };
      
      await campaignPage.editCampaign(updates);
      
      // Verify changes were saved
      await campaignPage.verifyCampaignDetails({
        name: updates.name,
        status: updates.status,
        budget: updates.budget
      });
    });

    test('should validate edited campaign data', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign first
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'draft'
      });
      
      // Try to edit with invalid data
      await helpers.clickAndWait('[data-testid="edit-campaign"]');
      
      // Clear name field (required field)
      await page.fill('input[name="name"]', '');
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show validation error
      await helpers.waitForToast('name is required');
    });
  });

  test.describe('Campaign Deletion', () => {
    test('should delete campaign successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign first
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'draft'
      });
      
      // Delete the campaign
      await campaignPage.deleteCampaign();
      
      // Should be redirected to campaigns list
      await campaignPage.verifyOnCampaignsPage();
    });

    test('should require confirmation for campaign deletion', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign first
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'draft'
      });
      
      // Click delete button
      await helpers.clickAndWait('[data-testid="delete-campaign"]');
      
      // Should show confirmation modal
      await helpers.verifyElementVisible('[data-testid="delete-modal"]');
      
      // Cancel deletion
      await helpers.clickAndWait('button:has-text("Cancel")');
      
      // Should still be on campaign details page
      await campaignPage.verifyOnCampaignDetails();
    });
  });

  test.describe('Campaign Search and Filtering', () => {
    test('should search campaigns by name', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create a campaign to search for
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'active'
      });
      
      // Go to campaigns list and search
      await campaignPage.navigateTo();
      await campaignPage.searchCampaigns(testData.campaignName);
      
      // Should show the created campaign
      await campaignPage.verifyCampaignsListHasData();
      await helpers.verifyElementText('.campaign-card', testData.campaignName);
    });

    test('should filter campaigns by status', async ({ page }) => {
      // Create campaigns with different statuses
      const testData1 = helpers.generateTestData();
      const testData2 = helpers.generateTestData();
      
      await campaignPage.createCampaign({
        name: testData1.campaignName,
        status: 'active'
      });
      
      await campaignPage.createCampaign({
        name: testData2.campaignName,
        status: 'draft'
      });
      
      // Filter by active status
      await campaignPage.navigateTo();
      await campaignPage.filterCampaigns('active');
      
      // Should show only active campaigns
      await campaignPage.verifyCampaignsListHasData();
    });

    test('should sort campaigns correctly', async ({ page }) => {
      // Create multiple campaigns
      const campaigns = [
        { name: 'A Campaign', budget: 1000 },
        { name: 'Z Campaign', budget: 3000 },
        { name: 'M Campaign', budget: 2000 }
      ];
      
      for (const campaign of campaigns) {
        await campaignPage.createCampaign({
          name: campaign.name,
          budget: campaign.budget,
          status: 'active'
        });
      }
      
      // Test sorting by name
      await campaignPage.navigateTo();
      await campaignPage.sortCampaigns('name_asc');
      
      // Verify campaigns are sorted alphabetically
      const campaignCards = page.locator('.campaign-card');
      const firstCampaign = await campaignCards.first().textContent();
      expect(firstCampaign).toContain('A Campaign');
      
      // Test sorting by budget
      await campaignPage.sortCampaigns('budget_desc');
      
      // Verify campaigns are sorted by budget (highest first)
      const highestBudgetCampaign = await campaignCards.first().textContent();
      expect(highestBudgetCampaign).toContain('Z Campaign');
    });
  });

  test.describe('Campaign Analytics', () => {
    test('should display campaign analytics correctly', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'active'
      });
      
      // Add some stream data
      await campaignPage.updateStreamCount(1000, '2024-01-15');
      await campaignPage.updateStreamCount(2500, '2024-02-15');
      await campaignPage.updateStreamCount(4000, '2024-03-15');
      
      // Verify analytics are displayed
      await campaignPage.verifyAnalyticsDisplayed();
    });

    test('should update stream counts correctly', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'active'
      });
      
      // Add initial stream count
      await campaignPage.updateStreamCount(1500);
      
      // Add another stream count
      await campaignPage.updateStreamCount(3000);
      
      // Verify analytics show updated data
      await campaignPage.verifyAnalyticsDisplayed();
    });
  });

  test.describe('Artist Association', () => {
    test('should associate artist with campaign', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'active'
      });
      
      // Add artist to campaign (assuming artist exists)
      await campaignPage.addArtistToCampaign('Test Artist');
      
      // Verify artist was associated
      await helpers.verifyElementVisible('[data-testid="campaign-artists"]');
    });

    test('should remove artist from campaign', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'active'
      });
      
      // Add artist first
      await campaignPage.addArtistToCampaign('Test Artist');
      
      // Remove artist
      await campaignPage.removeArtistFromCampaign('Test Artist');
      
      // Verify artist was removed
      await helpers.waitForToast('artist removed');
    });
  });

  test.describe('Campaign Export and Import', () => {
    test('should export campaign data', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign with data
      await campaignPage.createCampaign({
        name: testData.campaignName,
        description: testData.description,
        budget: testData.amount,
        status: 'active'
      });
      
      // Add some stream data
      await campaignPage.updateStreamCount(2000);
      
      // Export campaign
      await campaignPage.exportCampaign();
      
      // Verify export completed
      await helpers.waitForToast('export');
    });

    test('should duplicate campaign', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        description: testData.description,
        budget: testData.amount,
        status: 'active'
      });
      
      // Duplicate campaign
      await campaignPage.duplicateCampaign();
      
      // Verify duplication completed
      await helpers.waitForToast('duplicated');
    });

    test('should archive campaign', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'active'
      });
      
      // Archive campaign
      await campaignPage.archiveCampaign();
      
      // Verify archiving completed
      await helpers.waitForToast('archived');
    });
  });

  test.describe('Campaign Performance', () => {
    test('should handle large number of campaigns', async ({ page }) => {
      // Create multiple campaigns to test performance
      const campaignCount = 10;
      
      for (let i = 1; i <= campaignCount; i++) {
        await campaignPage.createCampaign({
          name: `Performance Test Campaign ${i}`,
          budget: 1000 * i,
          status: i % 2 === 0 ? 'active' : 'draft'
        });
      }
      
      // Navigate to campaigns list
      await campaignPage.navigateTo();
      
      // Verify all campaigns load within reasonable time
      const startTime = Date.now();
      await campaignPage.verifyCampaignsListHasData();
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Verify correct number of campaigns
      const campaignCount_actual = await campaignPage.getCampaignCount();
      expect(campaignCount_actual).toBeGreaterThanOrEqual(campaignCount);
    });

    test('should handle campaign with large stream data', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'active'
      });
      
      // Add many stream data points
      const streamCounts = [
        { count: 1000, date: '2024-01-01' },
        { count: 2500, date: '2024-01-15' },
        { count: 4200, date: '2024-02-01' },
        { count: 6800, date: '2024-02-15' },
        { count: 9500, date: '2024-03-01' },
        { count: 12300, date: '2024-03-15' }
      ];
      
      for (const stream of streamCounts) {
        await campaignPage.updateStreamCount(stream.count, stream.date);
      }
      
      // Verify analytics still display correctly
      await campaignPage.verifyAnalyticsDisplayed();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/campaigns', route => {
        route.abort('failed');
      });
      
      await campaignPage.navigateTo();
      
      // Should show network error message
      await helpers.waitForToast('network error');
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Simulate server error
      await page.route('**/campaigns', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      const testData = helpers.generateTestData();
      
      await campaignPage.createCampaign({
        name: testData.campaignName,
        status: 'draft'
      });
      
      // Should show server error message
      await helpers.waitForToast('server error');
    });

    test('should validate required fields', async ({ page }) => {
      await campaignPage.navigateTo();
      await helpers.clickAndWait('button:has-text("Create Campaign")');
      
      // Submit form without required fields
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show validation errors
      await helpers.waitForToast('required');
    });
  });

  test.describe('Campaign Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await campaignPage.navigateTo();
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('button:has-text("Create Campaign")')).toBeFocused();
      
      await page.keyboard.press('Enter');
      
      // Should open campaign creation form
      await helpers.verifyElementVisible('form');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await campaignPage.navigateTo();
      await helpers.clickAndWait('button:has-text("Create Campaign")');
      
      // Check for proper form labeling
      const nameInput = page.locator('input[name="name"]');
      const budgetInput = page.locator('input[name="budget"]');
      
      await expect(nameInput).toHaveAttribute('aria-label');
      await expect(budgetInput).toHaveAttribute('aria-label');
    });
  });
});