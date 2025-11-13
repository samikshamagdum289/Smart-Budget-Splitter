import React, { useState, useEffect } from 'react';
import { useExpense } from '../context/ExpenseContext';
import './ExpenseSummary.css';

const ExpenseSummary = ({ group }) => {
  const { getExpenseSummary, loading } = useExpense();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadSummary();
  }, [group]);

  const loadSummary = async () => {
    try {
      const data = await getExpenseSummary(group._id);
      setSummary(data);
    } catch (err) {
      // Error handled by context
    }
  };

  const formatAmount = (amount) => {
    return `₹${Math.abs(parseFloat(amount)).toFixed(2)}`;
  };

  const getBalanceClass = (balance) => {
    if (balance > 0) return 'positive';
    if (balance < 0) return 'negative';
    return 'zero';
  };

  if (loading || !summary) {
    return <div className="loading">Loading summary...</div>;
  }

  return (
    <div className="expense-summary">
      <h3>Expense Summary</h3>
      
      <div className="summary-cards">
        <div className="summary-card total-expenses">
          <h4>Total Expenses</h4>
          <div className="amount">{formatAmount(summary.totalExpenses)}</div>
        </div>
        
        <div className="summary-card total-expenses-count">
          <h4>Number of Expenses</h4>
          <div className="amount">{summary.expenseCount}</div>
        </div>
        
        <div className="summary-card group-members">
          <h4>Group Members</h4>
          <div className="amount">{summary.memberCount}</div>
        </div>
      </div>

      <div className="balances-section">
        <h4>Balances</h4>
        <div className="balances-list">
          {summary.balances.map((balance, index) => (
            <div key={index} className="balance-item">
              <div className="member-info">
                <span className="member-name">
                  {balance.member.name}
                  {balance.member._id === group.createdBy && ' (You)'}
                </span>
              </div>
              <div className={`balance-amount ${getBalanceClass(balance.balance)}`}>
                {balance.balance > 0 ? `Owes ${formatAmount(balance.balance)}` :
                 balance.balance < 0 ? `Gets back ${formatAmount(-balance.balance)}` :
                 'Settled Up'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpenseSummary;