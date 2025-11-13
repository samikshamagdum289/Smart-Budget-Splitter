import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ExpenseProvider } from "./context/ExpenseContext";
import Home from "./Home";
import GroupManagement from "./GroupManagement";
import Dashboard from "./components/Dashboard"; // <-- import your Dashboard
import "./App.css";

function App() {
  const token = localStorage.getItem("token");

  return (
    <Router>
      <AuthProvider>
        <ExpenseProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Protected GroupManagement page */}
            <Route
              path="/groups"
              element={token ? <GroupManagement /> : <Navigate to="/" />}
            />

            {/* Protected Dashboard page for a specific group */}
            <Route
              path="/dashboard/:groupId"
              element={token ? <Dashboard /> : <Navigate to="/" />}
            />
          </Routes>
        </ExpenseProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
