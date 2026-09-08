const express = require('express');
const clientErrorController = require('../controllers/clientErrorController');

const router = express.Router();

// No authMiddleware here on purpose -- see clientErrorController.report.
router.post('/', clientErrorController.report);

module.exports = router;
