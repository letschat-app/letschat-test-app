import React, { useState, useEffect } from 'react';
import { Camera, Mic, CheckCircle2, Download, Smartphone, Bell } from 'lucide-react';
import { usePWA } from '../../context/PWAContext';
import { useNotifications } from '../../hooks/useNotifications';

const PermissionPromptModal = ({ isOpen, onComplete, onSkip, initialStep = null }) => {
  const { deferredPrompt, isInstalled, installApp } = usePWA();
  const { requestPermissionAndGetToken } = useNotifications();
  const [step, setStep] = useState(0); // 0: Install, 1: Media, 2: Notifications

  useEffect(() => {
    if (isOpen) {
      if (initialStep !== null) {
        setStep(initialStep);
      } else if (isInstalled || !deferredPrompt) {
        setStep(1);
      } else {
        setStep(0);
      }
    }
  }, [isOpen, initialStep, isInstalled, deferredPrompt]);

  if (!isOpen) return null;

  const handleInstall = async () => {
    await installApp();
    setStep(1);
  };

  const requestMediaPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setStep(2);
    } catch (err) {
      console.error('Media permission denied:', err);
      setStep(2); // Still move to notifications
    }
  };

  const handleEnableNotifications = async () => {
    await requestPermissionAndGetToken();
    onComplete();
  };

  const renderInstallStep = () => (
    <>
      <div style={styles.header}>
        <div style={styles.iconCircle}>
          <Smartphone size={40} color="var(--accent-color)" />
        </div>
        <h2 style={styles.title}>Install LetsChat</h2>
        <p style={styles.subtitle}>Get the best experience by installing our app on your device.</p>
      </div>

      <div style={styles.content}>
        <div style={styles.featureList}>
          <div style={styles.featureItem}>
            <CheckCircle2 size={18} color="#10b981" />
            <span>Fast and reliable access from your home screen</span>
          </div>
          <div style={styles.featureItem}>
            <CheckCircle2 size={18} color="#10b981" />
            <span>Real-time notifications for new messages</span>
          </div>
          <div style={styles.featureItem}>
            <CheckCircle2 size={18} color="#10b981" />
            <span>Optimized performance and data usage</span>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <button onClick={() => setStep(1)} style={styles.skipButton}>Maybe later</button>
        <button onClick={handleInstall} style={styles.allowButton}>
          <Download size={18} style={{ marginRight: '8px' }} />
          Install App
        </button>
      </div>
    </>
  );

  const renderMediaStep = () => (
    <>
      <div style={styles.header}>
        <div style={styles.iconCircle}>
          <Camera size={40} color="var(--accent-color)" />
        </div>
        <h2 style={styles.title}>Media Access</h2>
        <p style={styles.subtitle}>Enable camera and microphone for photos and voice messages.</p>
      </div>

      <div style={styles.content}>
        <div style={styles.permissionItem}>
          <div style={styles.itemIcon}>
            <Mic size={24} color="var(--accent-color)" />
          </div>
          <div style={styles.itemText}>
            <h3 style={styles.itemTitle}>Microphone & Camera</h3>
            <p style={styles.itemDesc}>Required for the interactive features of LetsChat.</p>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <button onClick={() => setStep(2)} style={styles.skipButton}>Skip</button>
        <button onClick={requestMediaPermissions} style={styles.allowButton}>Enable Media</button>
      </div>
    </>
  );

  const renderNotificationsStep = () => (
    <>
      <div style={styles.header}>
        <div style={styles.iconCircle}>
          <Bell size={40} color="var(--accent-color)" />
        </div>
        <h2 style={styles.title}>Stay Notified</h2>
        <p style={styles.subtitle}>Get alerts for new messages even when the app is closed.</p>
      </div>

      <div style={styles.content}>
        <div style={styles.permissionItem}>
          <div style={styles.itemIcon}>
            <Bell size={24} color="var(--accent-color)" />
          </div>
          <div style={styles.itemText}>
            <h3 style={styles.itemTitle}>Push Notifications</h3>
            <p style={styles.itemDesc}>Never miss an important message with real-time push alerts.</p>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <button onClick={onSkip} style={styles.skipButton}>Skip for now</button>
        <button onClick={handleEnableNotifications} style={styles.allowButton}>Enable Alerts</button>
      </div>
    </>
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {step === 0 && renderInstallStep()}
        {step === 1 && renderMediaStep()}
        {step === 2 && renderNotificationsStep()}
      </div>
    </div>
  );
};


const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '24px',
    border: '1px solid var(--border-color)',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  iconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    color: 'var(--text-primary)'
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: '1.4'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  permissionItem: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: '16px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  itemIcon: {
    marginTop: '2px'
  },
  itemText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  itemTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    color: 'var(--text-primary)'
  },
  itemDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: '1.4'
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '8px 0'
  },
  featureItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    fontSize: '14px',
    color: 'var(--text-secondary)'
  },
  footer: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  allowButton: {
    flex: 1.5,
    padding: '14px',
    backgroundColor: 'var(--accent-color)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
  },
  skipButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};

export default PermissionPromptModal;
