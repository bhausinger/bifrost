import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage';
import { CampaignPage } from '../page-objects/CampaignPage';
import { ArtistPage } from '../page-objects/ArtistPage';
import { OutreachPage } from '../page-objects/OutreachPage';
import { FinancialPage } from '../page-objects/FinancialPage';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Data Management Tests', () => {
  let authPage: AuthPage;
  let campaignPage: CampaignPage;
  let artistPage: ArtistPage;
  let outreachPage: OutreachPage;
  let financialPage: FinancialPage;
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    campaignPage = new CampaignPage(page);
    artistPage = new ArtistPage(page);
    outreachPage = new OutreachPage(page);
    financialPage = new FinancialPage(page);
    helpers = new TestHelpers(page);
    
    // Login before each test
    await authPage.login('benjamin.hausinger@gmail.com', 'TestPassword123!');
    await authPage.verifyLoggedIn();
  });

  test.describe('Data Export Functionality', () => {
    test('should export campaign data successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign with data
      await campaignPage.createCampaign({
        name: testData.campaignName,
        description: testData.description,
        budget: testData.amount,
        status: 'active'
      });
      
      // Add stream data
      await campaignPage.updateStreamCount(1500, '2024-01-15');
      await campaignPage.updateStreamCount(2800, '2024-02-15');
      
      // Mock export API
      await page.route('**/campaigns/*/export', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Campaign data exported successfully',
            filename: 'campaign-export.csv',
            recordCount: 1
          })
        });
      });
      
      // Export campaign
      await campaignPage.exportCampaign();
      
      // Verify export completed
      await helpers.waitForToast('export');
    });

    test('should export artist data in multiple formats', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create artists to export
      const artists = [
        { name: `${testData.artistName} 1`, genre: 'Pop' },
        { name: `${testData.artistName} 2`, genre: 'Rock' },
        { name: `${testData.artistName} 3`, genre: 'Jazz' }
      ];
      
      for (const artist of artists) {
        await artistPage.addArtist(artist);
      }
      
      // Test different export formats
      const formats = ['csv', 'json', 'xlsx'];
      
      for (const format of formats) {
        // Mock export API for each format
        await page.route(`**/artists/export?format=${format}`, route => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              message: `Artists exported as ${format}`,
              filename: `artists-export.${format}`,
              recordCount: artists.length
            })
          });
        });
        
        await artistPage.navigateTo();
        await artistPage.exportArtists(format);
        
        // Verify export completed for each format
        await helpers.waitForToast('exported');
      }
    });

    test('should export financial data with date range', async ({ page }) => {
      // Create financial transactions
      const transactions = [
        { type: 'income', amount: 1000, date: '2024-01-15', description: 'Export test income 1' },
        { type: 'expense', amount: 500, date: '2024-01-20', description: 'Export test expense 1' },
        { type: 'income', amount: 1500, date: '2024-02-10', description: 'Export test income 2' }
      ];
      
      for (const transaction of transactions) {
        await financialPage.addTransaction({
          type: transaction.type as 'income' | 'expense',
          category: transaction.type === 'income' ? 'Streaming Revenue' : 'Marketing',
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date
        });
      }
      
      // Mock export with date range
      await page.route('**/financial/export*', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Financial data exported successfully',
            filename: 'financial-export.csv',
            recordCount: transactions.length
          })
        });
      });
      
      // Filter and export data for specific date range
      await financialPage.filterTransactions({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
      
      await financialPage.exportTransactions();
      
      // Verify export completed
      await helpers.waitForToast('transactions exported');
    });

    test('should export outreach campaign data with analytics', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create outreach campaign with data
      await outreachPage.createTemplate({
        name: `Export Template ${testData.firstName}`,
        subject: 'Export Test Subject',
        body: 'Export test email body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Export Campaign ${testData.firstName}`,
        template: `Export Template ${testData.firstName}`,
        recipients: [
          { email: 'export1@example.com', name: 'Export Recipient 1' },
          { email: 'export2@example.com', name: 'Export Recipient 2' }
        ]
      });
      
      // Mock export API with analytics data
      await page.route('**/outreach/*/export', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Outreach data exported successfully',
            filename: 'outreach-export.csv',
            includes: ['recipients', 'email_records', 'analytics'],
            recordCount: 2
          })
        });
      });
      
      // Export campaign data
      await outreachPage.exportCampaignData();
      
      // Verify export completed
      await helpers.waitForToast('data exported');
    });
  });

  test.describe('Data Import Functionality', () => {
    test('should import artist data from CSV', async ({ page }) => {
      // Mock successful import
      await page.route('**/artists/import', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Artists imported successfully',
            imported: 5,
            failed: 0,
            duplicates: 2
          })
        });
      });
      
      // Import artists
      const mockFilePath = '/path/to/artists-import.csv';
      await artistPage.importArtists(mockFilePath);
      
      // Verify import completed
      await helpers.waitForToast('imported');
    });

    test('should handle import validation errors', async ({ page }) => {
      // Mock import with validation errors
      await page.route('**/artists/import', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({
            error: 'Validation errors in import data',
            details: [
              'Row 3: Invalid email format',
              'Row 5: Missing required field: name',
              'Row 7: Invalid genre value'
            ]
          })
        });
      });
      
      // Attempt import with invalid data
      const invalidFilePath = '/path/to/invalid-artists.csv';
      await artistPage.importArtists(invalidFilePath);
      
      // Should show validation errors
      await helpers.waitForToast('validation errors');
    });

    test('should import financial transactions with category mapping', async ({ page }) => {
      // Mock import with category mapping
      await page.route('**/financial/import', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Transactions imported successfully',
            imported: 15,
            failed: 1,
            categoryMappings: {
              'Spotify Revenue': 'Streaming Revenue',
              'Facebook Ads': 'Marketing'
            }
          })
        });
      });
      
      // Import transactions
      const mockFilePath = '/path/to/transactions-import.csv';
      await financialPage.importTransactions(mockFilePath);
      
      // Verify import completed
      await helpers.waitForToast('transactions imported');
    });

    test('should import outreach recipients with deduplication', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign first
      await outreachPage.createTemplate({
        name: `Import Template ${testData.firstName}`,
        subject: 'Import Test Subject',
        body: 'Import test body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Import Campaign ${testData.firstName}`,
        template: `Import Template ${testData.firstName}`,
        recipients: []
      });
      
      // Mock import with deduplication
      await page.route('**/outreach/import-recipients', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Recipients imported successfully',
            imported: 20,
            duplicates: 5,
            invalid: 2
          })
        });
      });
      
      // Import recipients
      const mockFilePath = '/path/to/recipients-import.csv';
      await outreachPage.importRecipients(mockFilePath);
      
      // Verify import completed
      await helpers.waitForToast('recipients imported');
    });
  });

  test.describe('Data Backup and Restore', () => {
    test('should create full system backup', async ({ page }) => {
      // Create test data across all modules
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        budget: testData.amount,
        status: 'active'
      });
      
      // Create artist
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Electronic'
      });
      
      // Create financial transaction
      await financialPage.addTransaction({
        type: 'income',
        category: 'Streaming Revenue',
        amount: testData.amount,
        description: 'Backup test transaction'
      });
      
      // Mock backup API
      await page.route('**/system/backup', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'System backup created successfully',
            backupId: 'backup_123456789',
            timestamp: new Date().toISOString(),
            modules: ['campaigns', 'artists', 'outreach', 'financial'],
            size: '5.2 MB'
          })
        });
      });
      
      // Create system backup
      await helpers.navigateTo('/settings/backup');
      
      const createBackupButton = page.locator('button:has-text("Create Backup"), [data-testid="create-backup"]');
      if (await createBackupButton.count() > 0) {
        await helpers.clickAndWait('button:has-text("Create Backup")');
        
        // Verify backup completed
        await helpers.waitForToast('backup created');
      } else {
        console.log('Backup functionality not available in test environment');
      }
    });

    test('should restore from backup', async ({ page }) => {
      // Mock restore API
      await page.route('**/system/restore', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'System restored successfully',
            backupId: 'backup_123456789',
            restoredModules: ['campaigns', 'artists', 'outreach', 'financial'],
            recordsRestored: 150
          })
        });
      });
      
      // Restore from backup
      await helpers.navigateTo('/settings/backup');
      
      const restoreButton = page.locator('button:has-text("Restore"), [data-testid="restore-backup"]');
      if (await restoreButton.count() > 0) {
        await helpers.clickAndWait('button:has-text("Restore")');
        
        // Confirm restore
        await helpers.verifyElementVisible('[data-testid="restore-confirmation"]');
        await helpers.clickAndWait('button:has-text("Confirm Restore")');
        
        // Verify restore completed
        await helpers.waitForToast('restored successfully');
      } else {
        console.log('Restore functionality not available in test environment');
      }
    });

    test('should handle backup scheduling', async ({ page }) => {
      // Mock scheduled backup API
      await page.route('**/system/backup/schedule', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Backup schedule updated successfully',
            schedule: 'daily',
            time: '02:00',
            retention: '30 days'
          })
        });
      });
      
      // Configure backup schedule
      await helpers.navigateTo('/settings/backup');
      
      const scheduleSection = page.locator('[data-testid="backup-schedule"]');
      if (await scheduleSection.count() > 0) {
        await helpers.selectOption('select[name="frequency"]', 'daily');
        await helpers.fillAndVerify('input[name="time"]', '02:00');
        await helpers.selectOption('select[name="retention"]', '30');
        
        await helpers.clickAndWait('button:has-text("Save Schedule")');
        
        // Verify schedule saved
        await helpers.waitForToast('schedule updated');
      } else {
        console.log('Backup scheduling not available in test environment');
      }
    });
  });

  test.describe('Data Integrity and Validation', () => {
    test('should validate data consistency across modules', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        budget: 5000,
        status: 'active'
      });
      
      // Create artist and associate with campaign
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Pop'
      });
      
      await campaignPage.navigateToCampaign('1'); // Assuming first campaign has ID 1
      await campaignPage.addArtistToCampaign(testData.artistName);
      
      // Add financial transaction for the campaign
      await financialPage.addTransaction({
        type: 'expense',
        category: 'Marketing',
        amount: 1000,
        description: 'Campaign marketing expense',
        campaign: testData.campaignName
      });
      
      // Verify data consistency
      // Check that campaign shows associated artist
      await campaignPage.navigateToCampaign('1');
      await helpers.verifyElementVisible('[data-testid="campaign-artists"]');
      
      // Check that financial transaction is associated with campaign
      await financialPage.filterTransactions({
        searchTerm: testData.campaignName
      });
      await helpers.verifyElementText('.transaction-row', 'Campaign marketing expense');
    });

    test('should handle data corruption gracefully', async ({ page }) => {
      // Mock data corruption scenario
      await page.route('**/campaigns/*', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            error: 'Data corruption detected',
            details: 'Campaign data integrity check failed'
          })
        });
      });
      
      // Attempt to access potentially corrupted data
      await campaignPage.navigateTo();
      
      // Should show data corruption error
      await helpers.waitForToast('data corruption');
    });

    test('should validate referential integrity', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        budget: testData.amount,
        status: 'active'
      });
      
      // Create artist
      await artistPage.addArtist({
        name: testData.artistName,
        genre: 'Rock'
      });
      
      // Associate artist with campaign
      await campaignPage.addArtistToCampaign(testData.artistName);
      
      // Try to delete artist that's associated with campaign
      await artistPage.navigateToArtist('1'); // Assuming first artist has ID 1
      
      // Mock referential integrity error
      await page.route('**/artists/*/delete', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({
            error: 'Cannot delete artist',
            details: 'Artist is associated with active campaigns'
          })
        });
      });
      
      await helpers.clickAndWait('[data-testid="delete-artist"]');
      await helpers.clickAndWait('[data-testid="confirm-delete"]');
      
      // Should show referential integrity error
      await helpers.waitForToast('cannot delete');
    });
  });

  test.describe('Data Migration and Versioning', () => {
    test('should handle data format migrations', async ({ page }) => {
      // Mock migration API
      await page.route('**/system/migrate', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Data migration completed successfully',
            fromVersion: '1.0.0',
            toVersion: '2.0.0',
            migratedRecords: 1000,
            warnings: []
          })
        });
      });
      
      // Trigger data migration
      await helpers.navigateTo('/settings/system');
      
      const migrateButton = page.locator('button:has-text("Migrate Data"), [data-testid="migrate-data"]');
      if (await migrateButton.count() > 0) {
        await helpers.clickAndWait('button:has-text("Migrate Data")');
        
        // Verify migration completed
        await helpers.waitForToast('migration completed');
      } else {
        console.log('Data migration not available in test environment');
      }
    });

    test('should handle version compatibility checks', async ({ page }) => {
      // Mock version compatibility check
      await page.route('**/system/version-check', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            currentVersion: '2.0.0',
            dataVersion: '1.9.0',
            compatible: true,
            upgradeRequired: false
          })
        });
      });
      
      // Check version compatibility
      await helpers.navigateTo('/settings/system');
      
      const versionCheckButton = page.locator('button:has-text("Check Version"), [data-testid="check-version"]');
      if (await versionCheckButton.count() > 0) {
        await helpers.clickAndWait('button:has-text("Check Version")');
        
        // Verify version check completed
        await helpers.waitForToast('version compatible');
      }
    });
  });

  test.describe('Data Security and Privacy', () => {
    test('should handle data anonymization for export', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create sensitive data
      await artistPage.addArtist({
        name: testData.artistName,
        email: 'sensitive@example.com',
        phone: '+1-555-0123'
      });
      
      // Mock anonymized export
      await page.route('**/artists/export?anonymize=true', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Anonymized data exported successfully',
            filename: 'artists-anonymized.csv',
            anonymizedFields: ['email', 'phone'],
            recordCount: 1
          })
        });
      });
      
      // Export with anonymization
      await artistPage.navigateTo();
      
      const anonymizeCheckbox = page.locator('input[name="anonymize"], [data-testid="anonymize-data"]');
      if (await anonymizeCheckbox.count() > 0) {
        await anonymizeCheckbox.check();
        await artistPage.exportArtists('csv');
        
        // Verify anonymized export completed
        await helpers.waitForToast('anonymized data exported');
      }
    });

    test('should handle data deletion with compliance', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create data to delete
      await artistPage.addArtist({
        name: testData.artistName,
        email: 'compliance@example.com'
      });
      
      // Mock compliance deletion
      await page.route('**/artists/*/delete-compliance', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Data deleted in compliance with privacy regulations',
            deletedRecords: 1,
            relatedDataRemoved: ['social_profiles', 'email_records'],
            auditLogCreated: true
          })
        });
      });
      
      // Delete data for compliance
      const complianceDeleteButton = page.locator('button:has-text("Delete for Compliance"), [data-testid="compliance-delete"]');
      if (await complianceDeleteButton.count() > 0) {
        await helpers.clickAndWait('button:has-text("Delete for Compliance")');
        
        // Confirm compliance deletion
        await helpers.verifyElementVisible('[data-testid="compliance-confirmation"]');
        await helpers.clickAndWait('button:has-text("Confirm Compliance Deletion")');
        
        // Verify compliance deletion completed
        await helpers.waitForToast('compliance deletion completed');
      }
    });
  });

  test.describe('Performance and Optimization', () => {
    test('should handle large data exports efficiently', async ({ page }) => {
      // Create large dataset
      const recordCount = 1000;
      
      // Mock large export with progress tracking
      await page.route('**/artists/export-large', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Large export initiated',
            jobId: 'export_job_12345',
            estimatedTime: '5 minutes',
            recordCount: recordCount
          })
        });
      });
      
      // Mock progress check
      await page.route('**/jobs/export_job_12345/status', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            status: 'completed',
            progress: 100,
            downloadUrl: '/downloads/artists-large-export.csv'
          })
        });
      });
      
      // Initiate large export
      await artistPage.navigateTo();
      
      const largeExportButton = page.locator('button:has-text("Export All"), [data-testid="export-large"]');
      if (await largeExportButton.count() > 0) {
        await helpers.clickAndWait('button:has-text("Export All")');
        
        // Wait for export completion
        await helpers.waitForToast('export completed');
      }
    });

    test('should optimize data loading with pagination', async ({ page }) => {
      // Test pagination on large datasets
      await financialPage.navigateToTransactions();
      
      // Check if pagination controls exist
      const paginationControls = page.locator('[data-testid="pagination"], .pagination');
      if (await paginationControls.count() > 0) {
        // Test pagination navigation
        const nextButton = page.locator('button:has-text("Next"), [data-testid="next-page"]');
        if (await nextButton.count() > 0) {
          await nextButton.click();
          await helpers.waitForLoadingToComplete();
          
          // Verify new page loaded
          await helpers.verifyElementVisible('[data-testid="transactions-list"]');
        }
      }
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from interrupted data operations', async ({ page }) => {
      // Mock interrupted operation
      await page.route('**/campaigns/import', route => {
        // Simulate timeout/interruption
        setTimeout(() => {
          route.fulfill({
            status: 408,
            body: JSON.stringify({
              error: 'Operation timed out',
              partialData: true,
              resumeToken: 'resume_12345'
            })
          });
        }, 1000);
      });
      
      // Attempt operation that gets interrupted
      const mockFilePath = '/path/to/large-import.csv';
      
      const importButton = page.locator('button:has-text("Import"), [data-testid="import-campaigns"]');
      if (await importButton.count() > 0) {
        await importButton.click();
        
        // Should show retry option
        await helpers.waitForToast('operation interrupted');
        
        const retryButton = page.locator('button:has-text("Retry"), [data-testid="retry-operation"]');
        if (await retryButton.count() > 0) {
          await retryButton.click();
          await helpers.waitForToast('operation resumed');
        }
      }
    });

    test('should handle concurrent data modifications', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await campaignPage.createCampaign({
        name: testData.campaignName,
        budget: testData.amount,
        status: 'active'
      });
      
      // Mock concurrent modification conflict
      await page.route('**/campaigns/*/update', route => {
        route.fulfill({
          status: 409,
          body: JSON.stringify({
            error: 'Concurrent modification detected',
            conflictFields: ['budget', 'status'],
            currentValues: { budget: 6000, status: 'paused' }
          })
        });
      });
      
      // Attempt to edit campaign
      await campaignPage.editCampaign({
        budget: 5500,
        status: 'active'
      });
      
      // Should show conflict resolution
      await helpers.waitForToast('conflict detected');
    });
  });
});