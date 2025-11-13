import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';

const ExpenseContext = createContext();

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
};

export const ExpenseProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Get all expenses for a group
  const getExpenses = async (groupId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/expenses/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(response.data.expenses || []);
      setError(null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch expenses';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Create new expense
  const createExpense = async (expenseData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/expenses`, expenseData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(prev => [response.data.expense, ...prev]);
      setError(null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create expense';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Update expense
  const updateExpense = async (id, expenseData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/expenses/${id}`, expenseData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(prev => prev.map(exp => 
        exp._id === id ? response.data.expense : exp
      ));
      setError(null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update expense';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Delete expense
  const deleteExpense = async (id) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(prev => prev.filter(exp => exp._id !== id));
      setError(null);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete expense';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Get expense summary
  const getExpenseSummary = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/expenses/summary/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch expense summary';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const clearError = () => setError(null);

  const value = {
    expenses,
    loading,
    error,
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpenseSummary,
    clearError
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
};