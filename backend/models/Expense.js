import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'shopping', 'healthcare', 'education', 'other']
  },
  date: {
    type: Date,
    default: Date.now
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  splitType: {
    type: String,
    enum: ['equal', 'percentage', 'custom'],
    default: 'equal'
  },
  splits: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    name: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true, 
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Calculate equal splits automatically
expenseSchema.pre('save', function(next) {
  if (this.splitType === 'equal' && this.splits.length > 0) {
    const equalAmount = this.amount / this.splits.length;
    this.splits.forEach(split => {
      split.amount = parseFloat(equalAmount.toFixed(2));
    });
  }
  
  next();
});

export default mongoose.model('Expense', expenseSchema);