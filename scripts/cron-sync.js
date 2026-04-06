#!/usr/bin/env node
/**
 * Cron worker script for Railway
 * Triggers a sync by calling POST /api/sync on the main app
 *
 * Deploy as a separate Railway service with cron schedule: 0 3 * * * (daily at 3:00 UTC)
 *
 * Environment variables:
 *   APP_URL - The internal Railway URL of the main app (e.g., http://register-uz-app.railway.internal:3000)
 *   or use the public URL as fallback
 */

const APP_URL = process.env.APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : 'https://register-uz-app-production.up.railway.app';

async function triggerSync() {
  const url = `${APP_URL}/api/sync`;
  console.log(`[${new Date().toISOString()}] Triggering sync at ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    console.log(`[${new Date().toISOString()}] Sync triggered successfully:`, JSON.stringify(data));
    process.exit(0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to trigger sync:`, error.message);
    process.exit(1);
  }
}

triggerSync();
