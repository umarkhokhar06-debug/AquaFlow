const iotDataService = require('./iotDataService');

const INTERVAL_MS = 60 * 1000;
let timer = null;

function start() {
  if (timer) return;
  timer = setInterval(() => {
    iotDataService.randomizeAllDevices().catch((err) => {
      console.error('Device simulator loop failed:', err.message);
    });
  }, INTERVAL_MS);
  console.log('Device simulator loop started (every 60s)');
}

function stop() {
  clearInterval(timer);
  timer = null;
}

module.exports = { start, stop };
