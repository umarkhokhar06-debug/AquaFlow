const supportService = require('../services/supportService');
const searchService = require('../services/searchService');
const aiSupportService = require('../services/aiSupportService');
const orderService = require('../services/orderService');
const auditLogService = require('../services/auditLogService');
const User = require('../models/User');

const STAFF_TICKET_ROLES = ['admin', 'super_admin', 'call_center_agent'];

class SupportController {
  async createTicket(req, res) {
    try {
      const ticket = await supportService.createTicket(req.user.id, req.body);
      res.status(201).json({ success: true, ticket });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to create ticket' });
    }
  }

  async getMyTickets(req, res) {
    try {
      const result = await supportService.getUserTickets(req.user.id, req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch tickets' });
    }
  }

  async getAllTickets(req, res) {
    try {
      const result = await supportService.getAllTickets(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch tickets' });
    }
  }

  async getTicketById(req, res) {
    try {
      const isStaff = STAFF_TICKET_ROLES.includes(req.user.userType) || req.user.userType === 'technician';
      const ticket = await supportService.getTicketById(req.params.id, isStaff ? null : req.user.id);
      res.status(200).json({ success: true, ticket });
    } catch (error) {
      res.status(error.status || (error.message === 'Ticket not found' ? 404 : 500)).json({ success: false, message: error.message || 'Failed to fetch ticket' });
    }
  }

  async addMessage(req, res) {
    try {
      const isStaff = STAFF_TICKET_ROLES.includes(req.user.userType) || req.user.userType === 'technician';
      const { message, isInternal } = req.body;
      const ticket = await supportService.addMessage(req.params.id, req.user.id, message, isStaff && !!isInternal);
      res.status(200).json({ success: true, ticket });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to add message' });
    }
  }

  async updateStatus(req, res) {
    try {
      const ticket = await supportService.updateTicketStatus(req.params.id, req.body.status, req.user.id);
      res.status(200).json({ success: true, ticket });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to update status' });
    }
  }

  async resolveTicket(req, res) {
    try {
      const ticket = await supportService.resolveTicket(req.params.id, req.user.id, req.body.resolution, req.user);
      res.status(200).json({ success: true, ticket });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to resolve ticket' });
    }
  }

  async assignTicket(req, res) {
    try {
      const ticket = await supportService.assignTicket(req.params.id, req.body.assignedTo || req.user.id);
      res.status(200).json({ success: true, ticket });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to assign ticket' });
    }
  }

  async assignTechnician(req, res) {
    try {
      const ticket = await supportService.assignTechnician(req.params.id, req.user);
      res.status(200).json({ success: true, ticket });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to assign technician' });
    }
  }

  async getStats(req, res) {
    try {
      const stats = await supportService.getTicketStats();
      res.status(200).json({ success: true, stats });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch stats' });
    }
  }

  async getFAQs(req, res) {
    try {
      const faqs = await supportService.getFAQs();
      res.status(200).json({ success: true, faqs });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch FAQs' });
    }
  }

  async search(req, res) {
    try {
      const results = await searchService.globalSearch(req.query.q);
      res.status(200).json({ success: true, results });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Search failed' });
    }
  }

  async troubleshoot(req, res) {
    try {
      const { context } = req.body;
      if (!context) {
        return res.status(400).json({ success: false, message: 'context is required' });
      }
      const guidance = await aiSupportService.troubleshoot(context);
      res.status(200).json({ success: true, guidance });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'AI troubleshooting failed' });
    }
  }

  async parseOrderIntent(req, res) {
    try {
      const { description } = req.body;
      if (!description) {
        return res.status(400).json({ success: false, message: 'description is required' });
      }
      const intent = await aiSupportService.parseOrderIntent(description);
      res.status(200).json({ success: true, intent });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'AI order-intent parsing failed' });
    }
  }

  // Places the order through the exact same orderService.createOrder() the
  // customer app uses (SRS §7: "must follow the same pricing, availability
  // and payment rules as the customer app") -- this endpoint's only job is
  // to let an agent act on a specific customer's behalf, nothing about
  // pricing/availability is reimplemented here.
  async placeOrderForCustomer(req, res) {
    try {
      const { customerId, items, deliveryAddress, paymentMethod, deliveryType, scheduledFor, notes } = req.body;
      if (!customerId || !items || !items.length) {
        return res.status(400).json({ success: false, message: 'customerId and items are required' });
      }

      const customer = await User.findById(customerId);
      if (!customer || customer.userType !== 'customer') {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const result = await orderService.createOrder(customerId, {
        items,
        // Merge over the customer's saved address rather than replacing it
        // wholesale -- an agent typically only supplies what changed (e.g.
        // GPS coordinates read off a map), not the customer's full profile.
        deliveryAddress: {
          fullName: customer.fullName,
          houseNumber: customer.houseNumber,
          portion: customer.portion,
          address: customer.address,
          phoneNumber: customer.phoneNumber,
          ...(deliveryAddress || {})
        },
        paymentMethod: paymentMethod || 'cash',
        deliveryType,
        scheduledFor,
        notes
      });

      await auditLogService.record({
        action: 'AI_ASSISTED_ORDER_PLACED',
        actorUser: req.user,
        targetUser: customer,
        changes: { orderNumber: result.order.orderNumber, items }
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 400).json({ success: false, message: error.message || 'Failed to place order' });
    }
  }
}

module.exports = new SupportController();
