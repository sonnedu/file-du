if (!process.env.SESSION_SECRET) {
  console.error('❌ FATAL: SESSION_SECRET environment variable is required!')
  console.error('   Generate a random secret: openssl rand -hex 32')
  console.error('   Then set it in your .env file or environment.')
  process.exit(1)
}

if (
  !process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD === 'changeme123' ||
  process.env.ADMIN_PASSWORD === 'admin123'
) {
  console.error('❌ FATAL: ADMIN_PASSWORD must be changed from default!')
  console.error('   Set a strong password in your .env file or environment.')
  process.exit(1)
}
