import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupInit, signupVerify } from "../service/UserAuth";
import { initWebsocket } from "../service/Websocket";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, User, Lock, KeyRound, ShieldCheck, Clock, RotateCcw, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";

/**
 * Stationary Cartoon Weightlifter Password Strength Component
 * SVG + CSS keyframes micro-animation in a SINGLE FIXED CENTER POSITION (x=150):
 * - Level 1 (Weak): Character bending over on ground in center, struggling non-stop (wobble + sweat drops)
 * - Level 2 (Fair): Character lifting barbell up to knees/waist level in center
 * - Level 3 (Good): Character cleaning barbell up to chest/shoulder level in center
 * - Level 4 (Strong): Character triumphantly locking arms overhead with stars/sparkles in center!
 */
const WeightlifterStrength = ({ score, label }) => {
  if (!score || score <= 0) return null;

  const posXMap = [30, 90, 150, 210, 270];
  const targetX = posXMap[score] || 30;

  const colorMap = ["#94a3b8", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  const currentColor = colorMap[score] || "#94a3b8";

  return (
    <div style={{ width: "100%", marginTop: "6px", position: "relative" }}>
      <style>{`
        @keyframes struggleShake {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-2px) rotate(3deg); }
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
          50% { transform: translateY(-3px) scale(1.03); }
        }
        @keyframes sweatDrop {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(3px); }
        }
        @keyframes sparkleGlow {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* Strength Label & Hint */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
        <span style={{ fontSize: "11px", fontWeight: "700", color: currentColor }}>
          Strength: {label}
        </span>
        <span style={{ fontSize: "10px", color: score === 1 ? "#ef4444" : "var(--text-secondary, #94a3b8)", fontStyle: "italic", fontWeight: score === 1 ? "700" : "normal" }}>
          {score === 1 && "Too Weak - Cannot Submit 💦"}
          {score === 2 && "Fair - Lifting to waist... 🏋️"}
          {score === 3 && "Good - Clearing to chest! 💪"}
          {score === 4 && "Strong - Lifting Overhead! 🏆✨"}
        </span>
      </div>

      <svg width="100%" height="46" viewBox="0 0 300 46" style={{ overflow: "visible" }}>
        {/* Track Line */}
        <line x1="30" y1="40" x2="270" y2="40" stroke="rgba(255,255,255,0.15)" strokeWidth="3" strokeLinecap="round" />
        
        {/* Active Filled Progress Track */}
        <line x1="30" y1="40" x2={targetX} y2="40" stroke={currentColor} strokeWidth="3" strokeLinecap="round" style={{ transition: "x2 0.4s ease" }} />

        {/* Milestone Nodes */}
        {[90, 150, 210, 270].map((nodeX, idx) => (
          <circle key={idx} cx={nodeX} cy="40" r="3" fill={score >= idx + 1 ? currentColor : "#334155"} />
        ))}

        {/* STATIONARY Cartoon Lifter Group fixed at center (x=150) */}
        <g style={{ transform: "translateX(150px)" }}>
          
          {/* LEVEL 1: Weak (Struggling on ground in single fixed place) */}
          {score === 1 && (
            <g style={{ animation: "struggleShake 0.35s ease-in-out infinite" }}>
              <text x="8" y="14" fontSize="9" style={{ animation: "sweatDrop 0.5s infinite" }}>💦</text>
              <circle cx="0" cy="20" r="5" fill="#fca5a5" stroke="#ef4444" strokeWidth="1.5" />
              <line x1="-2" y1="19" x2="0" y2="21" stroke="#991b1b" strokeWidth="1" />
              <line x1="2" y1="19" x2="0" y2="21" stroke="#991b1b" strokeWidth="1" />
              <path d="M 0 25 L -4 34 M 0 25 L 4 34" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 0 25 L -8 37 M 0 25 L 8 37" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
              <line x1="-16" y1="38" x2="16" y2="38" stroke="#cbd5e1" strokeWidth="2" />
              <rect x="-20" y="32" width="4" height="12" rx="1.5" fill="#ef4444" />
              <rect x="16" y="32" width="4" height="12" rx="1.5" fill="#ef4444" />
            </g>
          )}

          {/* LEVEL 2: Fair (Lifting to waist in single fixed place) */}
          {score === 2 && (
            <g style={{ animation: "waistHold 0.8s ease-in-out infinite" }}>
              <circle cx="0" cy="14" r="5" fill="#fde047" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="0" y1="19" x2="0" y2="30" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
              <path d="M 0 30 L -5 38 M 0 30 L 5 38" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 0 21 L -8 27 M 0 21 L 8 27" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
              <line x1="-16" y1="27" x2="16" y2="27" stroke="#cbd5e1" strokeWidth="2" />
              <rect x="-20" y="21" width="4" height="12" rx="1.5" fill="#f59e0b" />
              <rect x="16" y="21" width="4" height="12" rx="1.5" fill="#f59e0b" />
            </g>
          )}

          {/* LEVEL 3: Good (Cleans bar to chest in single fixed place) */}
          {score === 3 && (
            <g style={{ animation: "chestHold 1s ease-in-out infinite" }}>
              <circle cx="0" cy="14" r="5" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5" />
              <line x1="0" y1="19" x2="0" y2="31" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
              <path d="M 0 31 L -6 38 M 0 31 L 6 38" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 0 20 L -6 19 M 0 20 L 6 19" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="-16" y1="18" x2="16" y2="18" stroke="#ffffff" strokeWidth="2" />
              <rect x="-20" y="12" width="4" height="12" rx="1.5" fill="#3b82f6" />
              <rect x="16" y="12" width="4" height="12" rx="1.5" fill="#3b82f6" />
            </g>
          )}

          {/* LEVEL 4: Strong (Overhead Triumph in single fixed place!) */}
          {score === 4 && (
            <g style={{ animation: "overheadTriumph 1.2s ease-in-out infinite" }}>
              <text x="-14" y="2" fontSize="9" style={{ animation: "sparkleGlow 0.8s infinite" }}>✨</text>
              <text x="7" y="2" fontSize="9" style={{ animation: "sparkleGlow 0.8s infinite 0.4s" }}>✨</text>
              <line x1="-18" y1="6" x2="18" y2="6" stroke="#ffffff" strokeWidth="2.5" />
              <rect x="-22" y="0" width="5" height="12" rx="1.5" fill="#10b981" />
              <rect x="17" y="0" width="5" height="12" rx="1.5" fill="#10b981" />
              <path d="M 0 19 L -9 7 M 0 19 L 9 7" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="0" cy="17" r="5" fill="#6ee7b7" stroke="#10b981" strokeWidth="1.5" />
              <line x1="0" y1="22" x2="0" y2="32" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
              <path d="M 0 32 L -7 38 M 0 32 L 7 38" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}
        </g>
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
  const [timer, setTimer] = useState(600); // 10 minutes in seconds

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    age: "20",
    gender: "Male",
    stateName: "Tamil Nadu",
    districtName: "Thanjavur",
    villageName: "Vallam",
  });

  const [otp, setOtp] = useState("");
  const otpInputRef = useRef(null);

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
    setForm((prev) => ({ ...prev, [name]: value }));
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

    if (score <= 1) return { score: 1, label: "Weak", color: "#ef4444", percent: 25 };
    if (score === 2) return { score: 2, label: "Fair", color: "#f59e0b", percent: 50 };
    if (score === 3) return { score: 3, label: "Good", color: "#3b82f6", percent: 75 };
    return { score: 4, label: "Strong", color: "#10b981", percent: 100 };
  };

  const passwordStrength = getPasswordStrength(form.password);

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

    const payload = {
      email: form.email.trim(),
      username: form.username.trim(),
      publicName: form.username.trim(),
      privateName: form.username.trim(),
      password: form.password,
      age: form.age,
      gender: form.gender,
      stateName: form.stateName,
      districtName: form.districtName,
      villageName: form.villageName,
    };

    try {
      const res = await signupInit(payload);
      const data = res.data;

      if (data?.status === "success" || res.status === 200 || res.status === 201) {
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

    const payload = {
      email: form.email.trim(),
      username: form.username.trim(),
      publicName: form.username.trim(),
      privateName: form.username.trim(),
      password: form.password,
      age: form.age,
      gender: form.gender,
      stateName: form.stateName,
      districtName: form.districtName,
      villageName: form.villageName,
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
        localStorage.setItem("userid", createdUserId);
        localStorage.setItem("email", form.email.trim());
        localStorage.setItem("username", form.username.trim());
        localStorage.setItem("profile", form.username.trim());

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
          {step === 1 ? "Create your account & get started" : "Verify your email to complete registration"}
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
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputWrapper}>
                  <Mail size={18} color="var(--text-secondary, #94a3b8)" style={styles.inputIcon} />
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    style={styles.input}
                  />
                </div>
              </div>

              {/* Username Input with Subtle Tip */}
              <div style={styles.fieldGroup}>
                <p style={styles.subtleNote}>
                  💡 This name is your default display name, but you can customize how you appear to specific contacts when chatting.
                </p>
                <label style={styles.label}>Display Name / Username</label>
                <div style={styles.inputWrapper}>
                  <User size={18} color="var(--text-secondary, #94a3b8)" style={styles.inputIcon} />
                  <input
                    type="text"
                    name="username"
                    required
                    value={form.username}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    style={styles.input}
                  />
                </div>
              </div>

              {/* Password Input with Strength Checker */}
              <div style={styles.fieldGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={styles.label}>Password</label>
                  {form.password && (
                    <span style={{ fontSize: "12px", fontWeight: "700", color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  )}
                </div>

                <div style={styles.inputWrapper}>
                  <Lock size={18} color="var(--text-secondary, #94a3b8)" style={styles.inputIcon} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
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

                {/* Animated Cartoon Weightlifter Password Strength Indicator */}
                {form.password && (
                  <WeightlifterStrength score={passwordStrength.score} label={passwordStrength.label} />
                )}
              </div>

              {/* Confirm Password Input */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Confirm Password</label>
                <div style={styles.inputWrapper}>
                  <Lock size={18} color="var(--text-secondary, #94a3b8)" style={styles.inputIcon} />
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
                    ⚠️ Passwords do not match
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
                const isSubmitDisabled = Boolean(loading || isWeakPassword || !form.email || !form.username || !form.password || form.password !== form.confirmPassword);
                return (
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      style={{
                        ...styles.submitButton,
                        opacity: isSubmitDisabled ? 0.6 : 1,
                        cursor: isSubmitDisabled ? "not-allowed" : "pointer",
                        backgroundColor: isWeakPassword ? "var(--bg-secondary, #334155)" : "var(--accent-color, #3b82f6)",
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Sending OTP...
                        </>
                      ) : isWeakPassword ? (
                        <>
                          Password Too Weak to Submit
                          <Lock size={16} />
                        </>
                      ) : (
                        <>
                          Submit & Send OTP
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                    {isWeakPassword && (
                      <span style={{ fontSize: "11px", color: "#ef4444", textAlign: "center", marginTop: "6px", display: "block", fontWeight: "600" }}>
                        ⚠️ Password is too weak to submit. Add numbers or special characters.
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
    fontSize: "32px",
    fontWeight: "800",
    color: "var(--text-primary, #f8fafc)",
    margin: "0 0 4px 0",
    letterSpacing: "1px",
  },
  container: {
    width: "100%",
    maxWidth: "440px",
    padding: "28px 24px",
    backgroundColor: "var(--bg-card, #1e293b)",
    border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
    borderRadius: "20px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
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
    fontSize: "12px",
    color: "#60a5fa",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    padding: "8px 12px",
    borderRadius: "8px",
    margin: "0 0 6px 0",
    lineHeight: "1.4",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-secondary, #94a3b8)",
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
    padding: "11px 14px 11px 40px",
    fontSize: "14px",
    backgroundColor: "var(--bg-secondary, #0f172a)",
    border: "1px solid var(--border-color, #334155)",
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
    backgroundColor: "var(--accent-color, #3b82f6)",
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
    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
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
