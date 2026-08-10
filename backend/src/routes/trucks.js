const express = require('express');
const truckController = require('../controllers/truckController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdmin);

router.post('/', truckController.createTruck);
router.get('/', truckController.getAllTrucks);
router.get('/:id', truckController.getTruckById);
router.put('/:id', truckController.updateTruck);
router.delete('/:id', truckController.deleteTruck);

router.put('/:id/assign-driver', truckController.assignDriver);
router.put('/:id/unassign-driver', truckController.unassignDriver);

module.exports = router;
