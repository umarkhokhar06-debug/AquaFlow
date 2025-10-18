const express = require('express');
const Calibration = require('../models/Calibration');
const router = express.Router();

// Set calibration values (create or update latest)
router.post('/', async (req, res) => {
  try {
    const { tank_depth, tank_full_distance } = req.body;
    if (typeof tank_depth !== 'number' || typeof tank_full_distance !== 'number') {
      return res.status(400).json({ success: false, message: 'tank_depth and tank_full_distance must be numbers' });
    }
    // Remove all previous calibrations (keep only one for simplicity)
    await Calibration.deleteMany({});
    const calibration = new Calibration({ tank_depth, tank_full_distance });
    await calibration.save();
    res.json({ success: true, calibration });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to set calibration', error: error.message });
  }
});

// Get latest calibration values
router.get('/', async (req, res) => {
  try {
    const calibration = await Calibration.findOne().sort({ createdAt: -1 });
    if (!calibration) return res.status(404).json({ success: false, message: 'No calibration found' });
    res.json({ success: true, calibration });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get calibration', error: error.message });
  }
});

module.exports = router;