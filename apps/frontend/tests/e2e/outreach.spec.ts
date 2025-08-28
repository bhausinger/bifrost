import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage';
import { OutreachPage } from '../page-objects/OutreachPage';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Email Outreach System Tests', () => {
  let authPage: AuthPage;
  let outreachPage: OutreachPage;
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    outreachPage = new OutreachPage(page);
    helpers = new TestHelpers(page);
    
    // Login before each test
    await authPage.login('benjamin.hausinger@gmail.com', 'TestPassword123!');
    await authPage.verifyLoggedIn();
  });

  test.describe('Email Template Management', () => {
    test('should create email template successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      const templateData = {
        name: `Test Template ${testData.firstName}`,
        subject: `Music Promotion Opportunity - {{artistName}}`,
        body: `Hi {{artistName}},\n\nWe would like to promote your music through our platform. Your style in the {{genre}} genre caught our attention.\n\nBest regards,\n{{promoterName}}`
      };
      
      await outreachPage.createTemplate(templateData);
      
      // Verify template was created
      await outreachPage.verifyOnTemplatesPage();
      await helpers.verifyElementVisible('[data-testid="templates-list"]');
      await helpers.verifyElementText('.template-card', templateData.name);
    });

    test('should validate template required fields', async ({ page }) => {
      await outreachPage.navigateToTemplates();
      await helpers.clickAndWait('button:has-text("Create Template")');
      
      // Try to submit empty form
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show validation errors
      await helpers.waitForToast('name is required');
    });

    test('should insert template variables correctly', async ({ page }) => {
      await outreachPage.navigateToTemplates();
      await helpers.clickAndWait('button:has-text("Create Template")');
      
      const testData = helpers.generateTestData();
      await helpers.fillAndVerify('[data-testid="template-name"]', testData.firstName);
      await helpers.fillAndVerify('[data-testid="template-subject"]', 'Test Subject');
      
      // Insert template variables
      await outreachPage.insertTemplateVariable('artistName');
      await outreachPage.insertTemplateVariable('genre');
      
      // Verify variables were inserted
      const bodyContent = await page.locator('[data-testid="template-body"]').inputValue();
      expect(bodyContent).toContain('{{artistName}}');
      expect(bodyContent).toContain('{{genre}}');
    });

    test('should preview email template', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      await outreachPage.createTemplate({
        name: testData.firstName,
        subject: 'Test Subject - {{artistName}}',
        body: 'Hello {{artistName}}, this is a test template.'
      });
      
      // Preview template
      await outreachPage.previewTemplate();
      
      // Verify preview opens
      await helpers.verifyElementVisible('[data-testid="template-preview"], .template-preview');
    });

    test('should edit existing template', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create template first
      await outreachPage.createTemplate({
        name: testData.firstName,
        subject: 'Original Subject',
        body: 'Original body content'
      });
      
      // Edit template
      await helpers.clickAndWait('[data-testid="edit-template"]');
      await helpers.fillAndVerify('[data-testid="template-subject"]', 'Updated Subject');
      await helpers.fillAndVerify('[data-testid="template-body"]', 'Updated body content');
      await helpers.clickAndWait('[data-testid="save-template"]');
      
      // Verify changes were saved
      await helpers.waitForToast('template updated');
    });
  });

  test.describe('Outreach Campaign Creation', () => {
    test('should create outreach campaign successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create template first
      const templateData = {
        name: `Campaign Template ${testData.firstName}`,
        subject: 'Music Collaboration Opportunity',
        body: 'Hi there! We would like to collaborate with you on music promotion.'
      };
      
      await outreachPage.createTemplate(templateData);
      
      // Create outreach campaign
      const campaignData = {
        name: `Outreach Campaign ${testData.firstName}`,
        description: testData.description,
        template: templateData.name,
        recipients: [
          { email: 'artist1@example.com', name: 'Artist One' },
          { email: 'artist2@example.com', name: 'Artist Two' }
        ]
      };
      
      await outreachPage.createOutreachCampaign(campaignData);
      
      // Verify campaign was created
      await outreachPage.verifyOnCampaignDetails();
      await helpers.verifyElementVisible('[data-testid="outreach-campaign-title"]');
      await helpers.verifyElementText('[data-testid="outreach-campaign-title"]', campaignData.name);
    });

    test('should add recipients to campaign', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create template first
      await outreachPage.createTemplate({
        name: `Recipients Template ${testData.firstName}`,
        subject: 'Test Subject',
        body: 'Test body'
      });
      
      // Create campaign
      await outreachPage.createOutreachCampaign({
        name: `Recipients Campaign ${testData.firstName}`,
        template: `Recipients Template ${testData.firstName}`,
        recipients: []
      });
      
      // Add recipients individually
      await outreachPage.addRecipient('test1@example.com', 'Test Artist 1');
      await outreachPage.addRecipient('test2@example.com', 'Test Artist 2');
      
      // Verify recipients were added
      await helpers.verifyElementVisible('[data-testid="recipients-list"]');
    });

    test('should validate campaign required fields', async ({ page }) => {
      await outreachPage.navigateTo();
      await helpers.clickAndWait('button:has-text("Create Campaign")');
      
      // Try to submit empty form
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show validation errors
      await helpers.waitForToast('name is required');
    });

    test('should schedule campaign for later', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create template first
      await outreachPage.createTemplate({
        name: `Scheduled Template ${testData.firstName}`,
        subject: 'Scheduled Email',
        body: 'This email is scheduled for later.'
      });
      
      // Create scheduled campaign
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      await outreachPage.createOutreachCampaign({
        name: `Scheduled Campaign ${testData.firstName}`,
        template: `Scheduled Template ${testData.firstName}`,
        recipients: [{ email: 'scheduled@example.com', name: 'Scheduled Artist' }],
        scheduleDate: futureDate.toISOString().split('T')[0]
      });
      
      // Verify campaign was scheduled
      await helpers.verifyElementVisible('[data-testid="outreach-campaign-status"]');
      await helpers.verifyElementText('[data-testid="outreach-campaign-status"]', 'Scheduled');
    });
  });

  test.describe('Gmail Integration', () => {
    test('should connect Gmail account', async ({ page }) => {
      // Mock OAuth flow
      await page.route('**/auth/gmail**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ access_token: 'mock-token', refresh_token: 'mock-refresh' })
        });
      });
      
      await outreachPage.navigateTo();
      
      // Attempt to connect Gmail
      const gmailConnectButton = page.locator('[data-testid="connect-gmail"]');
      if (await gmailConnectButton.count() > 0) {
        await outreachPage.connectGmail();
        
        // Verify connection status
        await helpers.verifyElementVisible('[data-testid="gmail-status"]');
        await helpers.verifyElementText('[data-testid="gmail-status"]', 'Connected');
      } else {
        console.log('Gmail integration not available in test environment');
      }
    });

    test('should handle Gmail connection errors', async ({ page }) => {
      // Mock OAuth error
      await page.route('**/auth/gmail**', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'invalid_request' })
        });
      });
      
      await outreachPage.navigateTo();
      
      const gmailConnectButton = page.locator('[data-testid="connect-gmail"]');
      if (await gmailConnectButton.count() > 0) {
        await helpers.clickAndWait('[data-testid="connect-gmail"]');
        
        // Should show error message
        await helpers.waitForToast('gmail connection failed');
      }
    });

    test('should refresh Gmail token', async ({ page }) => {
      // Mock successful token refresh
      await page.route('**/auth/gmail/refresh', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ access_token: 'new-mock-token' })
        });
      });
      
      await outreachPage.navigateTo();
      
      const refreshButton = page.locator('[data-testid="refresh-gmail-token"]');
      if (await refreshButton.count() > 0) {
        await helpers.clickAndWait('[data-testid="refresh-gmail-token"]');
        
        // Verify token was refreshed
        await helpers.waitForToast('token refreshed');
      }
    });
  });

  test.describe('Email Sending and Testing', () => {
    test('should send test email successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create template and campaign
      await outreachPage.createTemplate({
        name: `Test Email Template ${testData.firstName}`,
        subject: 'Test Email Subject',
        body: 'This is a test email body.'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Test Email Campaign ${testData.firstName}`,
        template: `Test Email Template ${testData.firstName}`,
        recipients: [{ email: 'test@example.com', name: 'Test Recipient' }]
      });
      
      // Mock email sending API
      await page.route('**/outreach/send-test', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Test email sent successfully' })
        });
      });
      
      // Send test email
      await outreachPage.sendTestEmail('test-recipient@example.com');
      
      // Verify test email was sent
      await helpers.waitForToast('test email sent');
    });

    test('should launch outreach campaign', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create template and campaign
      await outreachPage.createTemplate({
        name: `Launch Template ${testData.firstName}`,
        subject: 'Launch Test Subject',
        body: 'Launch test body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Launch Campaign ${testData.firstName}`,
        template: `Launch Template ${testData.firstName}`,
        recipients: [{ email: 'launch@example.com', name: 'Launch Recipient' }]
      });
      
      // Mock campaign launch API
      await page.route('**/outreach/*/launch', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Campaign launched successfully' })
        });
      });
      
      // Launch campaign
      await outreachPage.launchCampaign();
      
      // Verify campaign was launched
      await helpers.waitForToast('campaign launched');
      await helpers.verifyElementText('[data-testid="outreach-campaign-status"]', 'Active');
    });

    test('should pause and resume campaign', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create and launch campaign first
      await outreachPage.createTemplate({
        name: `Pause Resume Template ${testData.firstName}`,
        subject: 'Pause Resume Subject',
        body: 'Pause resume body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Pause Resume Campaign ${testData.firstName}`,
        template: `Pause Resume Template ${testData.firstName}`,
        recipients: [{ email: 'pauseresume@example.com', name: 'Pause Resume Recipient' }]
      });
      
      // Mock APIs
      await page.route('**/outreach/*/launch', route => {
        route.fulfill({ status: 200, body: JSON.stringify({ message: 'Launched' }) });
      });
      await page.route('**/outreach/*/pause', route => {
        route.fulfill({ status: 200, body: JSON.stringify({ message: 'Paused' }) });
      });
      await page.route('**/outreach/*/resume', route => {
        route.fulfill({ status: 200, body: JSON.stringify({ message: 'Resumed' }) });
      });
      
      await outreachPage.launchCampaign();
      
      // Pause campaign
      await outreachPage.pauseCampaign();
      await helpers.verifyElementText('[data-testid="outreach-campaign-status"]', 'Paused');
      
      // Resume campaign
      await outreachPage.resumeCampaign();
      await helpers.verifyElementText('[data-testid="outreach-campaign-status"]', 'Active');
    });
  });

  test.describe('Email Records and Tracking', () => {
    test('should view email records', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign first
      await outreachPage.createTemplate({
        name: `Records Template ${testData.firstName}`,
        subject: 'Records Subject',
        body: 'Records body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Records Campaign ${testData.firstName}`,
        template: `Records Template ${testData.firstName}`,
        recipients: [{ email: 'records@example.com', name: 'Records Recipient' }]
      });
      
      // View email records
      await outreachPage.viewEmailRecords();
      
      // Verify email records are displayed
      await helpers.verifyElementVisible('[data-testid="email-records-list"]');
    });

    test('should resend failed email', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign and launch
      await outreachPage.createTemplate({
        name: `Resend Template ${testData.firstName}`,
        subject: 'Resend Subject',
        body: 'Resend body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Resend Campaign ${testData.firstName}`,
        template: `Resend Template ${testData.firstName}`,
        recipients: [{ email: 'resend@example.com', name: 'Resend Recipient' }]
      });
      
      // Mock resend API
      await page.route('**/outreach/resend', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Email resent successfully' })
        });
      });
      
      // Resend email
      await outreachPage.resendEmail('resend@example.com');
      
      // Verify email was resent
      await helpers.waitForToast('email resent');
    });

    test('should display campaign statistics', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await outreachPage.createTemplate({
        name: `Stats Template ${testData.firstName}`,
        subject: 'Stats Subject',
        body: 'Stats body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Stats Campaign ${testData.firstName}`,
        template: `Stats Template ${testData.firstName}`,
        recipients: [
          { email: 'stats1@example.com', name: 'Stats Recipient 1' },
          { email: 'stats2@example.com', name: 'Stats Recipient 2' }
        ]
      });
      
      // Mock campaign stats
      await page.route('**/outreach/*/stats', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            sent: 2,
            opened: 1,
            replies: 0,
            openRate: 50,
            replyRate: 0
          })
        });
      });
      
      // Verify campaign statistics
      await outreachPage.verifyCampaignStats();
    });
  });

  test.describe('Search and Filtering', () => {
    test('should search outreach campaigns', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign to search for
      await outreachPage.createTemplate({
        name: `Search Template ${testData.firstName}`,
        subject: 'Search Subject',
        body: 'Search body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Search Campaign ${testData.firstName}`,
        template: `Search Template ${testData.firstName}`,
        recipients: [{ email: 'search@example.com', name: 'Search Recipient' }]
      });
      
      // Search campaigns
      await outreachPage.navigateTo();
      await outreachPage.searchCampaigns(`Search Campaign ${testData.firstName}`);
      
      // Verify search results
      await helpers.verifyElementVisible('[data-testid="outreach-campaigns-list"]');
      await helpers.verifyElementText('.outreach-campaign-card', `Search Campaign ${testData.firstName}`);
    });

    test('should filter campaigns by status', async ({ page }) => {
      // Create campaigns with different statuses
      const testData1 = helpers.generateTestData();
      const testData2 = helpers.generateTestData();
      
      // Create templates
      await outreachPage.createTemplate({
        name: `Filter Template 1 ${testData1.firstName}`,
        subject: 'Filter Subject 1',
        body: 'Filter body 1'
      });
      
      await outreachPage.createTemplate({
        name: `Filter Template 2 ${testData2.firstName}`,
        subject: 'Filter Subject 2',
        body: 'Filter body 2'
      });
      
      // Create campaigns
      await outreachPage.createOutreachCampaign({
        name: `Active Campaign ${testData1.firstName}`,
        template: `Filter Template 1 ${testData1.firstName}`,
        recipients: [{ email: 'active@example.com', name: 'Active Recipient' }]
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Draft Campaign ${testData2.firstName}`,
        template: `Filter Template 2 ${testData2.firstName}`,
        recipients: [{ email: 'draft@example.com', name: 'Draft Recipient' }]
      });
      
      // Filter by status
      await outreachPage.navigateTo();
      await outreachPage.filterByStatus('Draft');
      
      // Verify filtered results
      await helpers.verifyElementVisible('[data-testid="outreach-campaigns-list"]');
    });
  });

  test.describe('Import and Export', () => {
    test('should import recipients from file', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign first
      await outreachPage.createTemplate({
        name: `Import Template ${testData.firstName}`,
        subject: 'Import Subject',
        body: 'Import body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Import Campaign ${testData.firstName}`,
        template: `Import Template ${testData.firstName}`,
        recipients: []
      });
      
      // Mock file import
      await page.route('**/outreach/import-recipients', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Recipients imported successfully', count: 5 })
        });
      });
      
      // Import recipients
      const mockFilePath = '/path/to/recipients.csv';
      await outreachPage.importRecipients(mockFilePath);
      
      // Verify import completed
      await helpers.waitForToast('recipients imported');
    });

    test('should export campaign data', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await outreachPage.createTemplate({
        name: `Export Template ${testData.firstName}`,
        subject: 'Export Subject',
        body: 'Export body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Export Campaign ${testData.firstName}`,
        template: `Export Template ${testData.firstName}`,
        recipients: [{ email: 'export@example.com', name: 'Export Recipient' }]
      });
      
      // Mock export API
      await page.route('**/outreach/*/export', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Data exported successfully' })
        });
      });
      
      // Export campaign data
      await outreachPage.exportCampaignData();
      
      // Verify export completed
      await helpers.waitForToast('data exported');
    });
  });

  test.describe('Analytics and Reporting', () => {
    test('should display outreach analytics', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign with data
      await outreachPage.createTemplate({
        name: `Analytics Template ${testData.firstName}`,
        subject: 'Analytics Subject',
        body: 'Analytics body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Analytics Campaign ${testData.firstName}`,
        template: `Analytics Template ${testData.firstName}`,
        recipients: [
          { email: 'analytics1@example.com', name: 'Analytics Recipient 1' },
          { email: 'analytics2@example.com', name: 'Analytics Recipient 2' }
        ]
      });
      
      // Mock analytics data
      await page.route('**/outreach/*/analytics', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            performance: { sent: 2, opened: 1, clicked: 0 },
            engagement: { openRate: 50, clickRate: 0 },
            timeline: [
              { date: '2024-01-01', sent: 1, opened: 1 },
              { date: '2024-01-02', sent: 1, opened: 0 }
            ]
          })
        });
      });
      
      // Verify analytics are displayed
      await outreachPage.verifyAnalyticsDisplayed();
    });

    test('should get campaign statistics', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await outreachPage.createTemplate({
        name: `Stats Template ${testData.firstName}`,
        subject: 'Stats Subject',
        body: 'Stats body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Stats Campaign ${testData.firstName}`,
        template: `Stats Template ${testData.firstName}`,
        recipients: [{ email: 'stats@example.com', name: 'Stats Recipient' }]
      });
      
      // Get campaign statistics
      const stats = await outreachPage.getCampaignStats();
      
      // Verify stats structure
      expect(typeof stats.sent).toBe('number');
      expect(typeof stats.opened).toBe('number');
      expect(typeof stats.replies).toBe('number');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle email sending errors', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await outreachPage.createTemplate({
        name: `Error Template ${testData.firstName}`,
        subject: 'Error Subject',
        body: 'Error body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Error Campaign ${testData.firstName}`,
        template: `Error Template ${testData.firstName}`,
        recipients: [{ email: 'error@example.com', name: 'Error Recipient' }]
      });
      
      // Mock email sending error
      await page.route('**/outreach/send-test', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Email service unavailable' })
        });
      });
      
      // Try to send test email
      await outreachPage.sendTestEmail('error@example.com');
      
      // Should show error message
      await helpers.waitForToast('email service error');
    });

    test('should handle invalid email addresses', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create campaign
      await outreachPage.createTemplate({
        name: `Invalid Email Template ${testData.firstName}`,
        subject: 'Invalid Email Subject',
        body: 'Invalid email body'
      });
      
      await outreachPage.createOutreachCampaign({
        name: `Invalid Email Campaign ${testData.firstName}`,
        template: `Invalid Email Template ${testData.firstName}`,
        recipients: []
      });
      
      // Try to add invalid email
      await helpers.clickAndWait('[data-testid="add-recipient"]');
      await helpers.fillAndVerify('[data-testid="recipient-email"]', 'invalid-email');
      await helpers.clickAndWait('[data-testid="add-recipient-confirm"]');
      
      // Should show validation error
      await helpers.waitForToast('invalid email');
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/outreach**', route => {
        route.abort('failed');
      });
      
      await outreachPage.navigateTo();
      
      // Should show network error message
      await helpers.waitForToast('network error');
    });
  });

  test.describe('Complete Outreach Workflow', () => {
    test('should complete full outreach workflow', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      const workflowData = {
        template: {
          name: `Workflow Template ${testData.firstName}`,
          subject: 'Complete Workflow - {{artistName}}',
          body: 'Hi {{artistName}}, this is a complete workflow test email for {{genre}} music promotion.'
        },
        campaign: {
          name: `Workflow Campaign ${testData.firstName}`,
          description: 'Complete workflow test campaign',
          recipients: [
            { email: 'workflow1@example.com', name: 'Workflow Artist 1' },
            { email: 'workflow2@example.com', name: 'Workflow Artist 2' }
          ]
        },
        testEmail: 'workflow-test@example.com'
      };
      
      // Mock all necessary APIs
      await page.route('**/outreach/send-test', route => {
        route.fulfill({ status: 200, body: JSON.stringify({ message: 'Test email sent' }) });
      });
      await page.route('**/outreach/*/launch', route => {
        route.fulfill({ status: 200, body: JSON.stringify({ message: 'Campaign launched' }) });
      });
      await page.route('**/outreach/*/analytics', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            performance: { sent: 2, opened: 1 },
            engagement: { openRate: 50 },
            timeline: []
          })
        });
      });
      
      // Execute complete workflow
      await outreachPage.testOutreachWorkflow(workflowData);
      
      // Verify workflow completed successfully
      await helpers.verifyElementVisible('[data-testid="outreach-analytics"]');
    });
  });
});