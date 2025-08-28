import { Page, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

export class AuthPage {
  private helpers: TestHelpers;

  constructor(private page: Page) {
    this.helpers = new TestHelpers(page);
  }

  // Selectors
  private selectors = {
    // Login form
    loginEmailInput: 'input[type="email"]',
    loginPasswordInput: 'input[type="password"]',
    loginSubmitButton: 'button[type="submit"]',
    loginForm: '[data-testid="login-form"], form',
    
    // Register form
    registerFirstNameInput: 'input[name="firstName"]',
    registerLastNameInput: 'input[name="lastName"]',
    registerEmailInput: 'input[name="email"]',
    registerPasswordInput: 'input[name="password"]',
    registerConfirmPasswordInput: 'input[name="confirmPassword"]',
    registerSubmitButton: 'button[type="submit"]',
    registerForm: '[data-testid="register-form"]',
    
    // Navigation
    loginTab: 'button:has-text("Login"), a:has-text("Login")',
    registerTab: 'button:has-text("Register"), a:has-text("Register")',
    forgotPasswordLink: 'a:has-text("Forgot"), button:has-text("Forgot")',
    
    // Password reset
    resetEmailInput: 'input[name="email"]',
    resetSubmitButton: 'button:has-text("Reset"), button:has-text("Send")',
    resetPasswordInput: 'input[name="password"]',
    resetConfirmPasswordInput: 'input[name="confirmPassword"]',
    
    // General
    errorMessage: '[data-testid="error-message"], .error, .text-red-600',
    successMessage: '[data-testid="success-message"], .success, .text-green-600',
    loadingIndicator: '[data-testid="loading"], .loading',
  };

  /**
   * Navigate to login page
   */
  async navigateToLogin() {
    await this.helpers.navigateTo('/auth');
    await this.helpers.verifyURL('auth');
  }

  /**
   * Navigate to register page
   */
  async navigateToRegister() {
    await this.helpers.navigateTo('/auth');
    // Look for register tab or form on the auth page
    const registerTab = this.page.locator(this.selectors.registerTab);
    if (await registerTab.count() > 0) {
      await registerTab.click();
    }
    await this.helpers.verifyURL('auth');
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    console.log(`🔐 Logging in with email: ${email}`);
    
    // Navigate to login if not already there
    await this.navigateToLogin();
    
    // Fill login form
    await this.helpers.fillAndVerify(this.selectors.loginEmailInput, email);
    await this.helpers.fillAndVerify(this.selectors.loginPasswordInput, password);
    
    // Submit form
    await this.helpers.clickAndWait(this.selectors.loginSubmitButton);
    
    // Wait for redirect or error
    await Promise.race([
      this.page.waitForURL('**/dashboard', { timeout: 10000 }),
      this.page.waitForSelector(this.selectors.errorMessage, { timeout: 5000 })
    ]);
  }

  /**
   * Register new user
   */
  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }) {
    console.log(`📝 Registering new user: ${userData.email}`);
    
    await this.navigateToRegister();
    
    // Fill registration form
    await this.helpers.fillAndVerify(this.selectors.registerFirstNameInput, userData.firstName);
    await this.helpers.fillAndVerify(this.selectors.registerLastNameInput, userData.lastName);
    await this.helpers.fillAndVerify(this.selectors.registerEmailInput, userData.email);
    await this.helpers.fillAndVerify(this.selectors.registerPasswordInput, userData.password);
    
    if (userData.confirmPassword) {
      await this.helpers.fillAndVerify(this.selectors.registerConfirmPasswordInput, userData.confirmPassword);
    }
    
    // Submit form
    await this.helpers.clickAndWait(this.selectors.registerSubmitButton);
    
    // Wait for redirect or error
    await Promise.race([
      this.page.waitForURL('**/dashboard', { timeout: 10000 }),
      this.page.waitForSelector(this.selectors.errorMessage, { timeout: 5000 })
    ]);
  }

  /**
   * Logout user
   */
  async logout() {
    console.log('🚪 Logging out user');
    
    // Look for logout button in header/navigation
    const logoutButton = this.page.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
    );
    
    if (await logoutButton.count() > 0) {
      await logoutButton.click();
    } else {
      // Try to find user menu/dropdown
      const userMenu = this.page.locator(
        '[data-testid="user-menu"], .user-menu, button:has-text("Profile")'
      );
      
      if (await userMenu.count() > 0) {
        await userMenu.click();
        await this.helpers.clickAndWait('button:has-text("Logout"), a:has-text("Logout")');
      }
    }
    
    // Verify redirect to login
    await this.page.waitForURL('**/auth/login', { timeout: 10000 });
  }

  /**
   * Verify user is logged in
   */
  async verifyLoggedIn() {
    // Should be redirected to dashboard
    await expect(this.page).toHaveURL(/dashboard|campaigns|artists/);
    
    // Should see navigation elements
    const navigation = this.page.locator('nav, [data-testid="navigation"]');
    await expect(navigation).toBeVisible();
  }

  /**
   * Verify user is logged out
   */
  async verifyLoggedOut() {
    await expect(this.page).toHaveURL(/auth|login/);
    await this.helpers.verifyElementVisible(this.selectors.loginForm);
  }

  /**
   * Verify login error
   */
  async verifyLoginError(expectedMessage?: string) {
    const errorElement = this.page.locator(this.selectors.errorMessage);
    await expect(errorElement).toBeVisible();
    
    if (expectedMessage) {
      await expect(errorElement).toContainText(expectedMessage);
    }
  }

  /**
   * Verify registration error
   */
  async verifyRegistrationError(expectedMessage?: string) {
    const errorElement = this.page.locator(this.selectors.errorMessage);
    await expect(errorElement).toBeVisible();
    
    if (expectedMessage) {
      await expect(errorElement).toContainText(expectedMessage);
    }
  }

  /**
   * Start password reset flow
   */
  async initiatePasswordReset(email: string) {
    await this.navigateToLogin();
    
    // Click forgot password link
    await this.helpers.clickAndWait(this.selectors.forgotPasswordLink);
    
    // Fill email
    await this.helpers.fillAndVerify(this.selectors.resetEmailInput, email);
    
    // Submit
    await this.helpers.clickAndWait(this.selectors.resetSubmitButton);
    
    // Wait for success message
    await this.helpers.waitForToast('reset');
  }

  /**
   * Complete password reset
   */
  async completePasswordReset(newPassword: string, confirmPassword: string, resetToken?: string) {
    if (resetToken) {
      await this.helpers.navigateTo(`/auth/reset-password?token=${resetToken}`);
    }
    
    // Fill new password
    await this.helpers.fillAndVerify(this.selectors.resetPasswordInput, newPassword);
    await this.helpers.fillAndVerify(this.selectors.resetConfirmPasswordInput, confirmPassword);
    
    // Submit
    await this.helpers.clickAndWait(this.selectors.resetSubmitButton);
    
    // Wait for success
    await this.helpers.waitForToast('password');
  }

  /**
   * Switch between login and register tabs
   */
  async switchToRegister() {
    await this.helpers.clickAndWait(this.selectors.registerTab);
    await this.helpers.verifyURL('auth');
  }

  async switchToLogin() {
    await this.helpers.clickAndWait(this.selectors.loginTab);
    await this.helpers.verifyURL('auth');
  }

  /**
   * Verify form validation errors
   */
  async verifyValidationError(fieldName: string) {
    const validationError = this.page.locator(`[data-testid="${fieldName}-error"], input[name="${fieldName}"] + .error`);
    await expect(validationError).toBeVisible();
  }

  /**
   * Get current user email from UI (if displayed)
   */
  async getCurrentUserEmail(): Promise<string | null> {
    const userEmailElement = this.page.locator(
      '[data-testid="user-email"], .user-email, [data-testid="current-user"]'
    );
    
    if (await userEmailElement.count() > 0) {
      return await userEmailElement.textContent();
    }
    
    return null;
  }
}