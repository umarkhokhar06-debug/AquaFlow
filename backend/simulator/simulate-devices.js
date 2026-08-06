#!/usr/bin/env node
/*
 * Multi-device IoT tank simulator.
 *
 * Reads devices.config.json, registers any devices that don't exist yet
 * (via the admin API), then streams fake sensor readings for all of them
 * concurrently to POST /api/iot/data — the same endpoint a real ESP32 will
 * call. Swapping simulation for real hardware later means pointing the
 * device at this endpoint with its real deviceId; nothing else changes.
 *
 * Usage:
 *   node simulate-devices.js
 *   API_URL=http://192.168.18.132:4000/api INTERVAL_SECONDS=5 node simulate-devices.js
 *   node simulate-devices.js ./my-devices.json
 *
 * Env vars (all optional):
 *   API_URL          default http://localhost:4000/api
 *   ADMIN_EMAIL      default admin@example.com   (used only to auto-register devices)
 *   ADMIN_PASSWORD   default password123
 *   INTERVAL_SECONDS default 5                   (how often each device sends a reading)
 */

const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
const INTERVAL_SECONDS = parseFloat(process.env.INTERVAL_SECONDS) || 5;
const CONFIG_PATH = path.resolve(process.argv[2] || path.join(__dirname, 'devices.config.json'));

const log = (deviceId, msg) => console.log(`[${new Date().toLocaleTimeString()}] [${deviceId}] ${msg}`);

async function adminLogin() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`Admin login failed: ${body.message || res.status}. Set ADMIN_EMAIL/ADMIN_PASSWORD env vars if this backend uses different admin credentials.`);
  }
  return body.token;
}

async function ensureDeviceRegistered(cfg, adminToken) {
  const createRes = await fetch(`${API_URL}/devices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      deviceId: cfg.deviceId,
      name: cfg.name,
      houseLabel: cfg.houseLabel,
      ownerEmail: cfg.ownerEmail,
      tank_depth: cfg.tank_depth,
      tank_full_distance: cfg.tank_full_distance,
      tankCapacityLiters: cfg.tankCapacityLiters,
      isSimulated: true
    })
  });

  if (createRes.status === 201) {
    log(cfg.deviceId, `registered new device "${cfg.name}" @ ${cfg.houseLabel}`);
    return;
  }

  const body = await createRes.json().catch(() => ({}));
  if (createRes.status === 409) {
    log(cfg.deviceId, `already registered, reusing it`);
    return;
  }

  throw new Error(`Failed to register ${cfg.deviceId}: ${body.message || createRes.status}`);
}

// Distance a device would report for a given tank level, given its calibration
function levelToDistance(levelPercent, tank_depth, tank_full_distance) {
  const clamped = Math.max(0, Math.min(100, levelPercent));
  return tank_depth - (clamped / 100) * (tank_depth - tank_full_distance);
}

function runDevice(cfg) {
  const state = {
    level: cfg.startLevel,
    temperature: 27 + Math.random() * 4,
    humidity: 40 + Math.random() * 15
  };

  const tick = async () => {
    // Drain over the interval, plus a little sensor jitter
    const drain = (cfg.drainPerMinute * INTERVAL_SECONDS) / 60;
    state.level -= drain + (Math.random() - 0.5) * 0.3;

    if (state.level <= cfg.refillAtLevel) {
      state.level = 92 + Math.random() * 8;
      log(cfg.deviceId, `tank refilled (simulated delivery) -> ${state.level.toFixed(1)}%`);
    }
    state.level = Math.max(0, Math.min(100, state.level));

    // Slow random walk for temperature/humidity
    state.temperature += (Math.random() - 0.5) * 0.3;
    state.humidity += (Math.random() - 0.5) * 0.5;

    const distance = levelToDistance(state.level, cfg.tank_depth, cfg.tank_full_distance);

    try {
      const res = await fetch(`${API_URL}/iot/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: cfg.deviceId,
          humidity: Number(state.humidity.toFixed(1)),
          temperature: Number(state.temperature.toFixed(1)),
          distance: Number(distance.toFixed(2)),
          timestamp: new Date().toISOString()
        })
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        log(cfg.deviceId, `send failed: ${body.message || res.status}`);
        return;
      }
      log(cfg.deviceId, `level=${state.level.toFixed(1)}% distance=${distance.toFixed(1)}cm temp=${state.temperature.toFixed(1)}C`);
    } catch (err) {
      log(cfg.deviceId, `network error sending reading: ${err.message}`);
    }
  };

  tick();
  return setInterval(tick, INTERVAL_SECONDS * 1000);
}

async function main() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config file not found: ${CONFIG_PATH}`);
    process.exit(1);
  }
  const devices = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  console.log(`Simulating ${devices.length} device(s) against ${API_URL}, sending every ${INTERVAL_SECONDS}s`);

  console.log('Logging in as admin to register any missing devices...');
  const adminToken = await adminLogin();

  for (const cfg of devices) {
    await ensureDeviceRegistered(cfg, adminToken);
  }

  console.log('Starting simulation loops. Press Ctrl+C to stop.\n');
  const timers = devices.map(runDevice);

  process.on('SIGINT', () => {
    console.log('\nStopping simulator...');
    timers.forEach(clearInterval);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Simulator failed to start:', err.message);
  process.exit(1);
});
