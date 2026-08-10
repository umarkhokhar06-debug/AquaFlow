const forecastService = require('./forecastService');

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // check every 15 minutes
const SCAN_HOUR = 2; // "approximately 2:00 AM" per SRS §9, server local time

let timer = null;
let lastRunDateKey = null;

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

async function tick() {
  const now = new Date();
  if (now.getHours() !== SCAN_HOUR) return;

  const key = dateKey(now);
  if (key === lastRunDateKey) return; // already ran today

  lastRunDateKey = key;
  try {
    const result = await forecastService.runNightlyScan(now);
    console.log(`Nightly IoT scan complete: ${result.scanned} device(s) scanned, ${result.staleDevices.length} stale, ${result.notified.length} predictive reorder notification(s) sent`);
  } catch (err) {
    console.error('Nightly IoT scan failed:', err.message);
  }
}

function start() {
  if (timer) return;
  timer = setInterval(tick, CHECK_INTERVAL_MS);
  console.log(`Nightly IoT scan loop started (checks every 15 min, runs at ~${SCAN_HOUR}:00 server time)`);
}

function stop() {
  clearInterval(timer);
  timer = null;
}

module.exports = { start, stop };
