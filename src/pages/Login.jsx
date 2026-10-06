import React, { useState, useRef, useEffect } from "react";
import { loginUser, verify2FALogin } from "../service/UserAuth";
import { Link, useNavigate } from "react-router-dom";
import { initWebsocket } from "../service/Websocket";
import { Eye, EyeOff, ShieldCheck, Lock, Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle, KeyRound, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { normalizeIdentifier } from "../service/ChatUtils";

/**
 * Login Component
 * Supports Flexible Login (UserId or Email) & 2-Factor Authentication (2FA) Verification Flow.
 * Step 1: POST /api/user/login { userid: "user@example.com" | "AAA005", password: "..." }
 * Step 2 (If 2FA_REQUIRED): POST /api/user/login/2fa-verify { identifier: "...", otp: "123456" }
 */
function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [step, setStep] = useState("login"); // 'login' | '2fa'
  const [tempIdentifier, setTempIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const otpInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (step === "2fa" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrorMsg("");
    setInfoMsg("");
  };

  // Step A: Standard Login Request
  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const rawInput = (form.identifier || form.userid || "").trim();
    const cleanIdentifier = normalizeIdentifier(rawInput);
    if (!cleanIdentifier || !form.password) {
      setErrorMsg("Please enter both UserId or Email and Password.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser({
        userId: cleanIdentifier,
        password: form.password,
      });

      const data = res.data;

      // Handle 2FA Required Response
      if (
        data?.is2FARequired ||
        data?.status === "2FA_REQUIRED" ||
        data === "2FA_REQUIRED" ||
        data?.message === "2FA_REQUIRED"
      ) {
        setTempIdentifier(cleanIdentifier);
        setStep("2fa");
        setInfoMsg("Password verified! Enter the 6-digit code sent to your registered email.");
        return;
      }

      // Handle Login Success Response
      if (
        data?.status === "SUCCESS" ||
        data === "login succesfull" ||
        data?.message === "login succesfull" ||
        res.status === 200 ||
        res.status === 201
      ) {
        const loggedUserId =
          data?.userId || data?.userid || data?.id || data?.data?.userId || cleanIdentifier;

        localStorage.setItem("userid", loggedUserId);
        if (data?.email) localStorage.setItem("email", data.email);
        if (data?.username || data?.userName || data?.publicName) {
          localStorage.setItem("username", data.username || data.userName || data.publicName);
        }
        if (data?.is2FAEnabled !== undefined) {
          localStorage.setItem("is2FAEnabled", String(data.is2FAEnabled));
        }

        initWebsocket();
        navigate("/chats", { replace: true });
      } else {
        setErrorMsg(data?.message || "Login failed. Incorrect credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      
      if (serverMsg === "2FA_REQUIRED" || err.response?.data?.is2FARequired) {
        setTempIdentifier(cleanIdentifier);
        setStep("2fa");
        setInfoMsg("Password verified! Enter the 6-digit code sent to your registered email.");
      } else {
        setErrorMsg(serverMsg || "Login failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step B: 2FA Verification Request
  const handleVerify2FA = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit 2FA OTP code.");
      return;
    }

    setLoading(true);
    try {
      const res = await verify2FALogin({
        identifier: normalizeIdentifier(tempIdentifier),
        otp: cleanOtp,
      });

      const data = res.data;

      if (
        data?.status === "SUCCESS" ||
        data === "login succesfull" ||
        data?.message === "login succesfull" ||
        res.status === 200 ||
        res.status === 201
      ) {
        const loggedUserId =
          data?.userId || data?.userid || data?.id || data?.data?.userId || tempIdentifier;

        localStorage.setItem("userid", loggedUserId);
        if (data?.email) localStorage.setItem("email", data.email);
        if (data?.username || data?.userName || data?.publicName) {
          localStorage.setItem("username", data.username || data.userName || data.publicName);
        }
        if (data?.is2FAEnabled !== undefined) {
          localStorage.setItem("is2FAEnabled", String(data.is2FAEnabled));
        }

        initWebsocket();
        navigate("/chats", { replace: true });
      } else {
        setErrorMsg(data?.message || "Invalid or expired 2FA code. Please try again.");
      }
    } catch (err) {
      console.error("2FA Verify error:", err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setErrorMsg(serverMsg || "Invalid 2FA code. Please check the OTP and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.brandName}>LetsChat</h1>
      <div style={styles.glassCard}>
        <AnimatePresence mode="wait">
          {step === "login" ? (
            /* Standard Login Form */
            <motion.div
              key="login-step"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
            >
              <div style={styles.header}>
                <h2 style={styles.heading}>Welcome Back</h2>
                <p style={styles.subtitle}>Enter your credentials (UserId or Email) to continue</p>
              </div>

              <form onSubmit={handleLogin} style={styles.form}>
                {/* Flexible Login Input: UserId or Email */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>UserId or Email</label>
                  <div style={styles.inputWrapper}>
                    <User size={18} color="var(--text-secondary, #94a3b8)" style={styles.inputIcon} />
                    <input
                      name="identifier"
                      required
                      placeholder="UserId or Email"
                      value={form.identifier || form.userid || ""}
                      onChange={handleChange}
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={18} color="var(--text-secondary, #94a3b8)" style={styles.inputIcon} />
                    <input
                      name="password"
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={handleChange}
                      style={{ ...styles.input, paddingRight: "42px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div style={styles.errorBox}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}>
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Login
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* 2FA Verification Screen */
            <motion.div
              key="2fa-step"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
            >
              <div style={styles.header}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    color: "var(--accent-color, #3b82f6)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                  }}
                >
                  <ShieldCheck size={24} />
                </div>
                <h2 style={styles.heading}>2FA Verification</h2>
                <p style={styles.subtitle}>
                  Enter the 6-digit code sent to your registered email
                </p>
              </div>

              {infoMsg && (
                <div style={styles.infoBox}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{infoMsg}</span>
                </div>
              )}

              <form onSubmit={handleVerify2FA} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>6-Digit 2FA Code</label>
                  <div style={styles.inputWrapper}>
                    <KeyRound size={18} color="var(--text-secondary, #94a3b8)" style={styles.inputIcon} />
                    <input
                      ref={otpInputRef}
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, ""));
                        setErrorMsg("");
                      }}
                      style={{
                        ...styles.input,
                        letterSpacing: "8px",
                        fontSize: "20px",
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div style={styles.errorBox}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button type="submit" disabled={loading || otp.length !== 6} style={{ ...styles.button, opacity: (loading || otp.length !== 6) ? 0.6 : 1 }}>
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifying 2FA...
                    </>
                  ) : (
                    <>
                      Verify 2FA & Complete Login
                      <ShieldCheck size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setErrorMsg("");
                    setInfoMsg("");
                  }}
                  style={styles.backBtn}
                >
                  ← Back to Login Credentials
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

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
    minHeight: "100vh",
    width: "100%",
    background: "var(--bg-gradient, #0f172a)",
    color: "var(--text-primary, #f8fafc)",
    fontFamily: "Inter, system-ui, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
  },
  brandName: {
    fontSize: "36px",
    fontWeight: "800",
    color: "var(--text-primary, #f8fafc)",
    marginBottom: "24px",
    letterSpacing: "1px",
    textShadow: "0 2px 10px rgba(0,0,0,0.2)",
  },
  glassCard: {
    width: "100%",
    maxWidth: "420px",
    background: "var(--bg-card, #1e293b)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
    borderRadius: "24px",
    padding: "36px 28px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    boxSizing: "border-box",
  },
  header: {
    textAlign: "center",
    marginBottom: "8px",
  },
  heading: {
    margin: "0 0 8px 0",
    fontSize: "28px",
    fontWeight: "700",
    color: "var(--text-primary, #f8fafc)",
  },
  subtitle: {
    margin: "0",
    fontSize: "13px",
    color: "var(--text-secondary, #94a3b8)",
    lineHeight: "1.4",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-secondary, #94a3b8)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  inputIcon: {
    position: "absolute",
    left: "12px",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "12px 14px 12px 40px",
    fontSize: "14px",
    background: "var(--bg-secondary, #0f172a)",
    border: "1px solid var(--border-color, #334155)",
    borderRadius: "12px",
    color: "var(--text-primary, #f8fafc)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  eyeBtn: {
    position: "absolute",
    right: "10px",
    background: "none",
    border: "none",
    color: "var(--text-secondary, #94a3b8)",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    borderRadius: "10px",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#f87171",
    fontSize: "13px",
    fontWeight: "500",
  },
  infoBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    borderRadius: "10px",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    color: "#34d399",
    fontSize: "13px",
    fontWeight: "500",
    marginBottom: "12px",
  },
  button: {
    width: "100%",
    padding: "14px",
    background: "var(--accent-color, #3b82f6)",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "6px",
    boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "var(--text-secondary, #94a3b8)",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "6px 0",
    textAlign: "center",
  },
  linkText: {
    margin: "10px 0 0 0",
    textAlign: "center",
    fontSize: "13px",
    color: "var(--text-secondary, #94a3b8)",
  },
  link: {
    color: "var(--accent-color, #3b82f6)",
    textDecoration: "none",
    fontWeight: "700",
  },
};

export default Login;
