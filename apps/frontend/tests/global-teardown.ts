async function globalTeardown() {
  console.log('🧹 Running global teardown...');
  
  // Clean up any global resources if needed
  // For now, just log that teardown is complete
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;