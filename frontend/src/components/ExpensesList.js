import React from 'react';
import { useExpense } from '../context/ExpenseContext';
import './ExpensesList.css';

const ExpensesList = ({ group }) => {
  const { expenses, loading, deleteExpense } = useExpense();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      food: '🍕',
      transport: '🚗',
      entertainment: '🎬',
      utilities: '💡',
      shopping: '🛍️',
      healthcare: '🏥',
      education: '📚',
      other: '📦'
    };
    return icons[category] || '📦';
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(expenseId);
      } catch (err) {
        // Error handled by context
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading expenses...</div>;
  }

  if (expenses.length === 0) {
    return (
      <div className="no-expenses">
        <p>No expenses yet. Add your first expense to get started!</p>
      </div>
    );
  }

  return (
    <div className="expenses-list">
      <h3>Recent Expenses</h3>
      <div className="expenses-container">
        {expenses.map(expense => (
          <div key={expense._id} className="expense-card">
            <div className="expense-header">
              <div className="expense-category">
                <span className="category-icon">
                  {getCategoryIcon(expense.category)}
                </span>
                <span className="category-name">{expense.category}</span>
              </div>
              <div className="expense-amount">
                {formatAmount(expense.amount)}
              </div>
            </div>
            
            <div className="expense-description">
              {expense.description}
            </div>
            
            <div className="expense-details">
              <div className="expense-paid-by">
                Paid by: <strong>{expense.paidBy?.name || 'You'}</strong>
              </div>
              <div className="expense-date">
                {formatDate(expense.date)}
              </div>
            </div>

            <div className="expense-splits">
              <small>
                Split {expense.splitType} among {expense.splits?.length || 0} people
              </small>
            </div>

            <div className="expense-actions">
              <button 
                className="btn-delete"
                onClick={() => handleDelete(expense._id)}
                title="Delete expense"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpensesList;