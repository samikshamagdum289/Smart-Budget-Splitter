import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import Expense from '../models/Expense.js'; // Import the Expense model directly
import Group from '../models/Group.js'; // Import the Group model directly

const router = express.Router();

// Create a new expense
router.post('/', auth, async (req, res) => {
  try {
    console.log("💰 Creating new expense for user:", req.user.name);
    
    const { description, amount, category, groupId, splitType, splits } = req.body;
    
    // Validate required fields
    if (!description || !amount || !category || !groupId) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields: description, amount, category, groupId" 
      });
    }

    // Verify group exists and user is member
    const group = await Group.findOne({
      _id: groupId,
      $or: [
        { createdBy: req.user.id },
        { "members.userId": req.user.id }
      ]
    });
    
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: "Group not found or you are not a member" 
      });
    }

    const expenseData = {
      description,
      amount: parseFloat(amount),
      category,
      paidBy: req.user.id,
      group: groupId,
      splitType: splitType || 'equal'
    };

    // Handle splits - create equal splits for all group members by default
    if (splits && splits.length > 0) {
      expenseData.splits = splits;
    } else {
      // Create equal splits for all group members
      expenseData.splits = group.members.map(member => ({
        memberId: member._id,
        userId: member.userId,
        name: member.name,
        amount: parseFloat(amount) / group.members.length,
        percentage: (1 / group.members.length) * 100
      }));
    }

    const expense = new Expense(expenseData);
    await expense.save();
    
    // Populate the expense with user details
    await expense.populate('paidBy', 'name email');

    console.log("✅ Expense created successfully:", expense._id);
    
    res.status(201).json({
      success: true,
      message: "Expense created successfully",
      expense
    });
  } catch (error) {
    console.error('❌ Error creating expense:', error);
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get all expenses for a group
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log("📋 Fetching expenses for group:", groupId);
    
    // Verify user is member of the group
    const group = await Group.findOne({
      _id: groupId,
      $or: [
        { createdBy: req.user.id },
        { "members.userId": req.user.id }
      ]
    });
    
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: "Group not found or you are not a member" 
      });
    }

    const expenses = await Expense.find({ group: groupId })
      .populate('paidBy', 'name email')
      .sort({ date: -1 });

    console.log("✅ Found", expenses.length, "expenses");
    
    res.json({
      success: true,
      expenses,
      count: expenses.length
    });
  } catch (error) {
    console.error('❌ Error fetching expenses:', error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching expenses" 
    });
  }
});

// Get expense by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name email')
      .populate('group', 'name');

    if (!expense) {
      return res.status(404).json({ 
        success: false,
        message: "Expense not found" 
      });
    }

    // Verify user is member of the group
    const group = await Group.findOne({
      _id: expense.group._id,
      $or: [
        { createdBy: req.user.id },
        { "members.userId": req.user.id }
      ]
    });

    if (!group) {
      return res.status(403).json({ 
        success: false,
        message: "Access denied - not a member of this group" 
      });
    }

    res.json({
      success: true,
      expense
    });
  } catch (error) {
    console.error('❌ Error fetching expense:', error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Update expense
router.put('/:id', auth, async (req, res) => {
  try {
    const { description, amount, category, splitType, splits } = req.body;
    
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ 
        success: false,
        message: "Expense not found" 
      });
    }

    // Verify user is the one who paid
    if (expense.paidBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: "Only the person who paid can update this expense" 
      });
    }

    expense.description = description || expense.description;
    expense.amount = amount || expense.amount;
    expense.category = category || expense.category;
    expense.splitType = splitType || expense.splitType;
    
    if (splits) {
      expense.splits = splits;
    }

    await expense.save();
    await expense.populate('paidBy', 'name email');

    console.log("✅ Expense updated successfully:", expense._id);
    
    res.json({
      success: true,
      message: "Expense updated successfully",
      expense
    });
  } catch (error) {
    console.error('❌ Error updating expense:', error);
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ 
        success: false,
        message: "Expense not found" 
      });
    }

    // Verify user is the one who paid
    if (expense.paidBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: "Only the person who paid can delete this expense" 
      });
    }

    await Expense.findByIdAndDelete(req.params.id);
    
    console.log("✅ Expense deleted successfully:", req.params.id);
    
    res.json({ 
      success: true,
      message: "Expense deleted successfully" 
    });
  } catch (error) {
    console.error('❌ Error deleting expense:', error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

// Get expense summary for a group
router.get('/summary/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log("📊 Generating expense summary for group:", groupId);
    
    const group = await Group.findOne({
      _id: groupId,
      $or: [
        { createdBy: req.user.id },
        { "members.userId": req.user.id }
      ]
    });
    
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: "Group not found or you are not a member" 
      });
    }

    const expenses = await Expense.find({ group: groupId })
      .populate('paidBy', 'name email');

    // Calculate balances - handle both registered users and non-users
    const balances = {};
    
    // Initialize balances for all members
    group.members.forEach(member => {
      const key = member.userId ? member.userId.toString() : member._id.toString();
      balances[key] = {
        member: member,
        totalPaid: 0,
        totalOwed: 0,
        balance: 0
      };
    });

    // Also include the group creator if not in members
    const creatorKey = group.createdBy.toString();
    if (!balances[creatorKey]) {
      balances[creatorKey] = {
        member: {
          _id: group.createdBy,
          userId: group.createdBy,
          name: req.user.name, // Current user is the creator
          type: 'user'
        },
        totalPaid: 0,
        totalOwed: 0,
        balance: 0
      };
    }

    expenses.forEach(expense => {
      // Add to paid amount (only for registered users who paid)
      const paidByKey = expense.paidBy._id.toString();
      if (balances[paidByKey]) {
        balances[paidByKey].totalPaid += expense.amount;
      }
      
      // Add to owed amounts for all split members
      expense.splits.forEach(split => {
        const splitKey = split.userId ? split.userId.toString() : split.memberId.toString();
        if (balances[splitKey]) {
          balances[splitKey].totalOwed += split.amount;
        }
      });
    });

    // Calculate final balances
    Object.keys(balances).forEach(key => {
      balances[key].balance = balances[key].totalOwed - balances[key].totalPaid;
    });

    const summary = {
      success: true,
      totalExpenses: expenses.reduce((total, expense) => total + expense.amount, 0),
      memberCount: group.members.length + 1, // +1 for creator
      expenseCount: expenses.length,
      balances: Object.values(balances)
    };

    console.log("✅ Expense summary generated for group:", groupId);
    
    res.json(summary);
  } catch (error) {
    console.error('❌ Error fetching expense summary:', error);
    res.status(500).json({ 
      success: false,
      message: "Server error while generating summary" 
    });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Expenses route is working!' 
  });
});

export default router;