const promoService = require('../services/promoService');

class PromoController {
  async createPromoCode(req, res) {
    try {
      const promo = await promoService.createPromoCode(req.body, req.user);
      res.status(201).json({ success: true, promo });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to create promo code'
      });
    }
  }

  async getAllPromoCodes(req, res) {
    try {
      const { page, limit, isActive } = req.query;
      const result = await promoService.getAllPromoCodes({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        isActive
      });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch promo codes'
      });
    }
  }

  async getPromoCodeById(req, res) {
    try {
      const promo = await promoService.getPromoCodeById(req.params.id);
      res.status(200).json({ success: true, promo });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch promo code'
      });
    }
  }

  async updatePromoCode(req, res) {
    try {
      const promo = await promoService.updatePromoCode(req.params.id, req.body, req.user);
      res.status(200).json({ success: true, promo });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to update promo code'
      });
    }
  }

  async deletePromoCode(req, res) {
    try {
      await promoService.deletePromoCode(req.params.id, req.user);
      res.status(200).json({ success: true, message: 'Promo code deleted' });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to delete promo code'
      });
    }
  }

  async getUsageReport(req, res) {
    try {
      const report = await promoService.getUsageReport(req.params.id);
      res.status(200).json({ success: true, report });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to build usage report'
      });
    }
  }

  // Customer-facing: preview the discount before actually placing the order
  async checkPromoCode(req, res) {
    try {
      const { orderAmount, itemTypes } = req.query;
      const result = await promoService.validateForCheckout(req.params.code, {
        customerId: req.user.id,
        orderAmount: Number(orderAmount) || 0,
        itemTypes: itemTypes ? itemTypes.split(',') : []
      });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to validate promo code'
      });
    }
  }
}

module.exports = new PromoController();
