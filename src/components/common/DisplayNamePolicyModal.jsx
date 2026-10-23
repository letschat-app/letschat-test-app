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
                <ShieldCheck size={22} color="var(--accent-text)" />
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
                  <h4 style={styles.itemTitle}>Public Username</h4>
                  <p style={styles.itemText}>
                    Your username (@username) is unique and set at account creation. It provides a reliable anchor across the entire platform.
                  </p>
                </div>
              </div>

              <div style={styles.item}>
                <div style={styles.itemIconWrap}>
                  <ShieldAlert size={16} color="var(--warning-color)" />
                </div>
                <div>
                  <h4 style={styles.itemTitle}>Display Name (24h Cooldown)</h4>
                  <p style={styles.itemText}>
                    You can change your profile display name once every 24 hours. To ensure consistency, it must be somewhat similar to your username.
                  </p>
                </div>
              </div>

              <div style={styles.item}>
                <div style={styles.itemIconWrap}>
                  <UserCheck size={16} color="var(--success-color)" />
                </div>
                <div>
                  <h4 style={styles.itemTitle}>Custom Per-Chat Names</h4>
                  <p style={styles.itemText}>
                    You can personalize how you appear in each individual group or chat. To prevent confusion and impersonation, your chat nickname must be somewhat similar to your username and cannot be too similar to other participants.
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
    border: "1px solid var(--accent-tint)",
    borderRadius: "18px",
    width: "100%",
    maxWidth: "400px",
    padding: "20px 22px",
    boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px var(--bg-hover)",
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
    borderBottom: "1px solid var(--bg-hover)",
  },
  iconBadge: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    backgroundColor: "var(--accent-tint)",
    border: "1px solid var(--accent-tint-border)",
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
    color: "var(--text-secondary)",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
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
    backgroundColor: "var(--bg-hover)",
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
    color: "var(--text-secondary)",
    lineHeight: "1.45",
  },
  primaryBtn: {
    width: "100%",
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "var(--accent-solid)",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
};

export default DisplayNamePolicyModal;
