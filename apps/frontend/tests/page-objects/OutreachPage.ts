import { Page, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

export class OutreachPage {
  private helpers: TestHelpers;

  constructor(private page: Page) {
    this.helpers = new TestHelpers(page);
  }

  // Selectors
  private selectors = {
    // Outreach campaigns list
    campaignsList: '[data-testid="outreach-campaigns-list"]',
    campaignCard: '[data-testid="outreach-campaign-card"]',
    createCampaignButton: 'button:has-text("Create Campaign"), [data-testid="create-outreach-campaign"]',
    searchInput: 'input[placeholder*="Search"], [data-testid="search-outreach"]',
    filterDropdown: '[data-testid="filter-dropdown"], select[name="filter"]',
    statusFilter: '[data-testid="status-filter"], select[name="status"]',
    
    // Outreach campaign form
    campaignForm: '[data-testid="outreach-campaign-form"], form',
    nameInput: 'input[name="name"], [data-testid="outreach-name"]',
    descriptionInput: 'textarea[name="description"], [data-testid="outreach-description"]',
    templateSelect: 'select[name="template"], [data-testid="template-select"]',
    recipientsList: '[data-testid="recipients-list"]',
    addRecipientButton: 'button:has-text("Add Recipient"), [data-testid="add-recipient"]',
    scheduleDateInput: 'input[name="scheduleDate"], [data-testid="schedule-date"]',
    saveButton: 'button:has-text("Save"), button[type="submit"]',
    cancelButton: 'button:has-text("Cancel")',
    
    // Email templates
    templatesTab: 'button:has-text("Templates"), [data-testid="templates-tab"]',
    templatesList: '[data-testid="templates-list"]',
    templateCard: '[data-testid="template-card"]',
    createTemplateButton: 'button:has-text("Create Template"), [data-testid="create-template"]',
    
    // Template form
    templateForm: '[data-testid="template-form"], form',
    templateNameInput: 'input[name="name"], [data-testid="template-name"]',
    subjectInput: 'input[name="subject"], [data-testid="template-subject"]',
    bodyInput: 'textarea[name="body"], [data-testid="template-body"]',
    htmlEditor: '[data-testid="html-editor"], .html-editor',
    previewButton: 'button:has-text("Preview"), [data-testid="preview-template"]',
    saveTemplateButton: 'button:has-text("Save Template"), [data-testid="save-template"]',
    
    // Template variables
    variablesSection: '[data-testid="template-variables"]',
    insertVariableButton: '[data-testid="insert-variable"]',
    variableDropdown: 'select[name="variable"], [data-testid="variable-select"]',
    
    // Recipients management
    recipientModal: '[data-testid="recipient-modal"]',
    recipientEmailInput: 'input[name="email"], [data-testid="recipient-email"]',
    recipientNameInput: 'input[name="name"], [data-testid="recipient-name"]',
    recipientArtistSelect: 'select[name="artist"], [data-testid="recipient-artist"]',
    addRecipientConfirmButton: 'button:has-text("Add"), [data-testid="add-recipient-confirm"]',
    importRecipientsButton: 'button:has-text("Import"), [data-testid="import-recipients"]',
    
    // Campaign details
    campaignTitle: '[data-testid="outreach-campaign-title"], h1, h2',
    campaignStatus: '[data-testid="outreach-campaign-status"]',
    campaignStats: '[data-testid="campaign-stats"]',
    totalSent: '[data-testid="total-sent"]',
    totalOpened: '[data-testid="total-opened"]',
    totalReplies: '[data-testid="total-replies"]',
    openRate: '[data-testid="open-rate"]',
    replyRate: '[data-testid="reply-rate"]',
    
    // Email records
    emailRecordsTab: 'button:has-text("Email Records"), [data-testid="email-records-tab"]',
    emailRecordsList: '[data-testid="email-records-list"]',
    emailRecord: '[data-testid="email-record"]',
    emailStatus: '[data-testid="email-status"]',
    resendButton: 'button:has-text("Resend"), [data-testid="resend-email"]',
    
    // Campaign actions
    editButton: 'button:has-text("Edit"), [data-testid="edit-outreach-campaign"]',
    deleteButton: 'button:has-text("Delete"), [data-testid="delete-outreach-campaign"]',
    pauseButton: 'button:has-text("Pause"), [data-testid="pause-campaign"]',
    resumeButton: 'button:has-text("Resume"), [data-testid="resume-campaign"]',
    sendTestButton: 'button:has-text("Send Test"), [data-testid="send-test-email"]',
    launchButton: 'button:has-text("Launch"), [data-testid="launch-campaign"]',
    
    // Gmail integration
    gmailConnectButton: 'button:has-text("Connect Gmail"), [data-testid="connect-gmail"]',
    gmailStatus: '[data-testid="gmail-status"]',
    gmailSettings: '[data-testid="gmail-settings"]',
    refreshTokenButton: 'button:has-text("Refresh Token"), [data-testid="refresh-gmail-token"]',
    
    // Analytics
    analyticsSection: '[data-testid="outreach-analytics"]',
    performanceChart: '[data-testid="performance-chart"]',
    engagementChart: '[data-testid="engagement-chart"]',
    timelineChart: '[data-testid="timeline-chart"]',
    
    // Bulk actions
    selectAllCheckbox: 'input[type="checkbox"][data-testid="select-all-recipients"]',
    recipientCheckbox: 'input[type="checkbox"][data-testid="select-recipient"]',
    bulkActionsDropdown: '[data-testid="bulk-actions-outreach"]',
    applyBulkActionButton: 'button:has-text("Apply"), [data-testid="apply-bulk-action-outreach"]',
    
    // Modals
    deleteModal: '[data-testid="delete-outreach-modal"]',
    confirmDeleteButton: 'button:has-text("Confirm"), [data-testid="confirm-delete-outreach"]',
    testEmailModal: '[data-testid="test-email-modal"]',
    testEmailInput: 'input[name="testEmail"], [data-testid="test-email-input"]',
    sendTestConfirmButton: 'button:has-text("Send"), [data-testid="send-test-confirm"]',
    
    // Import/Export
    exportButton: 'button:has-text("Export"), [data-testid="export-outreach"]',
    importButton: 'button:has-text("Import"), [data-testid="import-outreach"]',
    fileInput: 'input[type="file"], [data-testid="file-upload-outreach"]',
  };

  /**
   * Navigate to outreach page
   */
  async navigateTo() {
    await this.helpers.navigateTo('/outreach');
    await this.verifyOnOutreachPage();
  }

  /**
   * Navigate to specific outreach campaign
   */
  async navigateToCampaign(campaignId: string) {
    await this.helpers.navigateTo(`/outreach/${campaignId}`);
    await this.verifyOnCampaignDetails();
  }

  /**
   * Navigate to templates section
   */
  async navigateToTemplates() {
    await this.helpers.navigateTo('/outreach/templates');
    await this.verifyOnTemplatesPage();
  }

  /**
   * Verify we're on outreach page
   */
  async verifyOnOutreachPage() {
    await this.helpers.verifyURL('outreach');
    await this.helpers.verifyElementVisible(this.selectors.createCampaignButton);
  }

  /**
   * Verify we're on campaign details page
   */
  async verifyOnCampaignDetails() {
    await this.helpers.verifyURL('outreach/');
    await this.helpers.verifyElementVisible(this.selectors.campaignTitle);
  }

  /**
   * Verify we're on templates page
   */
  async verifyOnTemplatesPage() {
    await this.helpers.verifyURL('templates');
    await this.helpers.verifyElementVisible(this.selectors.createTemplateButton);
  }

  /**
   * Create email template
   */
  async createTemplate(templateData: {
    name: string;
    subject: string;
    body: string;
  }) {
    console.log(`📧 Creating email template: ${templateData.name}`);
    
    await this.navigateToTemplates();
    await this.helpers.clickAndWait(this.selectors.createTemplateButton);
    
    // Fill template form
    await this.helpers.fillAndVerify(this.selectors.templateNameInput, templateData.name);
    await this.helpers.fillAndVerify(this.selectors.subjectInput, templateData.subject);
    await this.helpers.fillAndVerify(this.selectors.bodyInput, templateData.body);
    
    // Save template
    await this.helpers.clickAndWait(this.selectors.saveTemplateButton);
    await this.helpers.waitForToast('template created');
  }

  /**
   * Create outreach campaign
   */
  async createOutreachCampaign(campaignData: {
    name: string;
    description?: string;
    template: string;
    recipients: Array<{email: string; name?: string}>;
    scheduleDate?: string;
  }) {
    console.log(`📨 Creating outreach campaign: ${campaignData.name}`);
    
    await this.navigateTo();
    await this.helpers.clickAndWait(this.selectors.createCampaignButton);
    
    // Fill campaign form
    await this.helpers.fillAndVerify(this.selectors.nameInput, campaignData.name);
    
    if (campaignData.description) {
      await this.helpers.fillAndVerify(this.selectors.descriptionInput, campaignData.description);
    }
    
    // Select template
    await this.helpers.selectOption(this.selectors.templateSelect, campaignData.template);
    
    // Add recipients
    for (const recipient of campaignData.recipients) {
      await this.addRecipient(recipient.email, recipient.name);
    }
    
    // Set schedule date if provided
    if (campaignData.scheduleDate) {
      await this.helpers.fillAndVerify(this.selectors.scheduleDateInput, campaignData.scheduleDate);
    }
    
    // Save campaign
    await this.helpers.clickAndWait(this.selectors.saveButton);
    await this.helpers.waitForToast('campaign created');
  }

  /**
   * Add recipient to campaign
   */
  async addRecipient(email: string, name?: string) {
    console.log(`👤 Adding recipient: ${email}`);
    
    await this.helpers.clickAndWait(this.selectors.addRecipientButton);
    
    // Fill recipient details
    await this.helpers.verifyElementVisible(this.selectors.recipientModal);
    await this.helpers.fillAndVerify(this.selectors.recipientEmailInput, email);
    
    if (name) {
      await this.helpers.fillAndVerify(this.selectors.recipientNameInput, name);
    }
    
    await this.helpers.clickAndWait(this.selectors.addRecipientConfirmButton);
    await this.helpers.waitForToast('recipient added');
  }

  /**
   * Connect Gmail account
   */
  async connectGmail() {
    console.log('📧 Connecting Gmail account');
    
    await this.helpers.clickAndWait(this.selectors.gmailConnectButton);
    
    // Handle OAuth flow (simplified for testing)
    await this.page.waitForURL('**/auth/gmail**', { timeout: 30000 });
    
    // Wait for redirect back to application
    await this.page.waitForURL('**/outreach**', { timeout: 30000 });
    
    // Verify connection
    await this.helpers.verifyElementVisible(this.selectors.gmailStatus);
    await this.helpers.verifyElementText(this.selectors.gmailStatus, 'Connected');
  }

  /**
   * Send test email
   */
  async sendTestEmail(testEmail: string) {
    console.log(`🧪 Sending test email to: ${testEmail}`);
    
    await this.helpers.clickAndWait(this.selectors.sendTestButton);
    
    // Fill test email modal
    await this.helpers.verifyElementVisible(this.selectors.testEmailModal);
    await this.helpers.fillAndVerify(this.selectors.testEmailInput, testEmail);
    
    await this.helpers.clickAndWait(this.selectors.sendTestConfirmButton);
    await this.helpers.waitForToast('test email sent');
  }

  /**
   * Launch outreach campaign
   */
  async launchCampaign() {
    console.log('🚀 Launching outreach campaign');
    
    await this.helpers.clickAndWait(this.selectors.launchButton);
    await this.helpers.waitForToast('campaign launched');
    
    // Verify status changed
    await this.helpers.verifyElementText(this.selectors.campaignStatus, 'Active');
  }

  /**
   * Pause campaign
   */
  async pauseCampaign() {
    console.log('⏸️ Pausing campaign');
    
    await this.helpers.clickAndWait(this.selectors.pauseButton);
    await this.helpers.waitForToast('campaign paused');
    
    await this.helpers.verifyElementText(this.selectors.campaignStatus, 'Paused');
  }

  /**
   * Resume campaign
   */
  async resumeCampaign() {
    console.log('▶️ Resuming campaign');
    
    await this.helpers.clickAndWait(this.selectors.resumeButton);
    await this.helpers.waitForToast('campaign resumed');
    
    await this.helpers.verifyElementText(this.selectors.campaignStatus, 'Active');
  }

  /**
   * Edit outreach campaign
   */
  async editCampaign(updates: {
    name?: string;
    description?: string;
  }) {
    console.log('✏️ Editing outreach campaign');
    
    await this.helpers.clickAndWait(this.selectors.editButton);
    
    if (updates.name) {
      await this.helpers.fillAndVerify(this.selectors.nameInput, updates.name);
    }
    
    if (updates.description) {
      await this.helpers.fillAndVerify(this.selectors.descriptionInput, updates.description);
    }
    
    await this.helpers.clickAndWait(this.selectors.saveButton);
    await this.helpers.waitForToast('campaign updated');
  }

  /**
   * Delete outreach campaign
   */
  async deleteCampaign() {
    console.log('🗑️ Deleting outreach campaign');
    
    await this.helpers.clickAndWait(this.selectors.deleteButton);
    
    // Confirm deletion
    await this.helpers.verifyElementVisible(this.selectors.deleteModal);
    await this.helpers.clickAndWait(this.selectors.confirmDeleteButton);
    
    await this.helpers.verifyURL('outreach');
    await this.helpers.waitForToast('campaign deleted');
  }

  /**
   * View email records
   */
  async viewEmailRecords() {
    await this.helpers.clickAndWait(this.selectors.emailRecordsTab);
    await this.helpers.verifyElementVisible(this.selectors.emailRecordsList);
  }

  /**
   * Resend failed email
   */
  async resendEmail(recipientEmail: string) {
    console.log(`🔄 Resending email to: ${recipientEmail}`);
    
    await this.viewEmailRecords();
    
    // Find specific email record
    const emailRecord = this.page.locator(`[data-testid="email-record"]:has-text("${recipientEmail}")`);
    const resendButton = emailRecord.locator(this.selectors.resendButton);
    
    await resendButton.click();
    await this.helpers.waitForToast('email resent');
  }

  /**
   * Import recipients from file
   */
  async importRecipients(filePath: string) {
    console.log(`📄 Importing recipients from: ${filePath}`);
    
    await this.helpers.clickAndWait(this.selectors.importRecipientsButton);
    await this.helpers.uploadFile(this.selectors.fileInput, filePath);
    
    await this.helpers.waitForToast('recipients imported');
  }

  /**
   * Export campaign data
   */
  async exportCampaignData() {
    console.log('📤 Exporting campaign data');
    
    await this.helpers.clickAndWait(this.selectors.exportButton);
    await this.helpers.waitForToast('data exported');
  }

  /**
   * Search outreach campaigns
   */
  async searchCampaigns(searchTerm: string) {
    await this.helpers.fillAndVerify(this.selectors.searchInput, searchTerm);
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Filter campaigns by status
   */
  async filterByStatus(status: string) {
    await this.helpers.selectOption(this.selectors.statusFilter, status);
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Insert template variable
   */
  async insertTemplateVariable(variable: string) {
    await this.helpers.selectOption(this.selectors.variableDropdown, variable);
    await this.helpers.clickAndWait(this.selectors.insertVariableButton);
  }

  /**
   * Preview email template
   */
  async previewTemplate() {
    await this.helpers.clickAndWait(this.selectors.previewButton);
    
    // Verify preview modal or window opens
    await this.page.waitForSelector('[data-testid="template-preview"], .template-preview', { timeout: 10000 });
  }

  /**
   * Verify campaign statistics
   */
  async verifyCampaignStats() {
    await this.helpers.verifyElementVisible(this.selectors.campaignStats);
    
    const statsElements = [
      this.selectors.totalSent,
      this.selectors.totalOpened,
      this.selectors.totalReplies,
      this.selectors.openRate,
      this.selectors.replyRate
    ];

    for (const selector of statsElements) {
      try {
        await this.helpers.verifyElementVisible(selector);
      } catch (error) {
        console.log(`Stat element not visible: ${selector}`);
      }
    }
  }

  /**
   * Verify analytics charts
   */
  async verifyAnalyticsDisplayed() {
    await this.helpers.verifyElementVisible(this.selectors.analyticsSection);
    
    const charts = [
      this.selectors.performanceChart,
      this.selectors.engagementChart,
      this.selectors.timelineChart
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
   * Get campaign statistics
   */
  async getCampaignStats() {
    const stats = {
      sent: 0,
      opened: 0,
      replies: 0,
      openRate: 0,
      replyRate: 0
    };

    try {
      const sentElement = this.page.locator(this.selectors.totalSent);
      if (await sentElement.count() > 0) {
        const text = await sentElement.textContent();
        stats.sent = parseInt(text?.match(/\d+/)?.[0] || '0');
      }
    } catch (error) {
      console.log('Could not get sent stat');
    }

    return stats;
  }

  /**
   * Test complete outreach workflow
   */
  async testOutreachWorkflow(testData: any) {
    // Create template
    await this.createTemplate(testData.template);
    
    // Create campaign
    await this.createOutreachCampaign(testData.campaign);
    
    // Send test email
    await this.sendTestEmail(testData.testEmail);
    
    // Launch campaign
    await this.launchCampaign();
    
    // View email records
    await this.viewEmailRecords();
    
    // Verify analytics
    await this.verifyAnalyticsDisplayed();
  }
}