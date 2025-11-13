import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard() {
  const { groupId } = useParams();
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/expenses/group/${groupId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        setGroupData(data);
      } catch (err) {
        console.error("Error fetching group data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroupData();
  }, [groupId]);

  if (loading) return <p>Loading...</p>;
  if (!groupData) return <p>No data available for this group.</p>;

  // Prepare chart data
  const memberNames = groupData.members.map(m => m.name);
  const memberExpenses = groupData.members.map(member => {
    // sum expenses by this member
    return groupData.expenses
      .filter(e => e.paidBy === member._id) // assuming each expense has `paidBy` field
      .reduce((sum, e) => sum + e.amount, 0);
  });

  const chartData = {
    labels: memberNames,
    datasets: [
      {
        label: 'Expenses per Member',
        data: memberExpenses,
        backgroundColor: 'rgba(75,192,192,0.6)'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: true, text: 'Member-wise Expense Breakdown' } }
  };

  return (
    <div className="dashboard">
      <h1>Dashboard: {groupData.groupName || "Group"}</h1>

      <h2>Members:</h2>
      <ul>{groupData.members?.map(m => <li key={m._id}>{m.name}</li>)}</ul>

      <h2>Expenses:</h2>
      <ul>{groupData.expenses?.map(e => <li key={e._id}>{e.description || "Expense"}: ${e.amount}</li>)}</ul>

      <h2>Summary:</h2>
      <p>Total Expenses: ${groupData.total.toFixed(2)}</p>

      <h2>Member Expense Chart:</h2>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}

export default Dashboard;
