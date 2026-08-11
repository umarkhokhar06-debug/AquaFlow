const express = require('express');
const supportController = require('../controllers/supportController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAnyRole } = require('../middlewares/authorizationMiddleware');

const router = express.Router();
const STAFF = ['admin', 'super_admin', 'call_center_agent'];

router.use(authMiddleware);

// Any authenticated user (customer or driver) -- SRS §4/§5: both apps
// support filing/viewing complaints.
router.post('/tickets', supportController.createTicket);
router.get('/tickets/my', supportController.getMyTickets);
router.get('/faqs', supportController.getFAQs);
router.get('/tickets/:id', supportController.getTicketById);
router.post('/tickets/:id/messages', supportController.addMessage);

// Call-center / admin / technician (technician is auto-scoped to their own
// assigned tickets in the controller -- see getAllTickets)
router.get('/tickets', requireAnyRole([...STAFF, 'technician']), supportController.getAllTickets);
router.get('/stats', requireAnyRole(STAFF), supportController.getStats);
router.get('/search', requireAnyRole(STAFF), supportController.search);
router.put('/tickets/:id/status', requireAnyRole(STAFF), supportController.updateStatus);
router.put('/tickets/:id/resolve', requireAnyRole(STAFF), supportController.resolveTicket);
router.put('/tickets/:id/assign', requireAnyRole(STAFF), supportController.assignTicket);
router.put('/tickets/:id/assign-technician', requireAnyRole(STAFF), supportController.assignTechnician);

// AI assistant (SRS §7) -- call-center agents only
router.post('/ai/troubleshoot', requireAnyRole(STAFF), supportController.troubleshoot);
router.post('/ai/order-intent', requireAnyRole(STAFF), supportController.parseOrderIntent);
router.post('/ai/place-order', requireAnyRole(STAFF), supportController.placeOrderForCustomer);

module.exports = router;
