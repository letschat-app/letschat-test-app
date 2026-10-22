import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupInit, signupVerify } from "../service/UserAuth";
import { initWebsocket } from "../service/Websocket";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, KeyRound, ShieldCheck, Clock, RotateCcw, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { useUsernameCheck } from "../hooks/useUsernameCheck";
import { UsernameStatusIndicator, UsernameStatusBadge } from "../components/common/UsernameStatusIndicator";
import { DisplayNamePolicyModal } from "../components/common/DisplayNamePolicyModal";
import { savePendingOtpSession, getPendingOtpSession, clearPendingOtpSession } from "../service/otpSessionManager";

/**
 * Compact Cartoon Weightlifter Avatar Component
 * Placed directly alongside the password input box.
 * - Initial (score 0): Standing calmly beside weights, resting posture, no struggling, no track line underneath.
 * - Basic (score 1): Ready stance gripping barbell.
 * - Fair (score 2): Lifting barbell up to waist level.
 * - Good (score 3): Cleaning barbell up to chest/shoulder level.
 * - Strong (score 4): Overhead triumph with sparkles!
 */
const WeightlifterAvatar = ({ score }) => {
  const safeScore = score || 0;

  return (
    <div style={{ width: "64px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes idleBreath {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes waistHold {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes chestHold {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        @keyframes overheadTriumph {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.02); }
        }
        @keyframes sparkleGlow {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.25); }
        }
      `}</style>

      <svg width="64" height="40" viewBox="0 0 64 40" style={{ overflow: "visible" }}>
        {/* LEVEL 0: Initial Standing Pose (calm beside weights, no struggle, no line underneath) */}
        {safeScore === 0 && (
          <g style={{ animation: "idleBreath 2s ease-in-out infinite" }}>
            {/* Barbell resting peacefully on floor */}
            <line x1="8" y1="36" x2="30" y2="36" stroke="#64748b" strokeWidth="2" />
            <rect x="5" y="31" width="3.5" height="10" rx="1.5" fill="#475569" />
            <rect x="29.5" y="31" width="3.5" height="10" rx="1.5" fill="#475569" />

            {/* Character standing casually beside weights */}
            <circle cx="44" cy="11" r="5" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5" />
            <line x1="39.5" y1="10" x2="48.5" y2="10" stroke="#f43f5e" strokeWidth="1.8" />
            <circle cx="42.5" cy="11" r="0.8" fill="#1e293b" />
            <circle cx="45.5" cy="11" r="0.8" fill="#1e293b" />
            <line x1="44" y1="16" x2="44" y2="27" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
            <path d="M 44 18 L 39 22 L 42 26" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M 44 18 L 49 22 L 46 26" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M 44 27 L 41 37 M 44 27 L 47 37" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* LEVEL 1: Basic / Ready Stance */}
        {safeScore === 1 && (
          <g style={{ animation: "idleBreath 1.5s ease-in-out infinite" }}>
            <line x1="16" y1="34" x2="48" y2="34" stroke="#cbd5e1" strokeWidth="2" />
            <rect x="12" y="29" width="4" height="10" rx="1.5" fill="#f59e0b" />
            <rect x="48" y="29" width="4" height="10" rx="1.5" fill="#f59e0b" />
            <circle cx="32" cy="15" r="5" fill="#fde047" stroke="#f59e0b" strokeWidth="1.5" />
            <line x1="28" y1="14" x2="36" y2="14" stroke="#f43f5e" strokeWidth="1.8" />
            <line x1="32" y1="20" x2="32" y2="28" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            <path d="M 32 21 L 22 34 M 32 21 L 42 34" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
            <path d="M 32 28 L 26 36 M 32 28 L 38 36" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* LEVEL 2: Fair (Lifting to waist) */}
        {safeScore === 2 && (
          <g style={{ animation: "waistHold 1s ease-in-out infinite" }}>
            <line x1="16" y1="26" x2="48" y2="26" stroke="#cbd5e1" strokeWidth="2" />
            <rect x="12" y="21" width="4" height="10" rx="1.5" fill="#eab308" />
            <rect x="48" y="21" width="4" height="10" rx="1.5" fill="#eab308" />
            <circle cx="32" cy="13" r="5" fill="#fde047" stroke="#eab308" strokeWidth="1.5" />
            <line x1="32" y1="18" x2="32" y2="28" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            <path d="M 32 20 L 22 26 M 32 20 L 42 26" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 32 28 L 27 36 M 32 28 L 37 36" stroke="#ca8a04" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* LEVEL 3: Good (Cleans bar to chest) */}
        {safeScore === 3 && (
          <g style={{ animation: "chestHold 0.9s ease-in-out infinite" }}>
            <line x1="16" y1="18" x2="48" y2="18" stroke="#ffffff" strokeWidth="2" />
            <rect x="12" y="13" width="4" height="10" rx="1.5" fill="#3b82f6" />
            <rect x="48" y="13" width="4" height="10" rx="1.5" fill="#3b82f6" />
            <circle cx="32" cy="12" r="5" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5" />
            <line x1="32" y1="17" x2="32" y2="28" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
            <path d="M 32 19 L 24 18 M 32 19 L 40 18" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 32 28 L 27 36 M 32 28 L 37 36" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* LEVEL 4: Strong (Overhead Triumph!) */}
        {safeScore === 4 && (
          <g style={{ animation: "overheadTriumph 1.1s ease-in-out infinite" }}>
            <text x="6" y="8" fontSize="8" style={{ animation: "sparkleGlow 0.8s infinite" }}>✨</text>
            <text x="50" y="8" fontSize="8" style={{ animation: "sparkleGlow 0.8s infinite 0.4s" }}>✨</text>
            <line x1="14" y1="8" x2="50" y2="8" stroke="#ffffff" strokeWidth="2.5" />
            <rect x="10" y="3" width="4" height="10" rx="1.5" fill="#10b981" />
            <rect x="50" y="3" width="4" height="10" rx="1.5" fill="#10b981" />
            <path d="M 32 18 L 22 9 M 32 18 L 42 9" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="16" r="5" fill="#6ee7b7" stroke="#10b981" strokeWidth="1.5" />
            <line x1="32" y1="21" x2="32" y2="30" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
            <path d="M 32 30 L 26 37 M 32 30 L 38 37" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
};

function Signin() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Form & Init, 2 = Verify OTP
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [timer, setTimer] = useState(600); // 10 minutes in seconds

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState("");
  const otpInputRef = useRef(null);

  // Resume active Signup OTP session if page was reloaded
  useEffect(() => {
    const session = getPendingOtpSession();
    if (session && session.flow === 'SIGNUP' && session.payload?.email) {
      setForm(prev => ({ ...prev, ...session.payload }));
      setStep(2);
      const remainingSeconds = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setTimer(remainingSeconds > 0 ? remainingSeconds : 600);
      setInfoMsg(session.promptMessage || `6-digit verification code sent to ${session.payload.email}`);
    }
  }, []);

  // 10-Minute Countdown Timer for OTP Step
  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  // Focus OTP input when step 2 opens
  useEffect(() => {
    if (step === 2 && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const finalVal = name === "username" ? value.toLowerCase().replace(/[^a-z0-9_]/g, "") : value;
    setForm((prev) => ({ ...prev, [name]: finalVal }));
    setErrorMsg("");
    setInfoMsg("");
  };

  // Password Strength Calculation Helper
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "transparent", percent: 0 };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: "", color: "#f59e0b", percent: 25 };
    if (score === 2) return { score: 2, label: "Fair", color: "#eab308", percent: 50 };
    if (score === 3) return { score: 3, label: "Good", color: "#3b82f6", percent: 75 };
    return { score: 4, label: "Strong", color: "#10b981", percent: 100 };
  };

  const passwordStrength = getPasswordStrength(form.password);

  const usernameCheck = useUsernameCheck({
    username: form.username,
    debounceMs: 400
  });

  // Step 1: Submit & Send OTP (POST /api/user/signup/init)
  const handleInitSignup = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (!form.email.trim() || !form.email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (!form.username.trim()) {
      setErrorMsg("Please enter your display name.");
      return;
    }

    if (usernameCheck.isBlocked) {
      setErrorMsg(usernameCheck.message || "Please choose a valid and available username.");
      return;
    }

    if (usernameCheck.isChecking) {
      setErrorMsg("Validating username availability, please wait a moment...");
      return;
    }

    if (!form.password) {
      setErrorMsg("Please enter a secure password.");
      return;
    }

    if (form.password.length < 6 || passwordStrength.score <= 1) {
      setErrorMsg("Password is too weak! Please make your password stronger to proceed.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMsg("Passwords do not match!");
      return;
    }

    setLoading(true);

    const cleanUsername = form.username.trim().toLowerCase();
    const payload = {
      email: form.email.trim().toLowerCase(),
      username: cleanUsername,
      publicName: cleanUsername,
      privateName: cleanUsername,
      password: form.password,
    };

    try {
      const res = await signupInit(payload);
      const data = res.data;

      if (data?.status === "success" || res.status === 200 || res.status === 201) {
        savePendingOtpSession({
          flow: 'SIGNUP',
          payload: { email: form.email.trim().toLowerCase(), ...payload },
          promptMessage: `Enter the 6-digit verification code sent to ${form.email}`
        });
        setStep(2);
        setTimer(600); // 10 minutes timer
        setInfoMsg(data?.message || `6-digit verification code sent to ${form.email}`);
      } else {
        setErrorMsg(data?.message || "Failed to send OTP. Please check your details and try again.");
      }
    } catch (err) {
      console.error("Signup Init error:", err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setErrorMsg(serverMsg || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Action
  const handleResendOtp = async () => {
    setErrorMsg("");
    setInfoMsg("");
    setResending(true);

    const cleanUsername = form.username.trim().toLowerCase();
    const payload = {
      email: form.email.trim().toLowerCase(),
      username: cleanUsername,
      publicName: cleanUsername,
      privateName: cleanUsername,
      password: form.password,
    };

    try {
      const res = await signupInit(payload);
      const data = res.data;
      if (data?.status === "success" || res.status === 200 || res.status === 201) {
        setTimer(600); // Reset 10 min countdown
        setInfoMsg(`A new 6-digit OTP has been sent to ${form.email}`);
      } else {
        setErrorMsg(data?.message || "Failed to resend OTP.");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify & Complete Registration (POST /api/user/signup/verify)
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);

    try {
      const res = await signupVerify({
        email: form.email.trim(),
        otp: cleanOtp,
      });

      const responseData = res.data;

      // Check created user response containing userId
      const createdUserId =
        typeof responseData === "string"
          ? responseData
          : responseData?.userId || responseData?.userid || responseData?.id || responseData?.data?.userId;

      if (createdUserId) {
        clearPendingOtpSession();
        localStorage.setItem("userid", createdUserId);
        localStorage.setItem("email", form.email.trim().toLowerCase());
        localStorage.setItem("username", form.username.trim().toLowerCase());
        localStorage.setItem("displayName", form.username.trim());
        localStorage.setItem("profile", data?.profile || form.username.trim().toLowerCase());

        initWebsocket();
        navigate("/chats", { replace: true });
      } else {
        setErrorMsg("Registration completed, but User ID was not returned. Please try logging in.");
      }
    } catch (err) {
      console.error("Signup Verify error:", err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;

      if (serverMsg === "INVALID_OTP_OR_EXPIRED" || err.response?.status === 400) {
        setErrorMsg("Invalid or expired OTP. Please enter a valid OTP or request a new one.");
      } else {
        setErrorMsg(serverMsg || "Verification failed. Please check the code and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  };

  return (
    <div style={styles.wrapper}>
      {/* Brand Heading */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h1 style={styles.brandName}>LetsChat</h1>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary, #94a3b8)" }}>
          {step === 1 ? "Create your secure account" : "Verify your email to complete registration"}
        </p>
      </div>

      <div style={styles.container}>
        <AnimatePresence mode="wait">
          {step === 1 ? (
            /* STEP 1: Registration Form */
            <motion.form
              key="step1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleInitSignup}
              style={styles.stepForm}
            >
              {/* Email Input */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>EMAIL ADDRESS</label>
                <div style={styles.inputWrapper}>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="alex@example.com"
                    style={styles.input}
                  />
                </div>
              </div>

              {/* Permanent Username Callout Note */}
              <div style={styles.subtleNote}>
                💡 Your username is permanent and cannot be changed after creation. You can change your Display Name and customize per-chat names later.{" "}
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(true)}
                  style={styles.learnMoreLink}
                >
                  Learn more
                </button>
              </div>

              {/* Username Input with Live Availability / Similarity Indicator */}
              <div style={styles.fieldGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={styles.label}>Permanent Username</label>
                  <UsernameStatusBadge checkResult={usernameCheck} />
                </div>
                <div style={styles.inputWrapper}>
                  <input
                    type="text"
                    name="username"
                    required
                    value={form.username}
                    onChange={handleChange}
                    placeholder="alex_dev"
                    style={{
                      ...styles.input,
                      borderColor: (usernameCheck.status === 'block' && form.username.trim().length >= 3) ? '#ef4444' 
                        : usernameCheck.status === 'warn' ? '#f59e0b' 
                        : usernameCheck.status === 'allow' ? '#10b981' 
                        : undefined,
                      boxShadow: usernameCheck.status === 'allow' ? '0 0 0 1px rgba(16, 185, 129, 0.2)' 
                        : usernameCheck.status === 'warn' ? '0 0 0 1px rgba(245, 158, 11, 0.2)' 
                        : (usernameCheck.status === 'block' && form.username.trim().length >= 3) ? '0 0 0 1px rgba(239, 68, 68, 0.2)' 
                        : undefined
                    }}
                  />
                </div>
                {usernameCheck.status === 'block' && form.username.trim().length >= 3 && (
                  <span style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px", display: "block", fontWeight: "500" }}>
                    {usernameCheck.message || "Username is already taken"}
                  </span>
                )}
                {usernameCheck.status === 'warn' && (
                  <span style={{ fontSize: "12px", color: "#f59e0b", marginTop: "4px", display: "block", fontWeight: "500" }}>
                    Available but similar to existing username
                  </span>
                )}
              </div>

              {/* Password Input with Strength Checker & Side-by-Side Weightlifter */}
              <div style={styles.fieldGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={styles.label}>PASSWORD</label>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: form.password && passwordStrength.color ? passwordStrength.color : "var(--text-secondary, #94a3b8)" }}>
                    {form.password && passwordStrength.label ? passwordStrength.label : "Ready"}
                  </span>
                </div>

                {/* Side-by-Side: Password Input Field + Weightlifter Companion */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ ...styles.inputWrapper, flex: 1 }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      style={{ ...styles.input, paddingRight: "40px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Weightlifter Companion Box alongside the inputbox */}
                  <div
                    style={{
                      width: "72px",
                      height: "44px",
                      flexShrink: 0,
                      backgroundColor: "var(--bg-secondary, #090f1d)",
                      border: "1px solid var(--border-color, #1e293b)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden"
                    }}
                    title="Password strength companion"
                  >
                    <WeightlifterAvatar score={passwordStrength.score} />
                  </div>
                </div>

                {/* Clean subtle 4-segment strength indicator */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "6px" }}>
                  {[1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      style={{
                        height: "3px",
                        borderRadius: "2px",
                        backgroundColor: (form.password && passwordStrength.score >= seg) ? passwordStrength.color : "rgba(255,255,255,0.08)",
                        transition: "background-color 0.3s ease"
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Confirm Password Input */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>CONFIRM PASSWORD</label>
                <div style={styles.inputWrapper}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    required
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    style={{ ...styles.input, paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtn}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <span style={{ fontSize: "12px", color: "var(--danger-color, #ef4444)", marginTop: "4px", display: "block" }}>
                    Passwords do not match
                  </span>
                )}
              </div>

              {/* Error Message Display */}
              {errorMsg && (
                <div style={styles.errorBox}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit & Send OTP Button */}
              {(() => {
                const isWeakPassword = Boolean(form.password && passwordStrength.score <= 1);
                const isUsernameBlocked = Boolean(form.username && usernameCheck.isBlocked);
                const isCheckingUsername = Boolean(usernameCheck.isChecking);
                const isSubmitDisabled = Boolean(
                  loading || 
                  isCheckingUsername || 
                  isUsernameBlocked || 
                  isWeakPassword || 
                  !form.email || 
                  !form.username || 
                  !form.password || 
                  form.password !== form.confirmPassword
                );

                return (
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      style={{
                        ...styles.submitButton,
                        opacity: isSubmitDisabled ? (isUsernameBlocked ? 0.8 : 0.6) : 1,
                        cursor: isSubmitDisabled ? "not-allowed" : "pointer",
                        backgroundColor: isUsernameBlocked 
                          ? "#172339" 
                          : isWeakPassword 
                          ? "var(--bg-secondary, #334155)" 
                          : "var(--accent-color, #2563eb)",
                        color: isUsernameBlocked ? "#64748b" : "#ffffff",
                        boxShadow: (!isSubmitDisabled && !isUsernameBlocked) ? "0 4px 15px rgba(37, 99, 235, 0.4)" : "none",
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Sending OTP...
                        </>
                      ) : (isUsernameBlocked && !isCheckingUsername) ? (
                        <>
                          Choose Another Username →
                        </>
                      ) : isWeakPassword ? (
                        <>
                          Enter Stronger Password
                          <Lock size={16} />
                        </>
                      ) : (
                        <>
                          Submit & Send OTP →
                        </>
                      )}
                    </button>
                    {isWeakPassword && (
                      <span style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)", textAlign: "center", marginTop: "6px", display: "block", fontWeight: "500" }}>
                        Password should be at least 6 characters with mixed characters.
                      </span>
                    )}
                  </div>
                );
              })()}
            </motion.form>
          ) : (
            /* STEP 2: OTP Verification Screen */
            <motion.form
              key="step2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleVerifyOtp}
              style={styles.stepForm}
            >
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
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
                  <KeyRound size={24} />
                </div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700" }}>Enter Verification Code</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary, #94a3b8)" }}>
                  We emailed a 6-digit OTP code to <strong style={{ color: "var(--text-primary)" }}>{form.email}</strong>
                </p>
              </div>

              {/* Info Message Display */}
              {infoMsg && (
                <div style={styles.infoBox}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{infoMsg}</span>
                </div>
              )}

              {/* 6-Digit OTP Input */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>6-Digit OTP Code</label>
                <div style={styles.inputWrapper}>
                  <ShieldCheck size={18} color="var(--text-secondary, #94a3b8)" style={styles.inputIcon} />
                  <input
                    ref={otpInputRef}
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, ""));
                      setErrorMsg("");
                    }}
                    placeholder="123456"
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

              {/* 10-Minute Countdown Timer & Resend Option */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: timer > 0 ? "var(--text-secondary, #94a3b8)" : "#ef4444" }}>
                  <Clock size={16} />
                  <span>
                    {timer > 0 ? `Expires in ${formatTimer(timer)}` : "OTP Expired"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  style={styles.resendBtn}
                >
                  {resending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  Resend OTP
                </button>
              </div>

              {/* Error Message Display */}
              {errorMsg && (
                <div style={styles.errorBox}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                <button type="submit" disabled={loading || otp.length !== 6} style={styles.submitButton}>
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifying & Creating...
                    </>
                  ) : (
                    <>
                      Verify & Complete Registration
                      <CheckCircle2 size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearPendingOtpSession();
                    setStep(1);
                    setErrorMsg("");
                    setInfoMsg("");
                  }}
                  style={styles.backBtn}
                >
                  ← Edit Registration Details
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <p style={styles.linkText}>
          Already have an account? <Link to="/login" style={styles.link}>Login here</Link>
        </p>
      </div>

      {/* Name Protection & Anti-Impersonation Policy Modal */}
      <DisplayNamePolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
      />
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    height: "100%",
    minHeight: "100%",
    maxHeight: "100dvh",
    width: "100%",
    background: "var(--bg-gradient, #0f172a)",
    color: "var(--text-primary, #f8fafc)",
    fontFamily: "Inter, system-ui, sans-serif",
    padding: "24px 16px 48px 16px",
    boxSizing: "border-box",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  },
  brandName: {
    fontSize: "30px",
    fontWeight: "800",
    color: "var(--text-primary, #f8fafc)",
    margin: "0 0 4px 0",
    letterSpacing: "0.5px",
  },
  container: {
    width: "100%",
    maxWidth: "420px",
    margin: "auto 0",
    flexShrink: 0,
    padding: "28px 24px",
    backgroundColor: "var(--bg-card, #0d1527)",
    border: "1px solid var(--border-color, rgba(255,255,255,0.06))",
    borderRadius: "20px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    boxSizing: "border-box",
  },
  stepForm: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    width: "100%",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  subtleNote: {
    fontSize: "11px",
    color: "#60a5fa",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    padding: "7px 12px",
    borderRadius: "8px",
    lineHeight: "1.38",
    margin: "-4px 0 -4px 0",
  },
  learnMoreLink: {
    color: "#60a5fa",
    textDecoration: "underline",
    background: "none",
    border: "none",
    padding: 0,
    fontSize: "inherit",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline",
  },
  label: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.04em",
    color: "var(--text-secondary, #94a3b8)",
    textTransform: "uppercase",
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
    padding: "11px 14px",
    fontSize: "14px",
    backgroundColor: "var(--bg-secondary, #090f1d)",
    border: "1px solid var(--border-color, #1e293b)",
    borderRadius: "10px",
    color: "var(--text-primary, #f8fafc)",
    outline: "none",
    transition: "all 0.2s ease",
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
  strengthBarBg: {
    width: "100%",
    height: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  strengthBarFill: {
    height: "100%",
    transition: "width 0.3s ease, background-color 0.3s ease",
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
  },
  submitButton: {
    width: "100%",
    padding: "12px 20px",
    backgroundColor: "var(--accent-color, #2563eb)",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow: "0 4px 15px rgba(37, 99, 235, 0.35)",
    transition: "all 0.2s ease",
  },
  resendBtn: {
    background: "none",
    border: "none",
    color: "var(--accent-color, #3b82f6)",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: 0,
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
    marginTop: "20px",
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

export default Signin;
