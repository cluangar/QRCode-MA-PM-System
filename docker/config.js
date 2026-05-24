// Load .env file if present (no extra dependency needed)
import { readFileSync, existsSync } from 'fs'
if (existsSync('.env')) {
  readFileSync('.env', 'utf8')
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const eq = trimmed.indexOf('=')
      if (eq < 1) return
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!(key in process.env)) process.env[key] = val
    })
}

const config = {
  port:           Number(process.env.PORT)             || 3001,
  adminUser:      process.env.ADMIN_USER               || 'docadmin',
  adminPass:      process.env.ADMIN_PASS               || 'admin1234',
  dbPath:         process.env.DB_PATH                  || './mapm.db',
  pmTriggerHours: Number(process.env.PM_TRIGGER_HOURS) || 500,
  demoSeed:       process.env.DEMO_SEED               !== 'false',
  serverIp:       process.env.SERVER_IP                || '',
}

export default config
