import { Page, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

export class FinancialPage {
  private helpers: TestHelpers;

  constructor(private page: Page) {
    this.helpers = new TestHelpers(page);
  }

  // Selectors
  private selectors = {
    // Main navigation
    dashboardTab: 'button:has-text("Dashboard"), [data-testid="financial-dashboard-tab"]',
    transactionsTab: 'button:has-text("Transactions"), [data-testid="transactions-tab"]',
    budgetsTab: 'button:has-text("Budgets"), [data-testid="budgets-tab"]',
    reportsTab: 'button:has-text("Reports"), [data-testid="reports-tab"]',
    forecastingTab: 'button:has-text("Forecasting"), [data-testid="forecasting-tab"]',
    
    // Financial dashboard
    totalRevenue: '[data-testid="total-revenue"], .total-revenue',
    totalExpenses: '[data-testid="total-expenses"], .total-expenses',
    netProfit: '[data-testid="net-profit"], .net-profit',
    profitMargin: '[data-testid="profit-margin"], .profit-margin',
    monthlyGrowth: '[data-testid="monthly-growth"], .monthly-growth',
    
    // Charts
    revenueChart: '[data-testid="revenue-chart"]',
    expensesChart: '[data-testid="expenses-chart"]',
    profitChart: '[data-testid="profit-chart"]',
    categoryBreakdown: '[data-testid="category-breakdown-chart"]',
    monthlyTrends: '[data-testid="monthly-trends-chart"]',
    
    // Transactions
    transactionsList: '[data-testid="transactions-list"]',
    transactionRow: '[data-testid="transaction-row"]',
    addTransactionButton: 'button:has-text("Add Transaction"), [data-testid="add-transaction"]',
    importTransactionsButton: 'button:has-text("Import"), [data-testid="import-transactions"]',
    exportTransactionsButton: 'button:has-text("Export"), [data-testid="export-transactions"]',
    
    // Transaction form
    transactionForm: '[data-testid="transaction-form"], form',
    typeSelect: 'select[name="type"], [data-testid="transaction-type"]',
    categorySelect: 'select[name="category"], [data-testid="transaction-category"]',
    amountInput: 'input[name="amount"], [data-testid="transaction-amount"]',
    descriptionInput: 'input[name="description"], [data-testid="transaction-description"]',
    dateInput: 'input[name="date"], [data-testid="transaction-date"]',
    campaignSelect: 'select[name="campaign"], [data-testid="transaction-campaign"]',
    receiptUpload: 'input[type="file"], [data-testid="receipt-upload"]',
    saveTransactionButton: 'button:has-text("Save"), button[type="submit"]',
    cancelButton: 'button:has-text("Cancel")',
    
    // Transaction filters
    searchInput: 'input[placeholder*="Search"], [data-testid="search-transactions"]',
    typeFilter: '[data-testid="type-filter"], select[name="typeFilter"]',
    categoryFilter: '[data-testid="category-filter"], select[name="categoryFilter"]',
    dateRangeFilter: '[data-testid="date-range-filter"]',
    startDateInput: 'input[name="startDate"], [data-testid="start-date-filter"]',
    endDateInput: 'input[name="endDate"], [data-testid="end-date-filter"]',
    applyFiltersButton: 'button:has-text("Apply"), [data-testid="apply-filters"]',
    clearFiltersButton: 'button:has-text("Clear"), [data-testid="clear-filters"]',
    
    // Budgets
    budgetsList: '[data-testid="budgets-list"]',
    budgetCard: '[data-testid="budget-card"]',
    createBudgetButton: 'button:has-text("Create Budget"), [data-testid="create-budget"]',
    
    // Budget form
    budgetForm: '[data-testid="budget-form"], form',
    budgetNameInput: 'input[name="name"], [data-testid="budget-name"]',
    budgetAmountInput: 'input[name="amount"], [data-testid="budget-amount"]',
    budgetCategorySelect: 'select[name="category"], [data-testid="budget-category"]',
    budgetPeriodSelect: 'select[name="period"], [data-testid="budget-period"]',
    budgetStartDate: 'input[name="startDate"], [data-testid="budget-start-date"]',
    budgetEndDate: 'input[name="endDate"], [data-testid="budget-end-date"]',
    alertThresholdInput: 'input[name="alertThreshold"], [data-testid="alert-threshold"]',
    saveBudgetButton: 'button:has-text("Save Budget"), [data-testid="save-budget"]',
    
    // Budget monitoring
    budgetProgress: '[data-testid="budget-progress"]',
    spentAmount: '[data-testid="spent-amount"]',
    remainingAmount: '[data-testid="remaining-amount"]',
    budgetAlert: '[data-testid="budget-alert"]',
    budgetStatus: '[data-testid="budget-status"]',
    
    // Reports
    reportsList: '[data-testid="reports-list"]',
    generateReportButton: 'button:has-text("Generate Report"), [data-testid="generate-report"]',
    reportTypeSelect: 'select[name="reportType"], [data-testid="report-type"]',
    reportPeriodSelect: 'select[name="period"], [data-testid="report-period"]',
    customDateRange: '[data-testid="custom-date-range"]',
    downloadReportButton: 'button:has-text("Download"), [data-testid="download-report"]',
    
    // P&L Statement
    plStatement: '[data-testid="pl-statement"]',
    grossRevenue: '[data-testid="gross-revenue"]',
    totalCosts: '[data-testid="total-costs"]',
    operatingIncome: '[data-testid="operating-income"]',
    netIncome: '[data-testid="net-income"]',
    
    // Forecasting
    forecastForm: '[data-testid="forecast-form"]',
    forecastPeriodSelect: 'select[name="forecastPeriod"], [data-testid="forecast-period"]',
    growthRateInput: 'input[name="growthRate"], [data-testid="growth-rate"]',
    generateForecastButton: 'button:has-text("Generate Forecast"), [data-testid="generate-forecast"]',
    forecastChart: '[data-testid="forecast-chart"]',
    forecastTable: '[data-testid="forecast-table"]',
    
    // Actions
    editButton: 'button:has-text("Edit"), [data-testid="edit-transaction"]',
    deleteButton: 'button:has-text("Delete"), [data-testid="delete-transaction"]',
    duplicateButton: 'button:has-text("Duplicate"), [data-testid="duplicate-transaction"]',
    
    // Bulk operations
    selectAllCheckbox: 'input[type="checkbox"][data-testid="select-all-transactions"]',
    transactionCheckbox: 'input[type="checkbox"][data-testid="select-transaction"]',
    bulkActionsDropdown: '[data-testid="bulk-actions-financial"]',
    applyBulkActionButton: 'button:has-text("Apply"), [data-testid="apply-bulk-action-financial"]',
    
    // Modals
    deleteModal: '[data-testid="delete-transaction-modal"]',
    confirmDeleteButton: 'button:has-text("Confirm"), [data-testid="confirm-delete-transaction"]',
    importModal: '[data-testid="import-modal"]',
    fileInput: 'input[type="file"], [data-testid="file-upload-financial"]',
    uploadButton: 'button:has-text("Upload"), [data-testid="upload-financial-file"]',
    
    // Date picker
    datePicker: '[data-testid="date-picker"]',
    monthPicker: '[data-testid="month-picker"]',
    yearPicker: '[data-testid="year-picker"]',
    
    // Category management
    manageCategoriesButton: 'button:has-text("Manage Categories"), [data-testid="manage-categories"]',
    addCategoryButton: 'button:has-text("Add Category"), [data-testid="add-category"]',
    categoryNameInput: 'input[name="categoryName"], [data-testid="category-name"]',
    categoryColorPicker: '[data-testid="category-color-picker"]',
    saveCategoryButton: 'button:has-text("Save Category"), [data-testid="save-category"]',
  };

  /**
   * Navigate to financial page
   */
  async navigateTo() {
    await this.helpers.navigateTo('/financial');
    await this.verifyOnFinancialPage();
  }

  /**
   * Verify we're on financial page
   */
  async verifyOnFinancialPage() {
    await this.helpers.verifyURL('financial');
    await this.helpers.verifyElementVisible(this.selectors.totalRevenue);
  }

  /**
   * Navigate to transactions tab
   */
  async navigateToTransactions() {
    await this.helpers.clickAndWait(this.selectors.transactionsTab);
    await this.helpers.verifyElementVisible(this.selectors.transactionsList);
  }

  /**
   * Navigate to budgets tab
   */
  async navigateToBudgets() {
    await this.helpers.clickAndWait(this.selectors.budgetsTab);
    await this.helpers.verifyElementVisible(this.selectors.budgetsList);
  }

  /**
   * Navigate to reports tab
   */
  async navigateToReports() {
    await this.helpers.clickAndWait(this.selectors.reportsTab);
    await this.helpers.verifyElementVisible(this.selectors.reportsList);
  }

  /**
   * Navigate to forecasting tab
   */
  async navigateToForecasting() {
    await this.helpers.clickAndWait(this.selectors.forecastingTab);
    await this.helpers.verifyElementVisible(this.selectors.forecastForm);
  }

  /**
   * Add new transaction
   */
  async addTransaction(transactionData: {
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    date?: string;
    campaign?: string;
  }) {
    console.log(`💰 Adding ${transactionData.type}: $${transactionData.amount}`);
    
    await this.navigateToTransactions();
    await this.helpers.clickAndWait(this.selectors.addTransactionButton);
    
    // Fill transaction form
    await this.helpers.selectOption(this.selectors.typeSelect, transactionData.type);
    await this.helpers.selectOption(this.selectors.categorySelect, transactionData.category);
    await this.helpers.fillAndVerify(this.selectors.amountInput, transactionData.amount.toString());
    await this.helpers.fillAndVerify(this.selectors.descriptionInput, transactionData.description);
    
    if (transactionData.date) {
      await this.helpers.fillAndVerify(this.selectors.dateInput, transactionData.date);
    }
    
    if (transactionData.campaign) {
      await this.helpers.selectOption(this.selectors.campaignSelect, transactionData.campaign);
    }
    
    // Save transaction
    await this.helpers.clickAndWait(this.selectors.saveTransactionButton);
    await this.helpers.waitForToast('transaction added');
  }

  /**
   * Edit existing transaction
   */
  async editTransaction(updates: {
    amount?: number;
    description?: string;
    category?: string;
  }) {
    console.log('✏️ Editing transaction');
    
    await this.helpers.clickAndWait(this.selectors.editButton);
    
    if (updates.amount) {
      await this.helpers.fillAndVerify(this.selectors.amountInput, updates.amount.toString());
    }
    
    if (updates.description) {
      await this.helpers.fillAndVerify(this.selectors.descriptionInput, updates.description);
    }
    
    if (updates.category) {
      await this.helpers.selectOption(this.selectors.categorySelect, updates.category);
    }
    
    await this.helpers.clickAndWait(this.selectors.saveTransactionButton);
    await this.helpers.waitForToast('transaction updated');
  }

  /**
   * Delete transaction
   */
  async deleteTransaction() {
    console.log('🗑️ Deleting transaction');
    
    await this.helpers.clickAndWait(this.selectors.deleteButton);
    
    // Confirm deletion
    await this.helpers.verifyElementVisible(this.selectors.deleteModal);
    await this.helpers.clickAndWait(this.selectors.confirmDeleteButton);
    
    await this.helpers.waitForToast('transaction deleted');
  }

  /**
   * Create budget
   */
  async createBudget(budgetData: {
    name: string;
    amount: number;
    category: string;
    period: 'monthly' | 'quarterly' | 'yearly';
    alertThreshold?: number;
  }) {
    console.log(`💼 Creating budget: ${budgetData.name} - $${budgetData.amount}`);
    
    await this.navigateToBudgets();
    await this.helpers.clickAndWait(this.selectors.createBudgetButton);
    
    // Fill budget form
    await this.helpers.fillAndVerify(this.selectors.budgetNameInput, budgetData.name);
    await this.helpers.fillAndVerify(this.selectors.budgetAmountInput, budgetData.amount.toString());
    await this.helpers.selectOption(this.selectors.budgetCategorySelect, budgetData.category);
    await this.helpers.selectOption(this.selectors.budgetPeriodSelect, budgetData.period);
    
    if (budgetData.alertThreshold) {
      await this.helpers.fillAndVerify(this.selectors.alertThresholdInput, budgetData.alertThreshold.toString());
    }
    
    // Save budget
    await this.helpers.clickAndWait(this.selectors.saveBudgetButton);
    await this.helpers.waitForToast('budget created');
  }

  /**
   * Generate financial report
   */
  async generateReport(reportData: {
    type: string;
    period: string;
    startDate?: string;
    endDate?: string;
  }) {
    console.log(`📊 Generating ${reportData.type} report for ${reportData.period}`);
    
    await this.navigateToReports();
    
    // Configure report parameters
    await this.helpers.selectOption(this.selectors.reportTypeSelect, reportData.type);
    await this.helpers.selectOption(this.selectors.reportPeriodSelect, reportData.period);
    
    if (reportData.startDate && reportData.endDate) {
      await this.helpers.fillAndVerify(this.selectors.startDateInput, reportData.startDate);
      await this.helpers.fillAndVerify(this.selectors.endDateInput, reportData.endDate);
    }
    
    // Generate report
    await this.helpers.clickAndWait(this.selectors.generateReportButton);
    await this.helpers.waitForLoadingToComplete();
    
    console.log('✅ Report generated successfully');
  }

  /**
   * Download report
   */
  async downloadReport() {
    console.log('📥 Downloading financial report');
    
    await this.helpers.clickAndWait(this.selectors.downloadReportButton);
    await this.helpers.waitForToast('report downloaded');
  }

  /**
   * Generate financial forecast
   */
  async generateForecast(forecastData: {
    period: string;
    growthRate: number;
  }) {
    console.log(`🔮 Generating forecast: ${forecastData.period} with ${forecastData.growthRate}% growth`);
    
    await this.navigateToForecasting();
    
    // Configure forecast parameters
    await this.helpers.selectOption(this.selectors.forecastPeriodSelect, forecastData.period);
    await this.helpers.fillAndVerify(this.selectors.growthRateInput, forecastData.growthRate.toString());
    
    // Generate forecast
    await this.helpers.clickAndWait(this.selectors.generateForecastButton);
    await this.helpers.waitForLoadingToComplete();
    
    // Verify forecast data is displayed
    await this.helpers.verifyElementVisible(this.selectors.forecastChart);
    await this.helpers.verifyElementVisible(this.selectors.forecastTable);
  }

  /**
   * Filter transactions
   */
  async filterTransactions(filters: {
    type?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    searchTerm?: string;
  }) {
    await this.navigateToTransactions();
    
    if (filters.searchTerm) {
      await this.helpers.fillAndVerify(this.selectors.searchInput, filters.searchTerm);
    }
    
    if (filters.type) {
      await this.helpers.selectOption(this.selectors.typeFilter, filters.type);
    }
    
    if (filters.category) {
      await this.helpers.selectOption(this.selectors.categoryFilter, filters.category);
    }
    
    if (filters.startDate) {
      await this.helpers.fillAndVerify(this.selectors.startDateInput, filters.startDate);
    }
    
    if (filters.endDate) {
      await this.helpers.fillAndVerify(this.selectors.endDateInput, filters.endDate);
    }
    
    await this.helpers.clickAndWait(this.selectors.applyFiltersButton);
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Clear all filters
   */
  async clearFilters() {
    await this.helpers.clickAndWait(this.selectors.clearFiltersButton);
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Import transactions from file
   */
  async importTransactions(filePath: string) {
    console.log(`📄 Importing transactions from: ${filePath}`);
    
    await this.navigateToTransactions();
    await this.helpers.clickAndWait(this.selectors.importTransactionsButton);
    
    // Upload file
    await this.helpers.verifyElementVisible(this.selectors.importModal);
    await this.helpers.uploadFile(this.selectors.fileInput, filePath);
    await this.helpers.clickAndWait(this.selectors.uploadButton);
    
    await this.helpers.waitForToast('transactions imported');
  }

  /**
   * Export transactions
   */
  async exportTransactions() {
    console.log('📤 Exporting transactions');
    
    await this.navigateToTransactions();
    await this.helpers.clickAndWait(this.selectors.exportTransactionsButton);
    
    await this.helpers.waitForToast('transactions exported');
  }

  /**
   * Verify financial dashboard metrics
   */
  async verifyDashboardMetrics() {
    await this.helpers.verifyElementVisible(this.selectors.totalRevenue);
    await this.helpers.verifyElementVisible(this.selectors.totalExpenses);
    await this.helpers.verifyElementVisible(this.selectors.netProfit);
    await this.helpers.verifyElementVisible(this.selectors.profitMargin);
  }

  /**
   * Verify financial charts are displayed
   */
  async verifyChartsDisplayed() {
    const charts = [
      this.selectors.revenueChart,
      this.selectors.expensesChart,
      this.selectors.profitChart,
      this.selectors.categoryBreakdown,
      this.selectors.monthlyTrends
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
   * Verify P&L statement
   */
  async verifyPLStatement() {
    await this.helpers.verifyElementVisible(this.selectors.plStatement);
    
    const plElements = [
      this.selectors.grossRevenue,
      this.selectors.totalCosts,
      this.selectors.operatingIncome,
      this.selectors.netIncome
    ];

    for (const selector of plElements) {
      await this.helpers.verifyElementVisible(selector);
    }
  }

  /**
   * Verify budget monitoring
   */
  async verifyBudgetMonitoring() {
    await this.navigateToBudgets();
    
    // Check if any budgets exist and verify monitoring elements
    const budgets = this.page.locator(this.selectors.budgetCard);
    if (await budgets.count() > 0) {
      await this.helpers.verifyElementVisible(this.selectors.budgetProgress);
      await this.helpers.verifyElementVisible(this.selectors.spentAmount);
      await this.helpers.verifyElementVisible(this.selectors.remainingAmount);
    }
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary() {
    const summary = {
      revenue: 0,
      expenses: 0,
      profit: 0,
      margin: 0
    };

    try {
      const revenueElement = this.page.locator(this.selectors.totalRevenue);
      if (await revenueElement.count() > 0) {
        const text = await revenueElement.textContent();
        summary.revenue = parseFloat(text?.replace(/[^0-9.-]/g, '') || '0');
      }
    } catch (error) {
      console.log('Could not get revenue');
    }

    try {
      const expensesElement = this.page.locator(this.selectors.totalExpenses);
      if (await expensesElement.count() > 0) {
        const text = await expensesElement.textContent();
        summary.expenses = parseFloat(text?.replace(/[^0-9.-]/g, '') || '0');
      }
    } catch (error) {
      console.log('Could not get expenses');
    }

    try {
      const profitElement = this.page.locator(this.selectors.netProfit);
      if (await profitElement.count() > 0) {
        const text = await profitElement.textContent();
        summary.profit = parseFloat(text?.replace(/[^0-9.-]/g, '') || '0');
      }
    } catch (error) {
      console.log('Could not get profit');
    }

    return summary;
  }

  /**
   * Test complete financial workflow
   */
  async testFinancialWorkflow(testData: any) {
    // Add income transaction
    await this.addTransaction({
      type: 'income',
      category: 'Streaming Revenue',
      amount: testData.incomeAmount,
      description: 'Test streaming revenue'
    });
    
    // Add expense transaction
    await this.addTransaction({
      type: 'expense',
      category: 'Marketing',
      amount: testData.expenseAmount,
      description: 'Test marketing expense'
    });
    
    // Create budget
    await this.createBudget({
      name: 'Test Marketing Budget',
      amount: testData.budgetAmount,
      category: 'Marketing',
      period: 'monthly'
    });
    
    // Generate report
    await this.generateReport({
      type: 'P&L Statement',
      period: 'This Month'
    });
    
    // Generate forecast
    await this.generateForecast({
      period: '6 months',
      growthRate: 10
    });
    
    // Verify dashboard metrics
    await this.verifyDashboardMetrics();
    
    // Verify charts
    await this.verifyChartsDisplayed();
  }
}