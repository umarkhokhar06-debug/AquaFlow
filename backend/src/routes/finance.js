const express = require('express');
const financeController = require('../controllers/financeController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

// Finance is entirely admin-only -- no dispatcher access, unlike the
// operational reports in Phase 6 (SRS §16/§17: financial data is sensitive).
router.use(authMiddleware);
router.use(requireAdmin);

router.get('/dashboard', financeController.getDashboard);
router.get('/revenue', financeController.getRevenue);
router.get('/salaries', financeController.getSalaries);
router.get('/profit-loss', financeController.getProfitLoss);

router.post('/expenses', financeController.addExpense);
router.get('/expenses', financeController.getExpenses);
router.delete('/expenses/:id', financeController.deleteExpense);

module.exports = router;
