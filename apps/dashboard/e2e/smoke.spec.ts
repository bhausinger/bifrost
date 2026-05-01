// These tests run against the unauthenticated app shell.
// For authenticated flow testing, set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD env vars.

import { test, expect } from '@playwright/test'

test.describe('smoke tests', () => {
  test('app responds with HTTP 200 on /', async ({ request }) => {
    const response = await request.get('/')
    expect(response.status()).toBe(200)
  })

  test('HTML contains the app root element', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const html = await page.content()
    expect(html).toContain('<div id="root">')
  })

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out known non-critical errors (e.g. favicon 404)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    )

    expect(criticalErrors).toEqual([])
  })
})
