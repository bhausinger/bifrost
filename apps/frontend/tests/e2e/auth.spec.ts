import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Authentication Tests', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    helpers = new TestHelpers(page);
  });

  test.describe('User Registration', () => {
    test('should register new user successfully', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      await authPage.register({
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        password: testData.password,
        confirmPassword: testData.password
      });
      
      // Should be redirected to dashboard after successful registration
      await authPage.verifyLoggedIn();
      await dashboardPage.verifyDashboardLoaded();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await authPage.navigateToRegister();
      
      await authPage.register({
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      });
      
      await authPage.verifyValidationError('email');
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      await authPage.register({
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        password: testData.password,
        confirmPassword: 'DifferentPassword123!'
      });
      
      await authPage.verifyRegistrationError('Passwords do not match');
    });

    test('should show error for duplicate email registration', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      // Register first user
      await authPage.register({
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        password: testData.password,
        confirmPassword: testData.password
      });
      
      // Logout
      await authPage.logout();
      
      // Try to register with same email
      await authPage.register({
        firstName: 'Another',
        lastName: 'User',
        email: testData.email, // Same email
        password: 'AnotherPassword123!',
        confirmPassword: 'AnotherPassword123!'
      });
      
      await authPage.verifyRegistrationError('Email already exists');
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      // Use the predefined test user email
      const testEmail = 'benjamin.hausinger@gmail.com';
      const testPassword = 'TestPassword123!';
      
      await authPage.login(testEmail, testPassword);
      
      // Should be redirected to dashboard
      await authPage.verifyLoggedIn();
      await dashboardPage.verifyDashboardLoaded();
      
      // Verify user is logged in by checking if we can see user-specific content
      const currentUserEmail = await authPage.getCurrentUserEmail();
      if (currentUserEmail) {
        expect(currentUserEmail).toContain(testEmail);
      }
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await authPage.login('invalid@example.com', 'wrongpassword');
      
      await authPage.verifyLoginError('Invalid credentials');
    });

    test('should show error for non-existent user', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      await authPage.login(testData.email, testData.password);
      
      await authPage.verifyLoginError('User not found');
    });

    test('should show validation error for empty fields', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      await authPage.verifyValidationError('email');
      await authPage.verifyValidationError('password');
    });
  });

  test.describe('Password Reset', () => {
    test('should initiate password reset flow', async ({ page }) => {
      const testEmail = 'benjamin.hausinger@gmail.com';
      
      await authPage.initiatePasswordReset(testEmail);
      
      // Should show success message
      await helpers.waitForToast('reset email sent');
    });

    test('should show error for non-existent email in reset', async ({ page }) => {
      const testData = helpers.generateTestData();
      
      await authPage.initiatePasswordReset(testData.email);
      
      // Should show error for non-existent email
      await helpers.waitForToast('email not found');
    });

    test('should complete password reset with valid token', async ({ page }) => {
      // This test would typically require a valid reset token
      // For now, we'll test the form validation
      
      await helpers.navigateTo('/auth/reset-password?token=mock-token');
      
      await authPage.completePasswordReset('NewPassword123!', 'NewPassword123!');
      
      // Should show success message or redirect to login
      await Promise.race([
        helpers.waitForToast('password updated'),
        helpers.verifyURL('login')
      ]);
    });

    test('should show error for mismatched passwords in reset', async ({ page }) => {
      await helpers.navigateTo('/auth/reset-password?token=mock-token');
      
      await authPage.completePasswordReset('NewPassword123!', 'DifferentPassword123!');
      
      await authPage.verifyValidationError('confirmPassword');
    });
  });

  test.describe('User Logout', () => {
    test('should logout successfully', async ({ page }) => {
      const testEmail = 'benjamin.hausinger@gmail.com';
      const testPassword = 'TestPassword123!';
      
      // Login first
      await authPage.login(testEmail, testPassword);
      await authPage.verifyLoggedIn();
      
      // Logout
      await authPage.logout();
      
      // Should be redirected to login page
      await authPage.verifyLoggedOut();
    });
  });

  test.describe('Authentication Flow Navigation', () => {
    test('should switch between login and register forms', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Switch to register
      await authPage.switchToRegister();
      await helpers.verifyURL('register');
      
      // Switch back to login
      await authPage.switchToLogin();
      await helpers.verifyURL('login');
    });

    test('should remember form data when switching tabs', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Fill some data
      await helpers.fillAndVerify('input[type="email"]', 'test@example.com');
      
      // Switch to register and back
      await authPage.switchToRegister();
      await authPage.switchToLogin();
      
      // Email should still be filled
      await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com');
    });
  });

  test.describe('Authentication Security', () => {
    test('should not allow access to protected routes when not logged in', async ({ page }) => {
      // Try to access dashboard without login
      await helpers.navigateTo('/dashboard');
      
      // Should be redirected to login
      await helpers.verifyURL('login');
    });

    test('should not allow access to auth pages when already logged in', async ({ page }) => {
      const testEmail = 'benjamin.hausinger@gmail.com';
      const testPassword = 'TestPassword123!';
      
      // Login first
      await authPage.login(testEmail, testPassword);
      await authPage.verifyLoggedIn();
      
      // Try to access login page
      await helpers.navigateTo('/auth/login');
      
      // Should be redirected to dashboard
      await helpers.verifyURL('dashboard');
    });

    test('should handle session expiry gracefully', async ({ page }) => {
      const testEmail = 'benjamin.hausinger@gmail.com';
      const testPassword = 'TestPassword123!';
      
      // Login first
      await authPage.login(testEmail, testPassword);
      await authPage.verifyLoggedIn();
      
      // Simulate session expiry by clearing storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to access a protected route
      await helpers.navigateTo('/dashboard');
      
      // Should be redirected to login
      await helpers.verifyURL('login');
    });
  });

  test.describe('Form Validation', () => {
    test('should validate email format in registration', async ({ page }) => {
      await authPage.navigateToRegister();
      
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com'
      ];
      
      for (const email of invalidEmails) {
        await helpers.fillAndVerify('input[name="email"]', email);
        await page.click('button[type="submit"]');
        
        await authPage.verifyValidationError('email');
        
        // Clear the field for next iteration
        await page.fill('input[name="email"]', '');
      }
    });

    test('should validate password strength', async ({ page }) => {
      await authPage.navigateToRegister();
      
      const weakPasswords = [
        '123',
        'password',
        'PASSWORD',
        '12345678'
      ];
      
      for (const password of weakPasswords) {
        await helpers.fillAndVerify('input[name="password"]', password);
        await page.click('button[type="submit"]');
        
        await authPage.verifyValidationError('password');
        
        // Clear the field for next iteration
        await page.fill('input[name="password"]', '');
      }
    });

    test('should validate required fields in registration', async ({ page }) => {
      await authPage.navigateToRegister();
      
      // Submit empty form
      await page.click('button[type="submit"]');
      
      // All required fields should show validation errors
      await authPage.verifyValidationError('firstName');
      await authPage.verifyValidationError('lastName');
      await authPage.verifyValidationError('email');
      await authPage.verifyValidationError('password');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Check for proper form labeling
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await expect(emailInput).toHaveAttribute('aria-label');
      await expect(passwordInput).toHaveAttribute('aria-label');
      await expect(submitButton).toHaveAttribute('aria-label');
    });

    test('should be keyboard navigable', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="password"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/auth/login', route => {
        route.abort('failed');
      });
      
      await authPage.login('test@example.com', 'password123');
      
      // Should show network error message
      await helpers.waitForToast('network error');
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Simulate server error
      await page.route('**/auth/login', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await authPage.login('test@example.com', 'password123');
      
      // Should show server error message
      await helpers.waitForToast('server error');
    });
  });
});