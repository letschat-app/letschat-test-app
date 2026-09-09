import React, { useState } from "react";
import { loginUser } from "../service/UserAuth";
import { Link, useNavigate } from "react-router-dom";
import { initWebsocket } from "../service/Websocket";
function Login() {
  const [form, setForm] = useState({ userId: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrorMsg("");
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!form.userId || !form.password) {
      setErrorMsg("Please enter both User ID and Password.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(form);
      if (res.data === "login succesfull") {
        localStorage.setItem('userid', form.userId);
        initWebsocket();
        navigate("/chats", { replace: true });
      } else {
        setErrorMsg("Login failed. Incorrect credentials.");
      }
    } catch (e) {
      setErrorMsg("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={styles.wrapper}>
      <h1 style={styles.brandName}>LetsChat</h1>
      <div style={styles.glassCard}>
        <div style={styles.header}>
          <h2 style={styles.heading}>Welcome Back</h2>
          <p style={styles.subtitle}>Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>User ID</label>
            <input
              name="userId"
              placeholder="AAA000"
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          {errorMsg && <p style={styles.error}>{errorMsg}</p>}

          <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <p style={styles.linkText}>
          Don’t have an account? <Link to="/signin" style={styles.link}>Sign up here</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100%",
    background: "var(--bg-gradient)",
    color: "var(--text-primary)",
    fontFamily: "Inter, sans-serif",
    padding: "20px",
    boxSizing: "border-box"
  },
  brandName: {
    fontSize: "36px",
    fontWeight: "800",
    color: "var(--text-primary)",
    marginBottom: "30px",
    letterSpacing: "1px",
    textShadow: "0 2px 10px rgba(0,0,0,0.2)"
  },
  glassCard: {
    width: "100%",
    maxWidth: "420px",
    background: "var(--bg-card)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid var(--border-color)",
    borderRadius: "24px",
    padding: "40px 30px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
    display: "flex",
    flexDirection: "column",
    gap: "30px",
    boxSizing: "border-box"
  },
  header: {
    textAlign: "center"
  },
  heading: {
    margin: "0 0 10px 0",
    fontSize: "32px",
    fontWeight: "700",
    color: "var(--text-primary)"
  },
  subtitle: {
    margin: "0",
    fontSize: "14px",
    color: "var(--text-secondary)"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    fontSize: "15px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    color: "var(--text-primary)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box"
  },
  error: {
    margin: "0",
    fontSize: "13px",
    color: "var(--danger-color)",
    textAlign: "center",
    padding: "10px",
    background: "var(--bg-secondary)", // Neutral background to keep it sleek
    borderRadius: "8px",
    border: "1px solid var(--danger-color)"
  },
  button: {
    width: "100%",
    padding: "16px",
    background: "var(--accent-color)",
    color: "var(--text-primary)",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "transform 0.1s, opacity 0.2s",
    marginTop: "10px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
    boxSizing: "border-box"
  },
  linkText: {
    margin: "10px 0 0 0",
    textAlign: "center",
    fontSize: "14px",
    color: "var(--text-secondary)"
  },
  link: {
    color: "var(--accent-color)",
    textDecoration: "none",
    fontWeight: "600"
  }
};

export default Login;
