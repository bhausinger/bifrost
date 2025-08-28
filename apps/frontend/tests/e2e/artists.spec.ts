import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage';
import { ArtistPage } from '../page-objects/ArtistPage';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Artist Management Tests', () => {
  let authPage: AuthPage;
  let artistPage: ArtistPage;
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    artistPage = new ArtistPage(page);
    helpers = new TestHelpers(page);
    
    // Login before each test
    await authPage.login('benjamin.hausinger@gmail.com', 'TestPassword123!');
    await authPage.verifyLoggedIn();
  });

  test.describe('Artist Creation', () => {
    test('should add new artist successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      const artistData = {
        name: testData.artistName,
        genre: 'Electronic',
        bio: testData.description,
        email: testData.email,
        phone: '+1-555-0123',
        location: 'Los Angeles, CA'
      };
      
      await artistPage.addArtist(artistData);
      
      // Verify artist was created and we're on artist details page
      await artistPage.verifyOnArtistDetails();
      await artistPage.verifyArtistDetails({
        name: artistData.name,
        genre: artistData.genre,
        bio: artistData.bio,
        location: artistData.location
      });
    });

    test('should create artist with minimal required data', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Pop'
      });
      
      await artistPage.verifyOnArtistDetails();
      await artistPage.verifyArtistDetails({
        name: testData.artistName,
        genre: 'Pop'
      });
    });

    test('should show validation errors for invalid artist data', async ({ page }) => {
      await artistPage.navigateTo();
      await helpers.clickAndWait('button:has-text("Add Artist")');
      
      // Try to submit empty form
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show validation errors
      await helpers.waitForToast('name is required');
    });

    test('should validate email format', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      await artistPage.navigateTo();
      await helpers.clickAndWait('button:has-text("Add Artist")');
      
      // Fill valid name but invalid email
      await helpers.fillAndVerify('input[name="name"]', testData.artistName);
      await helpers.fillAndVerify('input[name="email"]', 'invalid-email');
      
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show email validation error
      await helpers.waitForToast('invalid email');
    });
  });

  test.describe('Artist Search and Filtering', () => {
    test('should search artists by name', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create an artist to search for
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Rock'
      });
      
      // Go to artists list and search
      await artistPage.navigateTo();
      await artistPage.searchArtists(testData.artistName);
      
      // Should show the created artist
      await artistPage.verifyArtistsListHasData();
      await helpers.verifyElementText('.artist-card', testData.artistName);
    });

    test('should filter artists by genre', async ({ page }) => {
      // Create artists with different genres
      const testData1 = helpers.generateTestData();
      const testData2 = helpers.generateTestData();
      
      await artistPage.addArtist({
        name: testData1.artistName,
        genre: 'Jazz'
      });
      
      await artistPage.addArtist({
        name: testData2.artistName,
        genre: 'Classical'
      });
      
      // Filter by Jazz genre
      await artistPage.navigateTo();
      await artistPage.filterByGenre('Jazz');
      
      // Should show only Jazz artists
      await artistPage.verifyArtistsListHasData();
      await helpers.verifyElementText('.artist-card', testData1.artistName);
    });

    test('should handle empty search results', async ({ page }) => {
      await artistPage.navigateTo();
      await artistPage.searchArtists('NonexistentArtist12345');
      
      // Should show no results message
      await helpers.verifyElementVisible('[data-testid="no-results"], .no-results');
    });
  });

  test.describe('Social Profile Management', () => {
    test('should add social profile to artist', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist first
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Hip Hop'
      });
      
      // Add SoundCloud profile
      await artistPage.addSocialProfile({
        platform: 'SoundCloud',
        username: 'testartist_sc',
        url: 'https://soundcloud.com/testartist_sc',
        followers: 15000
      });
      
      // Verify social profile was added
      await helpers.verifyElementVisible('[data-testid="social-profiles"]');
      await helpers.verifyElementText('[data-testid="social-profiles"]', 'SoundCloud');
    });

    test('should add multiple social profiles', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist first
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Pop'
      });
      
      // Add multiple social profiles
      const socialProfiles = [
        { platform: 'SoundCloud', username: 'test_sc', followers: 10000 },
        { platform: 'Spotify', username: 'test_spotify', followers: 5000 },
        { platform: 'YouTube', username: 'test_youtube', followers: 25000 }
      ];
      
      for (const profile of socialProfiles) {
        await artistPage.addSocialProfile(profile);
      }
      
      // Verify all profiles were added
      await helpers.verifyElementVisible('[data-testid="social-profiles"]');
      for (const profile of socialProfiles) {
        await helpers.verifyElementText('[data-testid="social-profiles"]', profile.platform);
      }
    });

    test('should validate social profile data', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist first
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Electronic'
      });
      
      // Try to add social profile with invalid URL
      await helpers.clickAndWait('[data-testid="add-social-profile"]');
      await helpers.selectOption('select[name="platform"]', 'SoundCloud');
      await helpers.fillAndVerify('input[name="url"]', 'invalid-url');
      
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show URL validation error
      await helpers.waitForToast('invalid url');
    });
  });

  test.describe('SoundCloud Scraping', () => {
    test('should scrape SoundCloud profile successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist first
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Electronic'
      });
      
      // Test SoundCloud scraping with a mock URL
      const soundcloudUrl = 'https://soundcloud.com/testartist';
      
      // Mock the scraping API response
      await page.route('**/scrape/soundcloud', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            name: 'Test Artist',
            followers: 10000,
            tracks: 25,
            bio: 'Test artist bio from SoundCloud'
          })
        });
      });
      
      await artistPage.scrapeSoundCloud(soundcloudUrl);
      
      // Verify scraped data is displayed
      await helpers.verifyElementVisible('[data-testid="scraped-data"]');
    });

    test('should handle invalid SoundCloud URLs', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist first
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Electronic'
      });
      
      // Try to scrape invalid URL
      await helpers.verifyElementVisible('[data-testid="soundcloud-section"]');
      await helpers.fillAndVerify('[data-testid="soundcloud-url"]', 'invalid-url');
      await helpers.clickAndWait('[data-testid="scrape-soundcloud"]');
      
      // Should show error message
      await helpers.waitForToast('invalid url');
    });

    test('should handle scraping errors gracefully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist first
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Electronic'
      });
      
      // Mock scraping API error
      await page.route('**/scrape/soundcloud', route => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ error: 'Profile not found' })
        });
      });
      
      await artistPage.scrapeSoundCloud('https://soundcloud.com/nonexistent');
      
      // Should show error message
      await helpers.waitForToast('profile not found');
    });
  });

  test.describe('AI Artist Discovery', () => {
    test('should find similar artists successfully', async ({ page }) => {
      // Mock AI discovery API response
      await page.route('**/ai/similar-artists', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            artists: [
              { name: 'Similar Artist 1', genre: 'Electronic', similarity: 0.85 },
              { name: 'Similar Artist 2', genre: 'Electronic', similarity: 0.78 },
              { name: 'Similar Artist 3', genre: 'Electronic', similarity: 0.72 }
            ]
          })
        });
      });
      
      await artistPage.navigateTo();
      await artistPage.findSimilarArtists('Daft Punk', 'Electronic');
      
      // Verify similar artists are displayed
      await helpers.verifyElementVisible('[data-testid="similar-artists-list"]');
      await helpers.verifyElementText('[data-testid="similar-artists-list"]', 'Similar Artist 1');
    });

    test('should add discovered artist to database', async ({ page }) => {
      // Mock AI discovery API response
      await page.route('**/ai/similar-artists', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            artists: [
              { name: 'Discovered Artist', genre: 'Electronic', similarity: 0.85 }
            ]
          })
        });
      });
      
      await artistPage.navigateTo();
      await artistPage.findSimilarArtists('Test Reference Artist', 'Electronic');
      
      // Add discovered artist
      await artistPage.addDiscoveredArtist('Discovered Artist');
      
      // Verify artist was added
      await helpers.waitForToast('artist added');
    });

    test('should handle AI discovery errors', async ({ page }) => {
      // Mock AI API error
      await page.route('**/ai/similar-artists', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'AI service unavailable' })
        });
      });
      
      await artistPage.navigateTo();
      await artistPage.findSimilarArtists('Test Artist', 'Electronic');
      
      // Should show error message
      await helpers.waitForToast('ai service error');
    });

    test('should test complete discovery workflow', async ({ page }) => {
      // Mock AI discovery API response
      await page.route('**/ai/similar-artists', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            artists: [
              { name: 'Workflow Test Artist', genre: 'Electronic', similarity: 0.80 }
            ]
          })
        });
      });
      
      await artistPage.navigateTo();
      await artistPage.testDiscoveryWorkflow('Calvin Harris');
      
      // Verify discovery workflow completed
      await helpers.waitForToast('artist added');
    });
  });

  test.describe('Artist Editing and Deletion', () => {
    test('should edit artist information successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist first
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Pop',
        bio: testData.description,
        email: testData.email
      });
      
      // Edit the artist
      const updates = {
        name: testData.artistName + ' (Updated)',
        genre: 'Rock',
        bio: 'Updated bio for testing',
        email: 'updated@example.com'
      };
      
      await artistPage.editArtist(updates);
      
      // Verify changes were saved
      await artistPage.verifyArtistDetails({
        name: updates.name,
        genre: updates.genre,
        bio: updates.bio
      });
    });

    test('should delete artist successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist first
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Jazz'
      });
      
      // Delete the artist
      await artistPage.deleteArtist();
      
      // Should be redirected to artists list
      await artistPage.verifyOnArtistsPage();
    });

    test('should require confirmation for artist deletion', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist first
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Classical'
      });
      
      // Click delete button
      await helpers.clickAndWait('[data-testid="delete-artist"]');
      
      // Should show confirmation modal
      await helpers.verifyElementVisible('[data-testid="delete-modal"]');
      
      // Cancel deletion
      await helpers.clickAndWait('button:has-text("Cancel")');
      
      // Should still be on artist details page
      await artistPage.verifyOnArtistDetails();
    });
  });

  test.describe('Campaign Association', () => {
    test('should associate artist with campaign', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist first
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Pop'
      });
      
      // Associate with campaign (assuming campaign exists)
      await artistPage.associateWithCampaign('Test Campaign');
      
      // Verify association completed
      await helpers.waitForToast('associated');
      await helpers.verifyElementVisible('[data-testid="artist-campaigns"]');
    });
  });

  test.describe('Import and Export', () => {
    test('should export artists data', async ({ page }) => {
      // Create some test artists
      const artists = [
        { name: 'Export Test Artist 1', genre: 'Pop' },
        { name: 'Export Test Artist 2', genre: 'Rock' },
        { name: 'Export Test Artist 3', genre: 'Jazz' }
      ];
      
      for (const artist of artists) {
        await artistPage.addArtist(artist);
      }
      
      // Export artists as CSV
      await artistPage.navigateTo();
      await artistPage.exportArtists('csv');
      
      // Verify export completed
      await helpers.waitForToast('exported');
    });

    test('should import artists from file', async ({ page }) => {
      // Create a mock CSV file path for testing
      const mockFilePath = '/path/to/test-artists.csv';
      
      // Mock file upload
      await page.route('**/upload', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Artists imported successfully' })
        });
      });
      
      await artistPage.importArtists(mockFilePath);
      
      // Verify import completed
      await helpers.waitForToast('imported');
    });
  });

  test.describe('Bulk Operations', () => {
    test('should perform bulk operations on selected artists', async ({ page }) => {
      // Create multiple artists
      const artists = [
        'Bulk Test Artist 1',
        'Bulk Test Artist 2',
        'Bulk Test Artist 3'
      ];
      
      for (const artistName of artists) {
        await artistPage.addArtist({
          name: artistName,
          genre: 'Electronic'
        });
      }
      
      // Perform bulk export
      await artistPage.navigateTo();
      await artistPage.performBulkAction('Export', artists);
      
      // Verify bulk action completed
      await helpers.waitForToast('action completed');
    });

    test('should select all artists for bulk operations', async ({ page }) => {
      // Create multiple artists
      for (let i = 1; i <= 5; i++) {
        await artistPage.addArtist({
          name: `Bulk Select Artist ${i}`,
          genre: 'Pop'
        });
      }
      
      await artistPage.navigateTo();
      
      // Select all artists
      await helpers.clickAndWait('[data-testid="select-all"]');
      
      // Verify all checkboxes are selected
      const checkboxes = page.locator('[data-testid="select-artist"]');
      const count = await checkboxes.count();
      
      for (let i = 0; i < count; i++) {
        await expect(checkboxes.nth(i)).toBeChecked();
      }
    });
  });

  test.describe('Artist Analytics', () => {
    test('should display artist analytics correctly', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artist with social profiles
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Electronic'
      });
      
      // Add social profiles for analytics
      await artistPage.addSocialProfile({
        platform: 'SoundCloud',
        followers: 10000
      });
      
      await artistPage.addSocialProfile({
        platform: 'Spotify',
        followers: 5000
      });
      
      // Verify analytics are displayed
      await artistPage.verifyAnalyticsDisplayed();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle large number of artists', async ({ page }) => {
      // Create multiple artists to test performance
      const artistCount = 20;
      
      for (let i = 1; i <= artistCount; i++) {
        await artistPage.addArtist({
          name: `Performance Test Artist ${i}`,
          genre: i % 3 === 0 ? 'Pop' : i % 3 === 1 ? 'Rock' : 'Jazz'
        });
      }
      
      // Navigate to artists list
      await artistPage.navigateTo();
      
      // Verify all artists load within reasonable time
      const startTime = Date.now();
      await artistPage.verifyArtistsListHasData();
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Verify correct number of artists
      const actualCount = await artistPage.getArtistCount();
      expect(actualCount).toBeGreaterThanOrEqual(artistCount);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/artists', route => {
        route.abort('failed');
      });
      
      await artistPage.navigateTo();
      
      // Should show network error message
      await helpers.waitForToast('network error');
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Simulate server error
      await page.route('**/artists', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      const testData = helpers.generateTestData();
      
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Pop'
      });
      
      // Should show server error message
      await helpers.waitForToast('server error');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await artistPage.navigateTo();
      
      // Tab through elements
      await page.keyboard.press('Tab');
      await expect(page.locator('button:has-text("Add Artist")')).toBeFocused();
      
      await page.keyboard.press('Enter');
      
      // Should open artist creation form
      await helpers.verifyElementVisible('form');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await artistPage.navigateTo();
      await helpers.clickAndWait('button:has-text("Add Artist")');
      
      // Check for proper form labeling
      const nameInput = page.locator('input[name="name"]');
      const genreSelect = page.locator('select[name="genre"]');
      
      await expect(nameInput).toHaveAttribute('aria-label');
      await expect(genreSelect).toHaveAttribute('aria-label');
    });
  });
});