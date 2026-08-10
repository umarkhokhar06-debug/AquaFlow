const PromoCode = require('../models/PromoCode');
const auditLogService = require('./auditLogService');

class PromoService {
  async createPromoCode(payload, actorUser) {
    const { code, discountPercent, validFrom, validUntil, usageLimit, perCustomerLimit, minOrderAmount, applicableProductTypes } = payload;

    if (!code || !discountPercent) {
      const err = new Error('code and discountPercent are required');
      err.status = 400;
      throw err;
    }

    const existing = await PromoCode.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      const err = new Error('A promo code with this code already exists');
      err.status = 409;
      throw err;
    }

    const promo = await PromoCode.create({
      code: code.trim().toUpperCase(),
      discountPercent,
      validFrom,
      validUntil,
      usageLimit,
      perCustomerLimit,
      minOrderAmount,
      applicableProductTypes,
      createdBy: actorUser.id
    });

    await auditLogService.record({
      action: 'PROMO_CODE_CREATED',
      actorUser,
      targetUser: null,
      changes: { code: promo.code, discountPercent }
    });

    return promo;
  }

  async getAllPromoCodes({ page = 1, limit = 50, isActive } = {}) {
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true' || isActive === true;

    const skip = (page - 1) * limit;
    const [codes, total] = await Promise.all([
      PromoCode.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PromoCode.countDocuments(query)
    ]);

    return { codes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getPromoCodeById(id) {
    const promo = await PromoCode.findById(id);
    if (!promo) {
      const err = new Error('Promo code not found');
      err.status = 404;
      throw err;
    }
    return promo;
  }

  async updatePromoCode(id, updates, actorUser) {
    const promo = await this.getPromoCodeById(id);
    const fields = ['discountPercent', 'isActive', 'validFrom', 'validUntil', 'usageLimit', 'perCustomerLimit', 'minOrderAmount', 'applicableProductTypes'];
    for (const field of fields) {
      if (updates[field] !== undefined) promo[field] = updates[field];
    }
    await promo.save();

    await auditLogService.record({
      action: 'PROMO_CODE_UPDATED',
      actorUser,
      targetUser: null,
      changes: { code: promo.code, updates }
    });

    return promo;
  }

  async deletePromoCode(id, actorUser) {
    const promo = await PromoCode.findByIdAndDelete(id);
    if (!promo) {
      const err = new Error('Promo code not found');
      err.status = 404;
      throw err;
    }

    await auditLogService.record({
      action: 'PROMO_CODE_DELETED',
      actorUser,
      targetUser: null,
      changes: { code: promo.code }
    });

    return promo;
  }

  // Validates eligibility (SRS §14: "System validates promo code eligibility
  // at checkout") and returns the computed discount without recording a
  // redemption yet -- recordRedemption is called separately once the order
  // that uses it actually saves successfully.
  async validateForCheckout(code, { customerId, orderAmount, itemTypes = [] }) {
    const promo = await PromoCode.findOne({ code: code.trim().toUpperCase() });
    if (!promo) {
      const err = new Error('Invalid promo code');
      err.status = 404;
      throw err;
    }
    if (!promo.isActive) {
      const err = new Error('This promo code is no longer active');
      err.status = 400;
      throw err;
    }

    const now = new Date();
    if (promo.validFrom && now < promo.validFrom) {
      const err = new Error('This promo code is not active yet');
      err.status = 400;
      throw err;
    }
    if (promo.validUntil && now > promo.validUntil) {
      const err = new Error('This promo code has expired');
      err.status = 400;
      throw err;
    }

    if (promo.usageLimit !== null && promo.redemptions.length >= promo.usageLimit) {
      const err = new Error('This promo code has reached its usage limit');
      err.status = 400;
      throw err;
    }

    const customerUses = promo.redemptions.filter(r => r.customer.toString() === customerId.toString()).length;
    if (customerUses >= promo.perCustomerLimit) {
      const err = new Error('You have already used this promo code the maximum number of times');
      err.status = 400;
      throw err;
    }

    if (orderAmount < promo.minOrderAmount) {
      const err = new Error(`This promo code requires a minimum order of ${promo.minOrderAmount}`);
      err.status = 400;
      throw err;
    }

    if (promo.applicableProductTypes.length > 0 && !itemTypes.some(t => promo.applicableProductTypes.includes(t))) {
      const err = new Error(`This promo code only applies to: ${promo.applicableProductTypes.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const discountAmount = Math.round(orderAmount * (promo.discountPercent / 100) * 100) / 100;

    return { promoCodeId: promo._id, code: promo.code, discountPercent: promo.discountPercent, discountAmount };
  }

  async recordRedemption(promoCodeId, { orderId, customerId, discountAmount }) {
    await PromoCode.findByIdAndUpdate(promoCodeId, {
      $push: { redemptions: { order: orderId, customer: customerId, discountAmount, redeemedAt: new Date() } }
    });
  }

  async getUsageReport(id) {
    const promo = await this.getPromoCodeById(id);
    const totalDiscountGiven = promo.redemptions.reduce((sum, r) => sum + r.discountAmount, 0);
    return {
      code: promo.code,
      discountPercent: promo.discountPercent,
      isActive: promo.isActive,
      timesUsed: promo.redemptions.length,
      usageLimit: promo.usageLimit,
      totalDiscountGiven,
      redemptions: promo.redemptions
    };
  }
}

module.exports = new PromoService();
