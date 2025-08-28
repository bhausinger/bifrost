import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');
  
  // Wait for frontend to be ready
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('⏳ Waiting for frontend to be ready...');
  
  try {
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Frontend is ready');
  } catch (error) {
    console.log('❌ Frontend not ready, tests will use mocked APIs');
  }

  // Check if backend is available (optional)
  try {
    const response = await page.request.get('http://localhost:5000/health');
    if (response.ok()) {
      console.log('✅ Backend is ready');
    } else {
      console.log('⚠️ Backend not ready, tests will use mocked APIs');
    }
  } catch (error) {
    console.log('⚠️ Backend not available, tests will use mocked APIs');
  }

  await browser.close();
  console.log('✅ Global setup completed');
}

export default globalSetup;