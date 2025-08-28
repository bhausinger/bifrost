import { Page, expect } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for a specific element to be visible and ready
   */
  async waitForElement(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingToComplete() {
    // Wait for any loading spinners to disappear
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { 
      state: 'hidden', 
      timeout: 15000 
    }).catch(() => {
      // Ignore if no loading spinner is found
    });
    
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill form field and verify it was filled
   */
  async fillAndVerify(selector: string, value: string) {
    await this.page.fill(selector, value);
    await expect(this.page.locator(selector)).toHaveValue(value);
  }

  /**
   * Click button and wait for action to complete
   */
  async clickAndWait(selector: string, waitForSelector?: string) {
    await this.page.click(selector);
    
    if (waitForSelector) {
      await this.waitForElement(waitForSelector);
    } else {
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Upload file to input
   */
  async uploadFile(selector: string, filePath: string) {
    await this.page.setInputFiles(selector, filePath);
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, value: string) {
    await this.page.selectOption(selector, value);
  }

  /**
   * Wait for toast notification and verify message
   */
  async waitForToast(expectedMessage?: string) {
    const toast = this.page.locator('[data-testid="toast"], .toast, [role="alert"]').first();
    await toast.waitFor({ state: 'visible', timeout: 10000 });
    
    if (expectedMessage) {
      await expect(toast).toContainText(expectedMessage);
    }
    
    return toast;
  }

  /**
   * Dismiss any open modals
   */
  async dismissModals() {
    const modal = this.page.locator('[data-testid="modal"], .modal, [role="dialog"]');
    
    while (await modal.count() > 0) {
      // Try to close via close button
      const closeButton = modal.locator('[data-testid="close-button"], .close, button[aria-label="Close"]');
      if (await closeButton.count() > 0) {
        await closeButton.first().click();
      } else {
        // Try to close via escape key
        await this.page.keyboard.press('Escape');
      }
      
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Navigate to a specific page and wait for it to load
   */
  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify page title
   */
  async verifyPageTitle(expectedTitle: string) {
    await expect(this.page).toHaveTitle(new RegExp(expectedTitle, 'i'));
  }

  /**
   * Verify URL contains path
   */
  async verifyURL(expectedPath: string) {
    await expect(this.page).toHaveURL(new RegExp(expectedPath));
  }

  /**
   * Take screenshot with custom name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for specific time (use sparingly)
   */
  async wait(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Verify element is visible
   */
  async verifyElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * Verify element contains text
   */
  async verifyElementText(selector: string, expectedText: string) {
    await expect(this.page.locator(selector)).toContainText(expectedText);
  }

  /**
   * Verify element has specific class
   */
  async verifyElementClass(selector: string, className: string) {
    await expect(this.page.locator(selector)).toHaveClass(new RegExp(className));
  }

  /**
   * Generate random test data
   */
  generateTestData() {
    const timestamp = Date.now();
    return {
      email: `test+${timestamp}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      campaignName: `Test Campaign ${timestamp}`,
      artistName: `Test Artist ${timestamp}`,
      description: `Test description created at ${new Date().toISOString()}`,
      amount: Math.floor(Math.random() * 1000) + 100,
    };
  }

  /**
   * Clear all form inputs on page
   */
  async clearAllInputs() {
    const inputs = this.page.locator('input[type="text"], input[type="email"], textarea');
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).clear();
    }
  }

  /**
   * Verify table contains data
   */
  async verifyTableHasData(tableSelector: string) {
    const table = this.page.locator(tableSelector);
    await expect(table).toBeVisible();
    
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  }

  /**
   * Count table rows
   */
  async getTableRowCount(tableSelector: string): Promise<number> {
    const rows = this.page.locator(`${tableSelector} tbody tr`);
    return await rows.count();
  }

  /**
   * Verify chart is rendered
   */
  async verifyChartRendered(chartSelector: string) {
    const chart = this.page.locator(chartSelector);
    await expect(chart).toBeVisible();
    
    // Check for SVG or Canvas elements (common chart elements)
    const chartElements = chart.locator('svg, canvas');
    await expect(chartElements.first()).toBeVisible();
  }
}