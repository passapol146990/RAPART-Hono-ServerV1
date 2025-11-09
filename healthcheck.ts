// healthcheck.ts - Docker health check script
try {
  const response = await fetch('http://localhost:8000/stats', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  if (response.ok) {
    console.log('✅ Health check passed')
    process.exit(0)
  } else {
    console.error('❌ Health check failed: HTTP', response.status)
    process.exit(1)
  }
} catch (error) {
  console.error('❌ Health check failed:', error)
  process.exit(1)
}
