// These tests run against the unauthenticated app shell.
// For authenticated flow testing, set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD env vars.

import { test, expect } from '@playwright/test'

test.describe('unauthenticated access', () => {
  test('root redirects to login or shows login component', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const hasLoginContent =
      url.includes('login') ||
      (await page.locator('text=/sign in|log in|google/i').first().isVisible().catch(() => false))

    expect(hasLoginContent).toBe(true)
  })

  test('login page has Google sign-in button', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const googleButton = page.locator('button', { hasText: /google/i })
    await expect(googleButton).toBeVisible({ timeout: 10000 })
  })

  test('/dashboard when not authenticated shows login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const hasLoginIndicator =
      page.url().includes('login') ||
      (await page.locator('text=/sign in|log in|google/i').first().isVisible().catch(() => false))

    expect(hasLoginIndicator).toBe(true)
  })

  test('/pipeline when not authenticated shows login', async ({ page }) => {
    await page.goto('/pipeline')
    await page.waitForLoadState('networkidle')

    const hasLoginIndicator =
      page.url().includes('login') ||
      (await page.locator('text=/sign in|log in|google/i').first().isVisible().catch(() => false))

    expect(hasLoginIndicator).toBe(true)
  })
})
