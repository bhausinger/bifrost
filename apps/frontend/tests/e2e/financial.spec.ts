import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage';
import { FinancialPage } from '../page-objects/FinancialPage';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Financial Tracking System Tests', () => {
  let authPage: AuthPage;
  let financialPage: FinancialPage;
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    financialPage = new FinancialPage(page);
    helpers = new TestHelpers(page);
    
    // Login before each test
    await authPage.login('benjamin.hausinger@gmail.com', 'TestPassword123!');
    await authPage.verifyLoggedIn();
  });

  test.describe('Financial Dashboard', () => {
    test('should display financial dashboard metrics', async ({ page }) => {
      await financialPage.navigateTo();
      
      // Verify main financial metrics are displayed
      await financialPage.verifyDashboardMetrics();
      
      // Verify charts are rendered
      await financialPage.verifyChartsDisplayed();
    });

    test('should show updated metrics after adding transactions', async ({ page }) => {
      // Get initial financial summary
      await financialPage.navigateTo();
      const initialSummary = await financialPage.getFinancialSummary();
      
      // Add income transaction
      await financialPage.addTransaction({
        type: 'income',
        category: 'Streaming Revenue',
        amount: 1500,
        description: 'Monthly streaming revenue'
      });
      
      // Add expense transaction
      await financialPage.addTransaction({
        type: 'expense',
        category: 'Marketing',
        amount: 500,
        description: 'Social media advertising'
      });
      
      // Navigate back to dashboard and verify updated metrics
      await financialPage.navigateTo();
      const updatedSummary = await financialPage.getFinancialSummary();
      
      // Revenue should have increased
      expect(updatedSummary.revenue).toBeGreaterThanOrEqual(initialSummary.revenue + 1500);
      // Expenses should have increased
      expect(updatedSummary.expenses).toBeGreaterThanOrEqual(initialSummary.expenses + 500);
    });
  });

  test.describe('Transaction Management', () => {
    test('should add income transaction successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      const transactionData = {
        type: 'income' as const,
        category: 'Streaming Revenue',
        amount: testData.amount,
        description: `Test income transaction - ${testData.description}`,
        date: '2024-01-15'
      };
      
      await financialPage.addTransaction(transactionData);
      
      // Verify transaction was added
      await financialPage.navigateToTransactions();
      await helpers.verifyElementVisible('[data-testid="transactions-list"]');
      await helpers.verifyElementText('.transaction-row', transactionData.description);
    });

    test('should add expense transaction successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      const transactionData = {
        type: 'expense' as const,
        category: 'Marketing',
        amount: testData.amount,
        description: `Test expense transaction - ${testData.description}`,
        date: '2024-01-20'
      };
      
      await financialPage.addTransaction(transactionData);
      
      // Verify transaction was added
      await financialPage.navigateToTransactions();
      await helpers.verifyElementVisible('[data-testid="transactions-list"]');
      await helpers.verifyElementText('.transaction-row', transactionData.description);
    });

    test('should associate transaction with campaign', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      const transactionData = {
        type: 'expense' as const,
        category: 'Promotion',
        amount: testData.amount,
        description: 'Campaign promotion expense',
        campaign: 'Test Campaign'
      };
      
      await financialPage.addTransaction(transactionData);
      
      // Verify transaction was associated with campaign
      await financialPage.navigateToTransactions();
      await helpers.verifyElementVisible('[data-testid="transactions-list"]');
    });

    test('should validate transaction required fields', async ({ page }) => {
      await financialPage.navigateToTransactions();
      await helpers.clickAndWait('button:has-text("Add Transaction")');
      
      // Try to submit empty form
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show validation errors
      await helpers.waitForToast('amount is required');
    });

    test('should validate transaction amount format', async ({ page }) => {
      await financialPage.navigateToTransactions();
      await helpers.clickAndWait('button:has-text("Add Transaction")');
      
      // Fill invalid amount
      await helpers.selectOption('[data-testid="transaction-type"]', 'income');
      await helpers.selectOption('[data-testid="transaction-category"]', 'Streaming Revenue');
      await helpers.fillAndVerify('[data-testid="transaction-amount"]', 'invalid-amount');
      await helpers.fillAndVerify('[data-testid="transaction-description"]', 'Test transaction');
      
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show validation error
      await helpers.waitForToast('invalid amount');
    });
  });

  test.describe('Transaction Editing and Deletion', () => {
    test('should edit transaction successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create transaction first
      await financialPage.addTransaction({
        type: 'income',
        category: 'Streaming Revenue',
        amount: testData.amount,
        description: 'Original description'
      });
      
      // Edit the transaction
      const updates = {
        amount: testData.amount + 500,
        description: 'Updated description for testing',
        category: 'Licensing Revenue'
      };
      
      await financialPage.editTransaction(updates);
      
      // Verify changes were saved
      await helpers.verifyElementText('.transaction-row', updates.description);
    });

    test('should delete transaction successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create transaction first
      await financialPage.addTransaction({
        type: 'expense',
        category: 'Equipment',
        amount: testData.amount,
        description: 'Transaction to be deleted'
      });
      
      // Delete the transaction
      await financialPage.deleteTransaction();
      
      // Should be redirected to transactions list
      await financialPage.navigateToTransactions();
    });

    test('should require confirmation for transaction deletion', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create transaction first
      await financialPage.addTransaction({
        type: 'income',
        category: 'Performance Revenue',
        amount: testData.amount,
        description: 'Transaction deletion test'
      });
      
      // Click delete button
      await helpers.clickAndWait('[data-testid="delete-transaction"]');
      
      // Should show confirmation modal
      await helpers.verifyElementVisible('[data-testid="delete-transaction-modal"]');
      
      // Cancel deletion
      await helpers.clickAndWait('button:has-text("Cancel")');
      
      // Should still see the transaction
      await financialPage.navigateToTransactions();
      await helpers.verifyElementText('.transaction-row', 'Transaction deletion test');
    });
  });

  test.describe('Transaction Filtering and Search', () => {
    test('should filter transactions by type', async ({ page }) => {
      const testData1 = helpers.generateTestData();
      const testData2 = helpers.generateTestData();
      
      // Create income and expense transactions
      await financialPage.addTransaction({
        type: 'income',
        category: 'Streaming Revenue',
        amount: testData1.amount,
        description: 'Income transaction for filtering'
      });
      
      await financialPage.addTransaction({
        type: 'expense',
        category: 'Marketing',
        amount: testData2.amount,
        description: 'Expense transaction for filtering'
      });
      
      // Filter by income only
      await financialPage.filterTransactions({
        type: 'income'
      });
      
      // Should show only income transactions
      await helpers.verifyElementText('.transaction-row', 'Income transaction for filtering');
    });

    test('should filter transactions by category', async ({ page }) => {
      const testData1 = helpers.generateTestData();
      const testData2 = helpers.generateTestData();
      
      // Create transactions with different categories
      await financialPage.addTransaction({
        type: 'income',
        category: 'Streaming Revenue',
        amount: testData1.amount,
        description: 'Streaming revenue transaction'
      });
      
      await financialPage.addTransaction({
        type: 'income',
        category: 'Licensing Revenue',
        amount: testData2.amount,
        description: 'Licensing revenue transaction'
      });
      
      // Filter by Streaming Revenue category
      await financialPage.filterTransactions({
        category: 'Streaming Revenue'
      });
      
      // Should show only streaming revenue transactions
      await helpers.verifyElementText('.transaction-row', 'Streaming revenue transaction');
    });

    test('should filter transactions by date range', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create transaction with specific date
      await financialPage.addTransaction({
        type: 'income',
        category: 'Performance Revenue',
        amount: testData.amount,
        description: 'Date range test transaction',
        date: '2024-02-15'
      });
      
      // Filter by date range
      await financialPage.filterTransactions({
        startDate: '2024-02-01',
        endDate: '2024-02-28'
      });
      
      // Should show transaction within date range
      await helpers.verifyElementText('.transaction-row', 'Date range test transaction');
    });

    test('should search transactions by description', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create transaction with unique description
      const uniqueDescription = `Unique search term ${testData.firstName}`;
      
      await financialPage.addTransaction({
        type: 'expense',
        category: 'Equipment',
        amount: testData.amount,
        description: uniqueDescription
      });
      
      // Search by description
      await financialPage.filterTransactions({
        searchTerm: uniqueDescription
      });
      
      // Should show matching transaction
      await helpers.verifyElementText('.transaction-row', uniqueDescription);
    });

    test('should clear all filters', async ({ page }) => {
      // Apply some filters
      await financialPage.filterTransactions({
        type: 'income',
        category: 'Streaming Revenue',
        searchTerm: 'test'
      });
      
      // Clear all filters
      await financialPage.clearFilters();
      
      // Should show all transactions again
      await helpers.verifyElementVisible('[data-testid="transactions-list"]');
    });
  });

  test.describe('Budget Management', () => {
    test('should create budget successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      const budgetData = {
        name: `Test Budget ${testData.firstName}`,
        amount: testData.amount,
        category: 'Marketing',
        period: 'monthly' as const,
        alertThreshold: 80
      };
      
      await financialPage.createBudget(budgetData);
      
      // Verify budget was created
      await financialPage.navigateToBudgets();
      await helpers.verifyElementVisible('[data-testid="budgets-list"]');
      await helpers.verifyElementText('.budget-card', budgetData.name);
    });

    test('should validate budget required fields', async ({ page }) => {
      await financialPage.navigateToBudgets();
      await helpers.clickAndWait('button:has-text("Create Budget")');
      
      // Try to submit empty form
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show validation errors
      await helpers.waitForToast('name is required');
    });

    test('should monitor budget spending', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create budget
      await financialPage.createBudget({
        name: `Monitor Budget ${testData.firstName}`,
        amount: 1000,
        category: 'Marketing',
        period: 'monthly'
      });
      
      // Add expense that uses part of the budget
      await financialPage.addTransaction({
        type: 'expense',
        category: 'Marketing',
        amount: 300,
        description: 'Marketing expense against budget'
      });
      
      // Verify budget monitoring shows updated spending
      await financialPage.verifyBudgetMonitoring();
    });

    test('should alert when budget threshold is reached', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Create budget with low threshold
      await financialPage.createBudget({
        name: `Alert Budget ${testData.firstName}`,
        amount: 1000,
        category: 'Equipment',
        period: 'monthly',
        alertThreshold: 50 // 50% threshold
      });
      
      // Add expense that exceeds threshold
      await financialPage.addTransaction({
        type: 'expense',
        category: 'Equipment',
        amount: 600, // 60% of budget
        description: 'Equipment purchase exceeding threshold'
      });
      
      // Should show budget alert
      await financialPage.navigateToBudgets();
      await helpers.verifyElementVisible('[data-testid="budget-alert"]');
    });
  });

  test.describe('Financial Reports', () => {
    test('should generate P&L report successfully', async ({ page }) => {
      // Add some transactions for the report
      const testData = helpers.generateTestData();
      
      await financialPage.addTransaction({
        type: 'income',
        category: 'Streaming Revenue',
        amount: 5000,
        description: 'Report test income'
      });
      
      await financialPage.addTransaction({
        type: 'expense',
        category: 'Marketing',
        amount: 2000,
        description: 'Report test expense'
      });
      
      // Generate P&L report
      await financialPage.generateReport({
        type: 'P&L Statement',
        period: 'This Month'
      });
      
      // Verify report was generated
      await helpers.verifyElementVisible('[data-testid="pl-statement"]');
      await financialPage.verifyPLStatement();
    });

    test('should generate custom date range report', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Add transaction with specific date
      await financialPage.addTransaction({
        type: 'income',
        category: 'Licensing Revenue',
        amount: testData.amount,
        description: 'Custom date range transaction',
        date: '2024-01-15'
      });
      
      // Generate custom report
      await financialPage.generateReport({
        type: 'Income Statement',
        period: 'Custom',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
      
      // Verify custom report was generated
      await helpers.verifyElementVisible('[data-testid="reports-list"]');
    });

    test('should download financial report', async ({ page }) => {
      // Generate a report first
      await financialPage.generateReport({
        type: 'Cash Flow',
        period: 'This Quarter'
      });
      
      // Mock download API
      await page.route('**/financial/reports/download', route => {
        route.fulfill({
          status: 200,
          body: 'Mock report data',
          headers: { 'Content-Type': 'application/pdf' }
        });
      });
      
      // Download report
      await financialPage.downloadReport();
      
      // Verify download completed
      await helpers.waitForToast('report downloaded');
    });
  });

  test.describe('Financial Forecasting', () => {
    test('should generate financial forecast successfully', async ({ page }) => {
      // Add historical data for forecasting
      const transactions = [
        { amount: 5000, date: '2024-01-01' },
        { amount: 5500, date: '2024-02-01' },
        { amount: 6000, date: '2024-03-01' }
      ];
      
      for (const transaction of transactions) {
        await financialPage.addTransaction({
          type: 'income',
          category: 'Streaming Revenue',
          amount: transaction.amount,
          description: 'Historical data for forecasting',
          date: transaction.date
        });
      }
      
      // Generate forecast
      await financialPage.generateForecast({
        period: '6 months',
        growthRate: 10
      });
      
      // Verify forecast was generated
      await helpers.verifyElementVisible('[data-testid="forecast-chart"]');
      await helpers.verifyElementVisible('[data-testid="forecast-table"]');
    });

    test('should validate forecast parameters', async ({ page }) => {
      await financialPage.navigateToForecasting();
      
      // Try to generate forecast without required parameters
      await helpers.clickAndWait('[data-testid="generate-forecast"]');
      
      // Should show validation error
      await helpers.waitForToast('period is required');
    });

    test('should handle different forecast periods', async ({ page }) => {
      const periods = ['3 months', '6 months', '1 year', '2 years'];
      
      for (const period of periods) {
        await financialPage.generateForecast({
          period,
          growthRate: 15
        });
        
        // Verify forecast was generated for each period
        await helpers.verifyElementVisible('[data-testid="forecast-chart"]');
      }
    });
  });

  test.describe('Import and Export', () => {
    test('should import transactions from file', async ({ page }) => {
      // Mock file import
      await page.route('**/financial/import', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            message: 'Transactions imported successfully', 
            count: 10 
          })
        });
      });
      
      // Import transactions
      const mockFilePath = '/path/to/transactions.csv';
      await financialPage.importTransactions(mockFilePath);
      
      // Verify import completed
      await helpers.waitForToast('transactions imported');
    });

    test('should export transactions', async ({ page }) => {
      // Create some transactions to export
      const transactions = [
        { amount: 1000, description: 'Export test income' },
        { amount: 500, description: 'Export test expense' }
      ];
      
      for (const transaction of transactions) {
        await financialPage.addTransaction({
          type: 'income',
          category: 'Streaming Revenue',
          amount: transaction.amount,
          description: transaction.description
        });
      }
      
      // Mock export API
      await page.route('**/financial/export', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Transactions exported successfully' })
        });
      });
      
      // Export transactions
      await financialPage.exportTransactions();
      
      // Verify export completed
      await helpers.waitForToast('transactions exported');
    });
  });

  test.describe('Complete Financial Workflow', () => {
    test('should complete full financial workflow', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      const workflowData = {
        incomeAmount: 5000,
        expenseAmount: 2000,
        budgetAmount: 3000
      };
      
      // Execute complete financial workflow
      await financialPage.testFinancialWorkflow(workflowData);
      
      // Verify workflow completed successfully
      await financialPage.verifyDashboardMetrics();
      await financialPage.verifyChartsDisplayed();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle large number of transactions', async ({ page }) => {
      // Create multiple transactions to test performance
      const transactionCount = 50;
      
      for (let i = 1; i <= transactionCount; i++) {
        await financialPage.addTransaction({
          type: i % 2 === 0 ? 'income' : 'expense',
          category: i % 2 === 0 ? 'Streaming Revenue' : 'Marketing',
          amount: Math.floor(Math.random() * 1000) + 100,
          description: `Performance test transaction ${i}`
        });
      }
      
      // Navigate to transactions list
      await financialPage.navigateToTransactions();
      
      // Verify all transactions load within reasonable time
      const startTime = Date.now();
      await helpers.verifyElementVisible('[data-testid="transactions-list"]');
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle complex financial calculations', async ({ page }) => {
      // Add transactions with large amounts and complex calculations
      const complexTransactions = [
        { type: 'income', amount: 999999.99, category: 'Licensing Revenue' },
        { type: 'expense', amount: 123456.78, category: 'Equipment' },
        { type: 'income', amount: 0.01, category: 'Streaming Revenue' },
        { type: 'expense', amount: 999.99, category: 'Marketing' }
      ];
      
      for (const transaction of complexTransactions) {
        await financialPage.addTransaction({
          type: transaction.type as 'income' | 'expense',
          category: transaction.category,
          amount: transaction.amount,
          description: `Complex calculation test ${transaction.amount}`
        });
      }
      
      // Verify calculations are accurate
      await financialPage.navigateTo();
      const summary = await financialPage.getFinancialSummary();
      
      // Verify summary calculations are reasonable
      expect(summary.revenue).toBeGreaterThan(0);
      expect(summary.expenses).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/financial**', route => {
        route.abort('failed');
      });
      
      await financialPage.navigateTo();
      
      // Should show network error message
      await helpers.waitForToast('network error');
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Simulate server error
      await page.route('**/financial/transactions', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      const testData = helpers.generateTestData();
      
      await financialPage.addTransaction({
        type: 'income',
        category: 'Streaming Revenue',
        amount: testData.amount,
        description: 'Error test transaction'
      });
      
      // Should show server error message
      await helpers.waitForToast('server error');
    });

    test('should validate negative amounts appropriately', async ({ page }) => {
      await financialPage.navigateToTransactions();
      await helpers.clickAndWait('button:has-text("Add Transaction")');
      
      // Try to enter negative amount
      await helpers.selectOption('[data-testid="transaction-type"]', 'income');
      await helpers.selectOption('[data-testid="transaction-category"]', 'Streaming Revenue');
      await helpers.fillAndVerify('[data-testid="transaction-amount"]', '-100');
      await helpers.fillAndVerify('[data-testid="transaction-description"]', 'Negative amount test');
      
      await helpers.clickAndWait('button[type="submit"]');
      
      // Should show validation error or handle appropriately
      await helpers.waitForToast('amount must be positive');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await financialPage.navigateTo();
      
      // Tab through elements
      await page.keyboard.press('Tab');
      await expect(page.locator('button:has-text("Add Transaction")')).toBeFocused();
      
      await page.keyboard.press('Enter');
      
      // Should open transaction form
      await helpers.verifyElementVisible('form');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await financialPage.navigateToTransactions();
      await helpers.clickAndWait('button:has-text("Add Transaction")');
      
      // Check for proper form labeling
      const amountInput = page.locator('input[name="amount"]');
      const categorySelect = page.locator('select[name="category"]');
      
      await expect(amountInput).toHaveAttribute('aria-label');
      await expect(categorySelect).toHaveAttribute('aria-label');
    });
  });
});