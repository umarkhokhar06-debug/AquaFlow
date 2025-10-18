const SupportTicket = require('../models/SupportTicket');
const notificationService = require('./notificationService');

const supportService = {
  // Create a new support ticket
  createTicket: async (userId, ticketData) => {
    try {
      const { subject, description, category, priority } = ticketData;
      
      const ticket = new SupportTicket({
        user: userId,
        subject,
        description,
        category: category || 'general',
        priority: priority || 'medium'
      });

      await ticket.save();

      // Notify admins about new ticket
      // This would typically send notifications to admin users
      // For now, we'll just log it
      console.log(`New support ticket created: ${ticket.ticketNumber}`);

      return ticket;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  },

  // Get tickets for a user
  getUserTickets: async (userId, filters = {}) => {
    try {
      const { status, category, page = 1, limit = 10 } = filters;
      
      const query = { user: userId };
      if (status) query.status = status;
      if (category) query.category = category;

      const tickets = await SupportTicket.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('user', 'name email')
        .populate('assignedTo', 'name')
        .populate('resolvedBy', 'name');

      const totalTickets = await SupportTicket.countDocuments(query);

      return {
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTickets / limit),
          totalTickets
        }
      };
    } catch (error) {
      console.error('Error getting user tickets:', error);
      throw error;
    }
  },

  // Get ticket by ID
  getTicketById: async (ticketId, userId = null) => {
    try {
      const query = { _id: ticketId };
      if (userId) query.user = userId;

      const ticket = await SupportTicket.findOne(query)
        .populate('user', 'name email userType')
        .populate('assignedTo', 'name email')
        .populate('resolvedBy', 'name email')
        .populate('messages.sender', 'name userType');

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      return ticket;
    } catch (error) {
      console.error('Error getting ticket by ID:', error);
      throw error;
    }
  },

  // Add message to ticket
  addMessage: async (ticketId, senderId, message, isInternal = false) => {
    try {
      const ticket = await SupportTicket.findById(ticketId);
      
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      await ticket.addMessage(senderId, message, isInternal);

      // Notify the user about the new message if it's not internal
      if (!isInternal && ticket.user.toString() !== senderId.toString()) {
        await notificationService.createNotification(
          ticket.user,
          'Support Ticket Update',
          `New message on your ticket #${ticket.ticketNumber}`,
          'system_update',
          {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber
          },
          'medium'
        );
      }

      return ticket;
    } catch (error) {
      console.error('Error adding message to ticket:', error);
      throw error;
    }
  },

  // Update ticket status
  updateTicketStatus: async (ticketId, status, updatedBy) => {
    try {
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const ticket = await SupportTicket.findById(ticketId);
      
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      ticket.status = status;
      ticket.updatedAt = new Date();

      if (status === 'in_progress' && !ticket.assignedTo) {
        ticket.assignedTo = updatedBy;
      }

      await ticket.save();

      // Notify user about status change
      await notificationService.createNotification(
        ticket.user,
        'Support Ticket Status Update',
        `Your ticket #${ticket.ticketNumber} status has been updated to ${status}`,
        'system_update',
        {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          status
        },
        'medium'
      );

      return ticket;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  },

  // Resolve ticket
  resolveTicket: async (ticketId, resolvedBy, resolution) => {
    try {
      const ticket = await SupportTicket.findById(ticketId);
      
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      await ticket.resolve(resolvedBy, resolution);

      // Notify user about resolution
      await notificationService.createNotification(
        ticket.user,
        'Support Ticket Resolved',
        `Your ticket #${ticket.ticketNumber} has been resolved`,
        'system_update',
        {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          resolution
        },
        'medium'
      );

      return ticket;
    } catch (error) {
      console.error('Error resolving ticket:', error);
      throw error;
    }
  },

  // Assign ticket to support agent
  assignTicket: async (ticketId, assignedTo) => {
    try {
      const ticket = await SupportTicket.findByIdAndUpdate(
        ticketId,
        { 
          assignedTo,
          status: 'in_progress',
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Notify user about assignment
      await notificationService.createNotification(
        ticket.user,
        'Support Ticket Assigned',
        `Your ticket #${ticket.ticketNumber} has been assigned to a support agent`,
        'system_update',
        {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber
        },
        'medium'
      );

      return ticket;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw error;
    }
  },

  // Get ticket statistics
  getTicketStats: async (userId = null) => {
    try {
      const matchStage = userId ? { user: userId } : {};
      
      const stats = await SupportTicket.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: {
              $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
            },
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            },
            closed: {
              $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
            },
            byCategory: {
              $push: {
                category: '$category',
                status: '$status'
              }
            },
            byPriority: {
              $push: {
                priority: '$priority',
                status: '$status'
              }
            }
          }
        }
      ]);

      if (stats.length === 0) {
        return {
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
          byCategory: {},
          byPriority: {}
        };
      }

      const categoryStats = {};
      const priorityStats = {};

      stats[0].byCategory.forEach(item => {
        if (!categoryStats[item.category]) {
          categoryStats[item.category] = { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };
        }
        categoryStats[item.category].total++;
        categoryStats[item.category][item.status.replace('_', '')]++;
      });

      stats[0].byPriority.forEach(item => {
        if (!priorityStats[item.priority]) {
          priorityStats[item.priority] = { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };
        }
        priorityStats[item.priority].total++;
        priorityStats[item.priority][item.status.replace('_', '')]++;
      });

      return {
        total: stats[0].total,
        open: stats[0].open,
        inProgress: stats[0].inProgress,
        resolved: stats[0].resolved,
        closed: stats[0].closed,
        byCategory: categoryStats,
        byPriority: priorityStats
      };
    } catch (error) {
      console.error('Error getting ticket stats:', error);
      throw error;
    }
  },

  // Get frequently asked questions (could be expanded)
  getFAQs: async () => {
    try {
      // This is a simple implementation. In a real app, you might have a separate FAQ model
      const faqs = [
        {
          id: 1,
          question: 'How do I update my vehicle information?',
          answer: 'You can update your vehicle information in the Profile section of the app. Go to Vehicle Info and edit the details.',
          category: 'vehicle'
        },
        {
          id: 2,
          question: 'How are my earnings calculated?',
          answer: 'Your earnings are calculated based on the order value minus commission. You receive 80% of the order value.',
          category: 'payment'
        },
        {
          id: 3,
          question: 'How do I change my availability status?',
          answer: 'You can change your status (Online/Offline/Busy) using the status toggle in the main dashboard.',
          category: 'general'
        },
        {
          id: 4,
          question: 'What should I do if I cannot find the delivery address?',
          answer: 'Contact the customer using the phone number provided in the order details. If still unable to locate, contact support.',
          category: 'order_issue'
        },
        {
          id: 5,
          question: 'How do I report a technical issue?',
          answer: 'Use the Support section to create a ticket with category "Technical". Describe the issue in detail.',
          category: 'technical'
        }
      ];

      return faqs;
    } catch (error) {
      console.error('Error getting FAQs:', error);
      throw error;
    }
  }
};

module.exports = supportService;