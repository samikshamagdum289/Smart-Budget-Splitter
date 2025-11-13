import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ import
import "./Home.css";

function Home() {
  const navigate = useNavigate(); // ✅ add navigate
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  const endpoint = isLogin 
    ? "http://localhost:5000/api/auth/login" 
    : "http://localhost:5000/api/auth/signup";

  const bodyData = isLogin
    ? { email: formData.email, password: formData.password } // only send email & password
    : formData;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyData),
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    navigate("/groups");
  } else {
    alert(data.message || "Something went wrong");
  }
}


  return (
    <div className="homepage">
      {/* Decorative Icons */}
      <div className="decorative-icon cash"></div>
      <div className="decorative-icon burger"></div>
      <div className="decorative-icon wallet"></div>
      <div className="decorative-icon coins"></div>

      {/* Hero Section */}
      <div className="hero">
        <h1>Track Expenses, Split Bills & Manage Your Money</h1>
        <p style={{ marginTop: "20px", fontSize: "0.9rem", opacity: "0.7" }}>
          Easily monitor your spending, share costs with friends and stay in control of your finances—all in one place.
        </p>
      </div>

      {/* Auth Section */}
      <div className="auth-container">
        <div className="tabs">
          <button onClick={() => setIsLogin(true)} className={isLogin ? "active" : ""}>Login</button>
          <button onClick={() => setIsLogin(false)} className={!isLogin ? "active" : ""}>Signup</button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit">{isLogin ? "Login" : "Signup"}</button>
        </form>
      </div>
    </div>
  );
}

export default Home;
