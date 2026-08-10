const Order = require('../models/Order');
const Expense = require('../models/Expense');
const EarningsRecord = require('../models/EarningsRecord');
const auditLogService = require('./auditLogService');

function dateRange(from, to) {
  return {
    start: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: to ? new Date(to) : new Date()
  };
}

class FinanceService {
  async addExpense(payload, actorUser) {
    const { category, amount, description, date } = payload;
    if (!category || amount === undefined) {
      const err = new Error('category and amount are required');
      err.status = 400;
      throw err;
    }
    const expense = await Expense.create({ category, amount, description, date, recordedBy: actorUser.id });

    await auditLogService.record({
      action: 'EXPENSE_ADDED',
      actorUser,
      targetUser: null,
      changes: { category, amount, description: description || '' }
    });

    return expense;
  }

  async getAllExpenses({ from, to, category, page = 1, limit = 50 } = {}) {
    const query = {};
    if (from || to) {
      const { start, end } = dateRange(from, to);
      query.date = { $gte: start, $lte: end };
    }
    if (category) query.category = category;

    const skip = (page - 1) * limit;
    const [expenses, total] = await Promise.all([
      Expense.find(query).populate('recordedBy', 'name email').sort({ date: -1 }).skip(skip).limit(limit),
      Expense.countDocuments(query)
    ]);
    return { expenses, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async deleteExpense(id, actorUser) {
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) {
      const err = new Error('Expense not found');
      err.status = 404;
      throw err;
    }

    await auditLogService.record({
      action: 'EXPENSE_DELETED',
      actorUser,
      targetUser: null,
      changes: { category: expense.category, amount: expense.amount }
    });

    return expense;
  }

  // SRS §16: orders placed, gross revenue, revenue by period, revenue by
  // payment source with cash-vs-online/merchant ratios.
  async getRevenueSummary({ from, to } = {}) {
    const { start, end } = dateRange(from, to);

    const [ordersPlaced, revenueByMethod, dailyRevenue] = await Promise.all([
      Order.countDocuments({ orderDate: { $gte: start, $lte: end } }),
      Order.aggregate([
        { $match: { status: 'delivered', deliveredAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { status: 'delivered', deliveredAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt' } }, total: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const grossRevenue = revenueByMethod.reduce((s, r) => s + r.total, 0);
    // "online" here covers card/online/wallet -- any non-cash method --
    // since a specific merchant/gateway breakdown needs the actual payment
    // gateway integration (Phase 10, still an open SRS §26 decision).
    const cashTotal = revenueByMethod.find(r => r._id === 'cash')?.total || 0;
    const onlineTotal = grossRevenue - cashTotal;

    return {
      range: { start, end },
      ordersPlaced,
      grossRevenue,
      revenueByPaymentMethod: revenueByMethod.map(r => ({
        paymentMethod: r._id,
        orderCount: r.count,
        total: r.total,
        percentOfRevenue: grossRevenue ? Math.round((r.total / grossRevenue) * 1000) / 10 : 0
      })),
      cashVsOnlineRatio: {
        cashPercent: grossRevenue ? Math.round((cashTotal / grossRevenue) * 1000) / 10 : 0,
        onlinePercent: grossRevenue ? Math.round((onlineTotal / grossRevenue) * 1000) / 10 : 0
      },
      revenueByDay: dailyRevenue.map(r => ({ date: r._id, total: r.total }))
    };
  }

  // "Recorded salaries" = driver earnings accrued in the period (SRS's own
  // profit formula uses "recorded", not "disbursed" -- paymentStatus is
  // still shown per-driver so admin can see what's actually been paid out).
  async getSalaryExpenses({ from, to } = {}) {
    const { start, end } = dateRange(from, to);

    const [total, byDriver] = await Promise.all([
      EarningsRecord.aggregate([
        { $match: { deliveredAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalEarned: { $sum: '$totalEarned' }, totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalEarned', 0] } } } }
      ]),
      EarningsRecord.aggregate([
        { $match: { deliveredAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$driver', totalEarned: { $sum: '$totalEarned' }, deliveries: { $sum: 1 } } },
        { $sort: { totalEarned: -1 } }
      ])
    ]);

    return {
      range: { start, end },
      totalSalaryExpense: total[0]?.totalEarned || 0,
      totalPaidOut: total[0]?.totalPaid || 0,
      totalPending: (total[0]?.totalEarned || 0) - (total[0]?.totalPaid || 0),
      byDriver
    };
  }

  // SRS §16: "Profit view = recorded revenue minus recorded salaries and
  // other applicable expenses, with the exact accounting definition
  // finalized before production." Using that formula directly, as stated.
  async getProfitLoss({ from, to } = {}) {
    const { start, end } = dateRange(from, to);
    const [revenue, salaries, otherExpensesAgg] = await Promise.all([
      this.getRevenueSummary({ from: start, to: end }),
      this.getSalaryExpenses({ from: start, to: end }),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ])
    ]);

    const totalOtherExpenses = otherExpensesAgg.reduce((s, e) => s + e.total, 0);
    const profit = revenue.grossRevenue - salaries.totalSalaryExpense - totalOtherExpenses;

    return {
      range: { start, end },
      grossRevenue: revenue.grossRevenue,
      salaryExpense: salaries.totalSalaryExpense,
      otherExpenses: totalOtherExpenses,
      otherExpensesByCategory: otherExpensesAgg.map(e => ({ category: e._id, total: e.total })),
      profit,
      note: 'Profit = gross revenue - recorded salaries - other recorded expenses, per SRS §16. Exact accounting definition (accrual vs. cash basis, tax treatment, etc.) to be finalized before production.'
    };
  }

  async getFinanceDashboard({ from, to } = {}) {
    const [revenue, salaries, profitLoss] = await Promise.all([
      this.getRevenueSummary({ from, to }),
      this.getSalaryExpenses({ from, to }),
      this.getProfitLoss({ from, to })
    ]);
    return { revenue, salaries, profitLoss };
  }
}

module.exports = new FinanceService();
