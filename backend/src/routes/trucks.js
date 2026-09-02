const express = require('express');
const truckController = require('../controllers/truckController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdmin);

router.post('/', truckController.createTruck);
router.get('/', truckController.getAllTrucks);

// Must come before '/:id' so these aren't parsed as an id
router.get('/utilization-report', truckController.getFleetUtilizationReport);
router.get('/fuel-summary', truckController.getFleetMileageSummary);

router.get('/:id', truckController.getTruckById);
router.put('/:id', truckController.updateTruck);
router.delete('/:id', truckController.deleteTruck);

router.put('/:id/assign-driver', truckController.assignDriver);
router.put('/:id/unassign-driver', truckController.unassignDriver);
router.post('/:id/maintenance', truckController.addMaintenanceRecord);
router.get('/:id/utilization', truckController.getUtilization);
router.post('/:id/fuel-logs', truckController.addFuelLog);
router.get('/:id/fuel-logs', truckController.getFuelLogs);

module.exports = router;
