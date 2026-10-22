import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, UserCheck, ShieldAlert, Sparkles } from "lucide-react";

/**
 * DisplayNamePolicyModal
 * Explains why LetsChat enforces username/display-name availability,
 * how dynamic per-chat naming works, and why impersonation is restricted.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback to close the modal
 */
export const DisplayNamePolicyModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={styles.backdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={styles.card}
          >
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.iconBadge}>
                <ShieldCheck size={22} color="#60a5fa" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={styles.title}>Why Display Names Are Protected</h3>
                <p style={styles.subtitle}>Anti-impersonation & dynamic identity in LetsChat</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={styles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>

            {/* Explanation Content */}
            <div style={styles.body}>
              <div style={styles.item}>
                <div style={styles.itemIconWrap}>
                  <Sparkles size={16} color="#38bdf8" />
                </div>
                <div>
                  <h4 style={styles.itemTitle}>Permanent Public Username</h4>
                  <p style={styles.itemText}>
                    Your username (@username) is permanent, unique, and set at account creation. It provides a reliable, recognisable anchor across the entire platform.
                  </p>
                </div>
              </div>

              <div style={styles.item}>
                <div style={styles.itemIconWrap}>
                  <ShieldAlert size={16} color="#f59e0b" />
                </div>
                <div>
                  <h4 style={styles.itemTitle}>Display Name (24h Cooldown)</h4>
                  <p style={styles.itemText}>
                    You can change your profile display name once every 24 hours. To ensure consistency, it must retain at least 3/10 similarity with your permanent username.
                  </p>
                </div>
              </div>

              <div style={styles.item}>
                <div style={styles.itemIconWrap}>
                  <UserCheck size={16} color="#10b981" />
                </div>
                <div>
                  <h4 style={styles.itemTitle}>Custom Per-Chat Names</h4>
                  <p style={styles.itemText}>
                    You can personalize how you appear in each individual group or chat. To prevent confusion, your chat nickname must be similar (&ge; 3/10) to your username and distinct (&lt; 8/10) from other participants.
                  </p>
                </div>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={onClose}
              style={styles.primaryBtn}
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(3, 7, 18, 0.78)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
    padding: "16px",
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "#0d1527",
    border: "1px solid rgba(59, 130, 246, 0.25)",
    borderRadius: "18px",
    width: "100%",
    maxWidth: "400px",
    padding: "20px 22px",
    boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)",
    boxSizing: "border-box",
    color: "#f8fafc",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px",
    paddingBottom: "14px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  iconBadge: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#f8fafc",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: "2px 0 0 0",
    fontSize: "12px",
    color: "#94a3b8",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    transition: "color 0.15s ease",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    marginBottom: "20px",
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  itemIconWrap: {
    marginTop: "2px",
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemTitle: {
    margin: "0 0 3px 0",
    fontSize: "13px",
    fontWeight: "600",
    color: "#e2e8f0",
  },
  itemText: {
    margin: 0,
    fontSize: "12px",
    color: "#94a3b8",
    lineHeight: "1.45",
  },
  primaryBtn: {
    width: "100%",
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#2563eb",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
};

export default DisplayNamePolicyModal;
