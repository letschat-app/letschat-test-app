import React, { useState } from 'react';
import { X, FileText, Download, Mail, CheckCircle2, Loader2, Share2 } from 'lucide-react';
import { API } from '../../service/UserAuth';

/**
 * ClassroomReportModal Component
 * Allows faculty to export Classroom Assignment Matrix Reports:
 * - Format Selection: PDF (.pdf), Excel (.xlsx), CSV (.csv)
 * - Delivery Modes: 
 *   Option 1: Download / Share in App (Endpoint C: GET /api/classroom/{roomId}/export-report?format=...)
 *   Option 2: Email Matrix Report (Endpoint D: POST /api/classroom/{roomId}/email-report?email=...&format=...)
 */
const ClassroomReportModal = ({ roomId, classroomName = '', isOpen, onClose }) => {
  const [format, setFormat] = useState('pdf'); // 'pdf' | 'excel' | 'csv'
  const [deliveryMode, setDeliveryMode] = useState('download'); // 'download' | 'email'
  const [email, setEmail] = useState(() => localStorage.getItem('email') || localStorage.getItem('userid') || '');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleExport = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setLoading(true);

    const userId = localStorage.getItem('userid');

    try {
      if (deliveryMode === 'download') {
        // Endpoint C: Download Matrix Report
        const response = await fetch(`${API}/classroom/${roomId}/export-report?format=${format}`, {
          method: 'GET',
          headers: {
            'User-Id': userId,
          },
        });

        if (!response.ok) {
          throw new Error(`Export failed with status ${response.status}`);
        }

        const blob = await response.blob();
        const extMap = { pdf: 'pdf', excel: 'xlsx', csv: 'csv' };
        const ext = extMap[format] || 'pdf';
        const fileName = `Classroom_${classroomName || roomId}_Report.${ext}`;

        // Attempt Native Web Share API if supported on mobile devices for file sharing
        if (navigator.canShare && navigator.share && window.File) {
          try {
            const file = new File([blob], fileName, { type: blob.type });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `Classroom Matrix Report - ${classroomName || roomId}`,
                text: `Attached is the classroom assignment matrix report for ${classroomName || roomId}.`,
              });
              setSuccessMessage('Report shared successfully!');
              setLoading(false);
              setTimeout(() => { onClose(); }, 2000);
              return;
            }
          } catch (shareErr) {
            console.warn('Native share cancelled or failed, falling back to direct browser download:', shareErr);
          }
        }

        // Standard File Download Trigger
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        setSuccessMessage('Report downloaded successfully!');
        setTimeout(() => { onClose(); }, 2000);

      } else {
        // Endpoint D: Email Matrix Report
        if (!email || !email.includes('@')) {
          setErrorMessage('Please enter a valid email address.');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API}/classroom/${roomId}/email-report?email=${encodeURIComponent(email.trim())}&format=${format}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Id': userId,
          },
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to send email (Status ${response.status})`);
        }

        const data = await response.json().catch(() => ({}));
        setSuccessMessage(data.message || `Report emailed successfully to ${email}!`);
        setTimeout(() => { onClose(); }, 2500);
      }
    } catch (err) {
      console.error('Report export error:', err);
      setErrorMessage(err.message || 'An error occurred while generating the report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          color: 'var(--text-primary, #f8fafc)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15), transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Export Matrix Report</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
                {classroomName || `Classroom #${roomId}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExport} style={{ padding: '20px' }}>
          {/* Format Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              1. Select Report Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { id: 'pdf', label: 'PDF Document', ext: '.pdf', icon: '📄' },
                { id: 'excel', label: 'Excel Sheet', ext: '.xlsx', icon: '📊' },
                { id: 'csv', label: 'CSV File', ext: '.csv', icon: '📝' },
              ].map((item) => {
                const isSelected = format === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormat(item.id)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '12px',
                      border: `2px solid ${isSelected ? 'var(--accent-color, #3b82f6)' : 'var(--border-color, #334155)'}`,
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary, #0f172a)',
                      color: isSelected ? '#60a5fa' : 'var(--text-primary, #f8fafc)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{item.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{item.label}</span>
                    <span style={{ fontSize: '10px', opacity: 0.7 }}>{item.ext}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delivery Options */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              2. Delivery Method
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Download / Share */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `1px solid ${deliveryMode === 'download' ? 'var(--accent-color, #3b82f6)' : 'var(--border-color, #334155)'}`,
                  backgroundColor: deliveryMode === 'download' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary, #0f172a)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  value="download"
                  checked={deliveryMode === 'download'}
                  onChange={() => setDeliveryMode('download')}
                  style={{ accentColor: 'var(--accent-color, #3b82f6)' }}
                />
                <Download size={18} color={deliveryMode === 'download' ? '#60a5fa' : '#94a3b8'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>Download / Share in App</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                    Save file locally or launch native share sheet (WhatsApp, Files, Telegram)
                  </div>
                </div>
              </label>

              {/* Option 2: Email Report */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `1px solid ${deliveryMode === 'email' ? 'var(--accent-color, #3b82f6)' : 'var(--border-color, #334155)'}`,
                  backgroundColor: deliveryMode === 'email' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary, #0f172a)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  value="email"
                  checked={deliveryMode === 'email'}
                  onChange={() => setDeliveryMode('email')}
                  style={{ accentColor: 'var(--accent-color, #3b82f6)' }}
                />
                <Mail size={18} color={deliveryMode === 'email' ? '#60a5fa' : '#94a3b8'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>Send to Email</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                    Deliver formatted document with classroom summary directly to email
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Email Input Field (shown when deliveryMode === 'email') */}
          {deliveryMode === 'email' && (
            <div style={{ marginBottom: '20px', animation: 'fadeIn 0.2s ease' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-secondary, #94a3b8)' }}>
                Faculty Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@school.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color, #334155)',
                  backgroundColor: 'var(--bg-secondary, #0f172a)',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              {successMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #334155)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary, #94a3b8)',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'var(--accent-color, #3b82f6)',
                color: '#ffffff',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  {deliveryMode === 'download' ? <Download size={16} /> : <Mail size={16} />}
                  {deliveryMode === 'download' ? 'Export Report' : 'Send Email'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassroomReportModal;
