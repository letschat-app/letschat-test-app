import React, { useState, useEffect, useRef } from "react";
import { registerUser } from "../service/UserAuth";
import { Link, useNavigate } from "react-router-dom";
import { initWebsocket } from "../service/Websocket";
import { motion, AnimatePresence } from "framer-motion";
import { usePWA } from "../context/PWAContext";

function Signin() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const [form, setForm] = useState({
    privateName: "",
    publicName: "",
    age: "20",
    gender: "Male",
    stateName: "Tamil Nadu",
    districtName: "Thanjavur",
    villageName: "Vallam",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Focus input on step change
    if (inputRef.current) {
      inputRef.current.focus();
    }
    setErrorMsg("");
  }, [step]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "publicName") {
      setForm({ ...form, publicName: value, privateName: value });
    } else if (name === "confirmPassword") {
      setConfirmPassword(value);
    } else {
      setForm({ ...form, [name]: value });
    }
    setErrorMsg("");
  };

  const nextStep = (e) => {
    e?.preventDefault();
    if (step === 0 && form.publicName.trim() === "") {
      setErrorMsg("Please enter what you'd like to be called!");
      return;
    }
    if (step === 1 && form.password.trim() === "") {
      setErrorMsg("Password cannot be empty.");
      return;
    }
    setDirection(1);
    setStep(s => s + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(s => Math.max(0, s - 1));
  };

  const handleSignup = async (e) => {
    e?.preventDefault();
    if (confirmPassword !== form.password) {
      setErrorMsg("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser(form);
      localStorage.setItem('userid', res.data);
      initWebsocket();
      navigate("/chats", { replace: true });
    } catch (err) {
      setErrorMsg("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction) => ({ zIndex: 0, x: direction < 0 ? 300 : -300, opacity: 0, position: 'absolute' })
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div style={styles.stepContainer}>
            <h2 style={styles.question}>What should we call you?</h2>
            <input
              ref={inputRef}
              name="publicName"
              value={form.publicName}
              onChange={handleChange}
              placeholder="Your Name"
              style={styles.input}
              onKeyPress={(e) => e.key === 'Enter' && nextStep(e)}
            />
            {errorMsg && <p style={styles.error}>{errorMsg}</p>}
            <button onClick={nextStep} style={styles.nextButton}>Continue &rarr;</button>
          </div>
        );
      case 1:
        return (
          <div style={styles.stepContainer}>
            <h2 style={styles.question}>Set a secure password</h2>
            <input
              ref={inputRef}
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              style={styles.input}
              onKeyPress={(e) => e.key === 'Enter' && nextStep(e)}
            />
            {errorMsg && <p style={styles.error}>{errorMsg}</p>}
            <div style={styles.buttonGroup}>
              <button onClick={prevStep} style={styles.backButton}>&larr; Back</button>
              <button onClick={nextStep} style={styles.nextButton}>Continue &rarr;</button>
            </div>
          </div>
        );
      case 2:
        return (
          <div style={styles.stepContainer}>
            <h2 style={styles.question}>Confirm your password</h2>
            <input
              ref={inputRef}
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              style={styles.input}
              onKeyPress={(e) => e.key === 'Enter' && handleSignup(e)}
            />
            {errorMsg && <p style={styles.error}>{errorMsg}</p>}
            <div style={styles.buttonGroup}>
              <button onClick={prevStep} style={styles.backButton}>&larr; Back</button>
              <button onClick={handleSignup} disabled={loading} style={styles.submitButton}>
                {loading ? "Creating..." : "Start Chatting"}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.brandName}>LetsChat</h1>
      <div style={styles.container}>
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ width: "100%" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        <p style={styles.linkText}>
          Already have an account? <Link to="/login" style={styles.link}>Login here</Link>
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
    marginBottom: "20px",
    letterSpacing: "1px",
    textShadow: "0 2px 10px rgba(0,0,0,0.2)"
  },
  container: {
    width: "100%",
    maxWidth: "500px",
    padding: "40px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflow: "hidden", // Important for AnimatePresence sliding to clip edges
    position: "relative",
    boxSizing: "border-box"
  },
  stepContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "25px",
    padding: "10px"
  },
  question: {
    fontSize: "24px",
    fontWeight: "600",
    margin: "0 0 10px 0",
    textAlign: "left",
    lineHeight: "1.3"
  },
  input: {
    width: "100%",
    padding: "10px 0",
    fontSize: "16px",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid var(--border-color)",
    color: "var(--text-primary)",
    outline: "none",
    transition: "border-color 0.3s ease",
    boxSizing: "border-box"
  },
  error: {
    color: "var(--danger-color)",
    fontSize: "14px",
    margin: "0",
    fontWeight: "500"
  },
  buttonGroup: {
    display: "flex",
    gap: "15px",
    marginTop: "20px"
  },
  nextButton: {
    padding: "12px 24px",
    background: "var(--accent-color)",
    color: "var(--text-primary)",
    border: "none",
    borderRadius: "30px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    alignSelf: "flex-start",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
  },
  submitButton: {
    padding: "12px 24px",
    background: "var(--accent-color)",
    color: "var(--text-primary)",
    border: "none",
    borderRadius: "30px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    flex: 1,
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
  },
  backButton: {
    padding: "12px 24px",
    background: "var(--nav-active-bg)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    borderRadius: "30px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer"
  },
  linkText: {
    marginTop: "40px",
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

export default Signin;
