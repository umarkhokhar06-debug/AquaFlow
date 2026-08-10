const mongoose = require('mongoose');

// Non-salary operating expenses (SRS §16: "Admin can add non-salary
// expenses using configurable categories"). Category is free-text rather
// than a fixed enum so admin can define their own categories as needed.
const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Please provide an expense category'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Please provide an amount'],
    min: [0, 'Amount cannot be negative']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  date: {
    type: Date,
    default: Date.now
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
