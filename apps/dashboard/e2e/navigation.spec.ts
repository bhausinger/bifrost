// These tests run against the unauthenticated app shell.
// For authenticated flow testing, set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD env vars.

import { test, expect } from '@playwright/test'

test.describe('app shell loads correctly', () => {
  test('app renders without crashing (no blank white screen)', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.evaluate(() => document.body.innerText.trim())
    expect(bodyText.length).toBeGreaterThan(0)
  })

  test('login page renders with expected UI elements', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should have at least one button or interactive element
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThan(0)

    // Should have some visible text content
    const bodyText = await page.evaluate(() => document.body.innerText.trim())
    expect(bodyText.length).toBeGreaterThan(0)
  })

  test('Vite dev server responds on port 3333', async ({ request }) => {
    const response = await request.get('/')
    expect(response.status()).toBe(200)

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('text/html')
  })

  test('app includes expected HTML structure', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // React root element should exist
    const rootElement = page.locator('#root')
    await expect(rootElement).toBeAttached()

    // Page should have a head with meta tags
    const hasViewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]')
      return meta !== null
    })
    expect(hasViewport).toBe(true)
  })
})
