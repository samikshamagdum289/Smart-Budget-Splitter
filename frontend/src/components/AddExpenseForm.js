import React, { useState, useEffect } from 'react';
import { useExpense } from '../context/ExpenseContext';
import './AddExpenseForm.css';

const AddExpenseForm = ({ group, onClose, onExpenseAdded }) => {
  const { createExpense, loading, error, clearError } = useExpense();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'food',
    splitType: 'equal'
  });

  const categories = [
    { value: 'food', label: '🍕 Food' },
    { value: 'transport', label: '🚗 Transport' },
    { value: 'entertainment', label: '🎬 Entertainment' },
    { value: 'utilities', label: '💡 Utilities' },
    { value: 'shopping', label: '🛍️ Shopping' },
    { value: 'healthcare', label: '🏥 Healthcare' },
    { value: 'education', label: '📚 Education' },
    { value: 'other', label: '📦 Other' }
  ];

  useEffect(() => {
    clearError();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        groupId: group._id
      };

      await createExpense(expenseData);
      onExpenseAdded();
      onClose();
    } catch (err) {
      // Error handled by context
    }
  };

  return (
    <div className="add-expense-overlay">
      <div className="add-expense-modal">
        <div className="add-expense-header">
          <h2>Add New Expense</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="add-expense-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What was this expense for?"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount (₹)</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="splitType">Split Type</label>
            <select
              id="splitType"
              name="splitType"
              value={formData.splitType}
              onChange={handleChange}
            >
              <option value="equal">Equal Split</option>
              <option value="percentage">Percentage</option>
              <option value="custom">Custom Amounts</option>
            </select>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseForm;