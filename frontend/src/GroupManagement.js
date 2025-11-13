import { useState, useEffect, useCallback } from "react";
import { useExpense } from "./context/ExpenseContext";
import "./GroupManagement.css";

function GroupManagement() {
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  // Modal states
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [selectedGroupToDelete, setSelectedGroupToDelete] = useState(null);
  const [selectedMemberToRemove, setSelectedMemberToRemove] = useState(null);
  const [selectedGroupForMember, setSelectedGroupForMember] = useState(null);

  // ✅ Expense Tracking States
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedGroupForExpense, setSelectedGroupForExpense] = useState(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [expenseSummary, setExpenseSummary] = useState(null);

  // ✅ Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "food",
    splitType: "equal"
  });

  // Get expense context
  const { 
    expenses, 
    loading: expensesLoading, 
    createExpense, 
    getExpenses, 
    getExpenseSummary,
    deleteExpense 
  } = useExpense();

  // Get token from localStorage
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    };
  }, []);

  // Enhanced Toast notification function
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts(prev => [...prev, toast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Fetch all groups function
  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("Please login first", "error");
        return;
      }

      const res = await fetch("http://localhost:5000/api/groups", {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      
      if (res.ok) {
        setGroups(data);
        console.log("✅ Groups fetched:", data);
      } else {
        console.error("Failed to fetch groups:", data.message);
        showToast(data.message || "Failed to fetch groups", "error");
        
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/";
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      showToast("Error connecting to server", "error");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  // ✅ Fetch expenses for a group
  const fetchGroupExpenses = async (groupId) => {
    try {
      await getExpenses(groupId);
    } catch (err) {
      console.error("Error fetching expenses:", err);
      showToast("Error loading expenses", "error");
    }
  };

  // ✅ Calculate total expenses for a group
  const getTotalExpensesForGroup = (groupId) => {
    const groupExpenses = expenses.filter(expense => expense.group === groupId);
    return groupExpenses.reduce((total, expense) => total + expense.amount, 0);
  };

  // ✅ Get expense count for a group
  const getExpenseCountForGroup = (groupId) => {
    return expenses.filter(expense => expense.group === groupId).length;
  };

  // ✅ Open expense modal
  const openExpenseModal = async (group) => {
    setSelectedGroupForExpense(group);
    setExpenseForm({
      description: "",
      amount: "",
      category: "food",
      splitType: "equal"
    });
    
    // Load expenses for this group
    await fetchGroupExpenses(group._id);
    setShowExpenseModal(true);
  };

  // ✅ Add expense
  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      showToast("Please fill all required fields!", "error");
      return;
    }

    try {
      const expenseData = {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        groupId: selectedGroupForExpense._id
      };

      await createExpense(expenseData);
      setShowExpenseModal(false);
      showToast("💰 Expense added successfully!", "success");
      
      // Refresh expenses for the group
      await fetchGroupExpenses(selectedGroupForExpense._id);
    } catch (err) {
      // Error handled by context
    }
  };

  // ✅ Open settlement modal
  const openSettlementModal = async (group) => {
    setSelectedGroupForExpense(group);
    try {
      const summary = await getExpenseSummary(group._id);
      setExpenseSummary(summary);
      setShowSettlementModal(true);
    } catch (err) {
      showToast("Error loading settlement data", "error");
    }
  };

  // ✅ Delete expense
  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteExpense(expenseId);
        showToast("Expense deleted successfully", "success");
      } catch (err) {
        // Error handled by context
      }
    }
  };

  // Fetch groups on component mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Create new group
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showToast("Group name is required!", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/groups/create", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: groupName }),
      });

      const data = await res.json();
      if (res.ok) {
        setGroupName("");
        showToast("🎉 Group created successfully!", "success");
        await fetchGroups();
      } else {
        showToast(data.message || "Error creating group", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error creating group", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete group with modal
  const confirmDeleteGroup = (groupId) => {
    const group = groups.find(g => g._id === groupId);
    setSelectedGroupToDelete(group);
    setShowDeleteGroupModal(true);
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupToDelete) return;

    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${selectedGroupToDelete._id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("🗑️ Group deleted successfully!", "success");
        await fetchGroups();
      } else {
        showToast(data.message || "Error deleting group", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Error deleting group", "error");
    } finally {
      setIsLoading(false);
      setShowDeleteGroupModal(false);
      setSelectedGroupToDelete(null);
    }
  };

  // Remove member with modal
  const confirmRemoveMember = (groupId, memberId) => {
    const group = groups.find(g => g._id === groupId);
    const member = group.members.find(m => getMemberId(m) === memberId);
    setSelectedMemberToRemove(member);
    setSelectedGroupForMember(group);
    setShowRemoveMemberModal(true);
  };

  const handleRemoveMember = async () => {
    if (!selectedMemberToRemove || !selectedGroupForMember) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/groups/${selectedGroupForMember._id}/members/${getMemberId(selectedMemberToRemove)}`,
        { 
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();
      if (res.ok) {
        showToast("👤 Member removed successfully!", "success");
        await fetchGroups();
      } else {
        showToast(data.message || "Error removing member", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error removing member", "error");
    } finally {
      setIsLoading(false);
      setShowRemoveMemberModal(false);
      setSelectedMemberToRemove(null);
      setSelectedGroupForMember(null);
    }
  };

  // Add member to group
  const handleAddMember = async (groupId) => {
    if (!memberName.trim()) {
      showToast("Member name is required!", "error");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔄 Adding member:", memberName, "to group:", groupId);
      
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/add-member`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          memberName: memberName.trim()
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        console.log("✅ Member added successfully:", data);
        setMemberName("");
        setSelectedGroup(null);
        showToast("👥 Friend added successfully!", "success");
        await fetchGroups();
      } else {
        console.log("❌ Backend error:", data);
        showToast(data.message || `Failed to add member`, "error");
      }
    } catch (err) {
      console.error("🚨 Network error:", err);
      showToast("Error connecting to server", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e, callback, param = null) => {
    if (e.key === 'Enter' && !isLoading) {
      if (param) {
        callback(param);
      } else {
        callback();
      }
    }
  };

  // Helper function to get member display name
  const getMemberDisplayName = (member) => {
    if (member.name) {
      return member.name;
    }
    if (member.userId && typeof member.userId === 'object' && member.userId.name) {
      return member.userId.name;
    }
    if (typeof member === 'string') {
      return member;
    }
    return 'Unknown Member';
  };

  // Helper function to get member ID
  const getMemberId = (member) => {
    if (member._id) {
      return member._id;
    }
    if (member.userId && typeof member.userId === 'object' && member.userId._id) {
      return member.userId._id;
    }
    if (member.userId && typeof member.userId === 'string') {
      return member.userId;
    }
    if (typeof member === 'string') {
      return member;
    }
    return member.userId || 'unknown';
  };

  // Check if member is the group owner (user)
  const isGroupOwner = (member, group) => {
    if (member.userId && typeof member.userId === 'object') {
      return member.userId._id === group.createdBy;
    }
    return false;
  };

  // Calculate total members across all groups
  const totalMembers = groups.reduce((total, group) => total + (group.members?.length || 0), 0);

  // ✅ Calculate total expenses across all groups
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);

  // ✅ Expense categories with icons
  const expenseCategories = [
    { value: "food", label: "🍕 Food & Dining" },
    { value: "transport", label: "🚗 Transportation" },
    { value: "entertainment", label: "🎬 Entertainment" },
    { value: "shopping", label: "🛍️ Shopping" },
    { value: "utilities", label: "💡 Utilities" },
    { value: "healthcare", label: "🏥 Healthcare" },
    { value: "education", label: "📚 Education" },
    { value: "other", label: "📦 Other" }
  ];

  // ✅ Format amount
  const formatAmount = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  // ✅ Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      food: "🍕",
      transport: "🚗",
      entertainment: "🎬",
      shopping: "🛍️",
      utilities: "💡",
      healthcare: "🏥",
      education: "📚",
      other: "📦"
    };
    return icons[category] || "📦";
  };

  return (
    <div className="group-management">
      {/* Enhanced Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type} slide-in`}>
            <div className="toast-icon">
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'info' && 'ℹ️'}
            </div>
            <div className="toast-message">{toast.message}</div>
          </div>
        ))}
      </div>

      {/* Delete Group Modal */}
      {showDeleteGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-icon">🗑️</div>
            <h3>Delete Group</h3>
            <p>
              Are you sure you want to delete <strong>"{selectedGroupToDelete?.name}"</strong>? 
              This action cannot be undone and all group data will be permanently lost.
            </p>
            <div className="modal-actions">
              <button 
                className="modal-btn modal-btn-cancel"
                onClick={() => {
                  setShowDeleteGroupModal(false);
                  setSelectedGroupToDelete(null);
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                className="modal-btn modal-btn-danger"
                onClick={handleDeleteGroup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="btn-loading">
                    <div className="btn-spinner"></div>
                    Deleting...
                  </span>
                ) : (
                  <>
                    <span className="btn-icon">🗑️</span>
                    Delete Group
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Modal */}
      {showRemoveMemberModal && (
        <div className="modal-overlay">
          <div className="modal-content remove-member-modal">
            <div className="modal-icon">👤</div>
            <h3>Remove Member</h3>
            <p>
              Are you sure you want to remove <strong>"{getMemberDisplayName(selectedMemberToRemove)}"</strong> from 
              the group <strong>"{selectedGroupForMember?.name}"</strong>?
            </p>
            <div className="modal-actions">
              <button 
                className="modal-btn modal-btn-cancel"
                onClick={() => {
                  setShowRemoveMemberModal(false);
                  setSelectedMemberToRemove(null);
                  setSelectedGroupForMember(null);
                }}
                disabled={isLoading}
              >
                Keep Member
              </button>
              <button 
                className="modal-btn modal-btn-warning"
                onClick={handleRemoveMember}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="btn-loading">
                    <div className="btn-spinner"></div>
                    Removing...
                  </span>
                ) : (
                  <>
                    <span className="btn-icon">👤</span>
                    Remove Member
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Add Expense Modal */}
      {showExpenseModal && selectedGroupForExpense && (
        <div className="modal-overlay">
          <div className="modal-content expense-modal">
            <div className="modal-icon">💰</div>
            <h3>Add Expense</h3>
            <p>Add a new expense to <strong>"{selectedGroupForExpense.name}"</strong></p>
            
            <div className="expense-form">
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  placeholder="What was this expense for?"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({...prev, description: e.target.value}))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({...prev, amount: e.target.value}))}
                  className="form-input"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm(prev => ({...prev, category: e.target.value}))}
                  className="form-select"
                >
                  {expenseCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Split Type</label>
                <select
                  value={expenseForm.splitType}
                  onChange={(e) => setExpenseForm(prev => ({...prev, splitType: e.target.value}))}
                  className="form-select"
                >
                  <option value="equal">Equal Split</option>
                  <option value="percentage">Percentage</option>
                  <option value="custom">Custom Amounts</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowExpenseModal(false)}
                disabled={expensesLoading}
              >
                Cancel
              </button>
              <button 
                className="modal-btn modal-btn-success"
                onClick={handleAddExpense}
                disabled={expensesLoading}
              >
                {expensesLoading ? (
                  <span className="btn-loading">
                    <div className="btn-spinner"></div>
                    Adding...
                  </span>
                ) : (
                  <>
                    <span className="btn-icon">💰</span>
                    Add Expense
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Settlement Modal */}
      {showSettlementModal && selectedGroupForExpense && expenseSummary && (
        <div className="modal-overlay">
          <div className="modal-content settlement-modal">
            <div className="modal-icon">💸</div>
            <h3>Expense Settlements</h3>
            <p>Who needs to pay whom in <strong>"{selectedGroupForExpense.name}"</strong></p>
            
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="stat-label">Total Expenses</span>
                <span className="stat-value">{formatAmount(expenseSummary.totalExpenses)}</span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Expense Count</span>
                <span className="stat-value">{expenseSummary.expenseCount}</span>
              </div>
            </div>

            <div className="settlements-list">
              {expenseSummary.balances && expenseSummary.balances.length > 0 ? (
                expenseSummary.balances.map((balance, index) => (
                  <div key={index} className="balance-item">
                    <div className="member-balance">
                      <span className="member-name">
                        {balance.member.name}
                        {balance.member._id === selectedGroupForExpense.createdBy && ' (You)'}
                      </span>
                      <div className={`balance-amount ${balance.balance > 0 ? 'owes' : balance.balance < 0 ? 'gets' : 'settled'}`}>
                        {balance.balance > 0 ? `Owes ${formatAmount(balance.balance)}` :
                         balance.balance < 0 ? `Gets back ${formatAmount(-balance.balance)}` :
                         'Settled Up'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-settlements">
                  <div className="no-settlements-icon">🎉</div>
                  <p>All settled up! No payments needed.</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="modal-btn modal-btn-primary"
                onClick={() => setShowSettlementModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="header-section">
        <div className="header-content">
          <h1 className="main-title">Smart Budget Splitter</h1>
          <p className="subtitle">Create groups, track expenses, and split bills effortlessly</p>
          
          {/* Stats Cards */}
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-number">{groups.length}</div>
              <div className="stat-label">Total Groups</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{totalMembers}</div>
              <div className="stat-label">Total Members</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{formatAmount(totalExpenses)}</div>
              <div className="stat-label">Total Expenses</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{expenses.length}</div>
              <div className="stat-label">Expenses Tracked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Create Group Card */}
        <div className="create-group-card">
          <div className="card-header">
            <h2>Create New Group</h2>
            <div className="header-icon">🏠</div>
          </div>
          <div className="card-body">
            <div className="input-group">
              <input
                type="text"
                placeholder="Enter group name (e.g., Roommates, Trip to Goa)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleCreateGroup)}
                className="create-group-input"
                disabled={isLoading}
              />
              <button 
                onClick={handleCreateGroup} 
                className="create-group-btn"
                disabled={isLoading || !groupName.trim()}
              >
                {isLoading ? (
                  <span className="btn-loading">
                    <div className="btn-spinner"></div>
                    Creating...
                  </span>
                ) : (
                  <>
                    <span className="btn-icon">➕</span>
                    Create Group
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <p>Updating your groups...</p>
            </div>
          </div>
        )}

        {/* Groups List */}
        {groups.length === 0 && !isLoading ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No Groups Yet</h3>
            <p>Create your first group to start splitting expenses with friends!</p>
            <div className="empty-features">
              <div className="feature">
                <span className="feature-icon">💰</span>
                <span>Track expenses</span>
              </div>
              <div className="feature">
                <span className="feature-icon">📊</span>
                <span>Auto-split bills</span>
              </div>
              <div className="feature">
                <span className="feature-icon">💸</span>
                <span>Calculate settlements</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => (
              <div key={group._id} className="group-card">
                <div className="group-card-header">
                  <div className="group-info">
                    <h3 className="group-name">{group.name}</h3>
                    <span className="member-count">
                      {group.members?.length || 0} {group.members?.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  <div className="group-actions">
                    <button
                      onClick={() => confirmDeleteGroup(group._id)}
                      className="delete-group-btn"
                      disabled={isLoading}
                      title="Delete Group"
                    >
                      <span className="btn-icon">🗑️</span>
                    </button>
                  </div>
                </div>

                {/* ✅ Expense Summary */}
                <div className="expense-summary">
                  <div className="expense-stats">
                    <div className="expense-stat">
                      <span className="stat-label">Total Spent</span>
                      <span className="stat-value">{formatAmount(getTotalExpensesForGroup(group._id))}</span>
                    </div>
                    <div className="expense-stat">
                      <span className="stat-label">Expenses</span>
                      <span className="stat-value">{getExpenseCountForGroup(group._id)}</span>
                    </div>
                  </div>
                </div>

                {/* ✅ Recent Expenses */}
                {getExpenseCountForGroup(group._id) > 0 && (
                  <div className="recent-expenses">
                    <h4 className="section-title">Recent Expenses</h4>
                    <div className="expenses-list">
                      {expenses
                        .filter(expense => expense.group === group._id)
                        .slice(0, 3)
                        .map(expense => (
                          <div key={expense._id} className="expense-item">
                            <div className="expense-icon">
                              {getCategoryIcon(expense.category)}
                            </div>
                            <div className="expense-details">
                              <div className="expense-description">{expense.description}</div>
                              <div className="expense-meta">
                                <span className="expense-amount">{formatAmount(expense.amount)}</span>
                                <span className="expense-date">
                                  {new Date(expense.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteExpense(expense._id)}
                              className="delete-expense-btn"
                              title="Delete Expense"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Members List */}
                <div className="members-section">
                  <h4 className="section-title">Members</h4>
                  <div className="members-grid">
                    {group.members && group.members.length > 0 ? (
                      group.members.map((member) => (
                        <div key={getMemberId(member)} className="member-card">
                          <div className="member-avatar">
                            {getMemberDisplayName(member).charAt(0).toUpperCase()}
                          </div>
                          <div className="member-info">
                            <span className="member-name">
                              {getMemberDisplayName(member)}
                              {isGroupOwner(member, group) && (
                                <span className="owner-badge" title="Group Owner">👑</span>
                              )}
                            </span>
                            <span className="member-type">
                              {member.userId ? 'User' : 'Friend'}
                            </span>
                          </div>
                          {/* Don't allow removing yourself (the owner) */}
                          {!isGroupOwner(member, group) && (
                            <button
                              onClick={() => confirmRemoveMember(group._id, getMemberId(member))}
                              className="remove-member-btn"
                              disabled={isLoading}
                              title="Remove Member"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="no-members-card">
                        <div className="no-members-icon">👤</div>
                        <p>No members yet</p>
                        <small>Add your friends to get started!</small>
                      </div>
                    )}
                  </div>
                </div>

                {/* ✅ Expense Actions */}
                <div className="expense-actions">
                  <button
                    onClick={() => openExpenseModal(group)}
                    className="expense-action-btn primary"
                    disabled={isLoading}
                  >
                    <span className="btn-icon">💰</span>
                    Add Expense
                  </button>
                  <button
                    onClick={() => openSettlementModal(group)}
                    className="expense-action-btn secondary"
                    disabled={isLoading || getExpenseCountForGroup(group._id) === 0}
                  >
                    <span className="btn-icon">💸</span>
                    View Settlements
                  </button>
                </div>

                {/* Add Member Section */}
                <div className="add-member-section">
                  {selectedGroup === group._id ? (
                    <div className="add-member-form">
                      <div className="input-with-icon">
                        <span className="input-icon">👤</span>
                        <input
                          type="text"
                          placeholder="Enter friend's name (e.g., John, Priya, Rohan)"
                          value={memberName}
                          onChange={(e) => setMemberName(e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, handleAddMember, group._id)}
                          className="add-member-input"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="form-actions">
                        <button
                          onClick={() => handleAddMember(group._id)}
                          className="add-member-btn"
                          disabled={isLoading || !memberName.trim()}
                        >
                          {isLoading ? (
                            <span className="btn-loading">
                              <div className="btn-spinner"></div>
                              Adding...
                            </span>
                          ) : (
                            <>
                              <span className="btn-icon">➕</span>
                              Add Friend
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedGroup(null);
                            setMemberName("");
                          }}
                          className="cancel-btn"
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedGroup(group._id)}
                      className="toggle-add-member-btn"
                      disabled={isLoading}
                    >
                      <span className="btn-icon">👥</span>
                      Add Friend to Group
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupManagement;