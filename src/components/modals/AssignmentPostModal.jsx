import { X, FileText, Calendar, Clock, AlertCircle, CheckCircle2, ChevronDown, Paperclip, Loader2, Upload } from 'lucide-react';
import { uploadMedia, STAGE_LABELS } from '../../service/MediaUploader';
import { API } from '../../service/UserAuth';
import { useState, useRef, useEffect } from 'react';
const AssignmentPostModal = ({ chatid, onClose, sendApi, isPanel = false }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    attachments: '',
    marks: '100',
    deadline: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (error) setError(null);
  };

  const handleMarksChange = (value) => {
    const numValue = parseInt(value);
    if (value === '' || (numValue >= 0 && numValue <= 100)) {
      handleChange('marks', value);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError("This file exceeds the 50MB size limit and cannot be attached.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStage('preparing_metadata');
    setFileName(file.name);

    try {
      const result = await uploadMedia(file, ({ stage: s, progress: p }) => {
        setUploadStage(s);
        setUploadProgress(p);
      });

      handleChange('attachments', result.mediaId);
      setUploadStage('done');
      setUploadProgress(100);
      setTimeout(() => setUploading(false), 1000);
    } catch (err) {
      console.error('[AssignmentUpload]', err);
      setError('File upload failed: ' + err.message);
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError("Please enter a title for the assignment");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Convert deadline to UTC ISO if it exists
      let utcDeadline = null;
      if (formData.deadline) {
        utcDeadline = new Date(formData.deadline).toISOString();
      }

      const body = {
        title: formData.title,
        description: formData.description,
        attachments: formData.attachments,
        marks: formData.marks ? parseInt(formData.marks, 10) : 100,
        deadline: utcDeadline,
        created: new Date().toISOString(),
        chatId: chatid,
        status: "active",
      };

      const response = await fetch(`${API}/classroom/assignment/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Id": localStorage.getItem("userid"),
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const assignmentId = await response.text();
        const res = await sendApi(assignmentId);
        if (res && res.ok) {
          setHasChanges(false);
          onClose();
        } else {
          setError("Assignment saved, but failed to alert chat globally.");
        }
      } else {
        setError("Failed to post assignment. Please try again.");
      }
    } catch (error) {
      console.error("Failed to submit assignment:", error);
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowCloseWarning(true);
    } else {
      onClose();
    }
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const content = (
    <div className="assignment-panel-content" onClick={e => e.stopPropagation()} style={{
      backgroundColor: isPanel ? 'transparent' : 'rgba(15, 23, 42, 0.98)',
      width: '100%',
      maxWidth: isPanel ? 'none' : '500px',
      maxHeight: isPanel ? 'none' : '90vh',
      borderRadius: isPanel ? '0' : '24px',
      display: 'flex', flexDirection: 'column',
      border: isPanel ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: isPanel ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      position: 'relative', overflow: 'hidden',
      height: isPanel ? '100%' : 'auto'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center',
        background: isPanel ? 'rgba(15, 23, 42, 0.8)' : 'transparent',
        backdropFilter: isPanel ? 'blur(10px)' : 'none',
        position: isPanel ? 'sticky' : 'relative',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <FileText size={20} />
          </div>
          <h2 style={{ fontSize: isPanel ? '18px' : '20px', fontWeight: '700', color: '#f3f4f6', margin: 0 }}>Create Assignment</h2>
        </div>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px', fontSize: '24px', fontWeight: '700' }}>
          X
        </button>
      </div>

      {/* Scrollable Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', scrollbarWidth: 'none' }}>
        {error && (
          <div style={{
            display: 'flex', gap: '10px', padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px', marginBottom: '20px'
          }}>
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: '#f87171', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Assignment Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g. Mathematics Week 1 Quiz"
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Description & Instructions</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Provide details about the assignment..."
            style={{ ...inputStyle, minHeight: isPanel ? '150px' : '100px', resize: 'vertical', lineHeight: '1.6' }}
          />
        </div>

        {/* Marks & Attachments Row */}
        <div style={{ display: 'flex', flexDirection: isPanel ? 'column' : 'row', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: isPanel ? '100%' : '100px' }}>
            <label style={labelStyle}>Marks</label>
            <input
              type="number"
              value={formData.marks}
              onChange={(e) => handleMarksChange(e.target.value)}
              style={{ ...inputStyle, textAlign: isPanel ? 'left' : 'center' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Attachments (Media ID)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={formData.attachments}
                onChange={(e) => handleChange('attachments', e.target.value)}
                placeholder="Upload or enter Media ID"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  backgroundColor: uploading ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: uploading ? '#3b82f6' : '#9ca3af',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              </button>
            </div>

            {uploading && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '4px' }}>
                  {STAGE_LABELS[uploadStage] || 'Uploading...'} {fileName && `(${fileName})`}
                </div>
              </div>
            )}

            {formData.attachments && !uploading && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Ready: {formData.attachments}
              </div>
            )}
          </div>
        </div>

        {/* Deadline Section */}
        <div style={{
          padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: isPanel ? '40px' : '0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Calendar size={16} color="#9ca3af" />
            <label style={{ ...labelStyle, margin: 0 }}>Set Submission Deadline</label>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {[1, 3, 5, 7].map(days => (
              <button
                key={days}
                onClick={(e) => {
                  e.preventDefault();
                  const newDate = new Date();
                  newDate.setDate(newDate.getDate() + days);
                  newDate.setHours(23, 59, 59, 999);
                  handleChange('deadline', newDate.toISOString());
                }}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                }}
              >
                +{days} Day{days > 1 ? 's' : ''}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <input
                type="date"
                min={getMinDate()}
                value={formData.deadline ? new Date(formData.deadline).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (formData.deadline) {
                    const oldDate = new Date(formData.deadline);
                    newDate.setHours(oldDate.getHours(), oldDate.getMinutes());
                  }
                  handleChange('deadline', newDate.toISOString());
                }}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="time"
                value={formData.deadline ? new Date(formData.deadline).toLocaleTimeString('en-GB').substring(0, 5) : ''}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newDate = formData.deadline ? new Date(formData.deadline) : new Date();
                  newDate.setHours(hours, minutes);
                  handleChange('deadline', newDate.toISOString());
                }}
                style={inputStyle}
              />
            </div>
          </div>

          {formData.deadline && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} />
              Due on {new Date(formData.deadline).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        backgroundColor: isPanel ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.02)',
        position: isPanel ? 'sticky' : 'relative',
        bottom: 0,
        zIndex: 10
      }}>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px',
            backgroundColor: '#3b82f6', color: '#fff',
            border: 'none', fontWeight: '700', fontSize: '16px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
          }}
        >
          {isSubmitting ? 'Posting Assignment...' : 'Post Assignment'}
        </button>
      </div>

      {/* Close Warning Overlay */}
      {showCloseWarning && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '24px', textAlign: 'center'
        }}>
          <div style={{ animation: 'bounceIn 0.3s' }}>
            <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '12px' }}>Discard changes?</h3>
            <p style={{ color: '#9ca3af', marginBottom: '24px' }}>You have unsaved work. Are you sure you want to close?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={onClose} style={{ ...primaryBtnStyle, backgroundColor: '#ef4444' }}>Discard</button>
              <button onClick={() => setShowCloseWarning(false)} style={secondaryBtnStyle}>Keep Editing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isPanel) return content;

  return (
    <div className="modal-overlay" onClick={handleClose} style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {content}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b',
  marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'
};

const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#f3f4f6', fontSize: '15px', outline: 'none', transition: 'all 0.2s',
  boxSizing: 'border-box'
};

const primaryBtnStyle = {
  padding: '12px 24px', borderRadius: '12px', backgroundColor: '#3b82f6', color: '#fff',
  border: 'none', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
};

const secondaryBtnStyle = {
  padding: '12px 24px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#9ca3af',
  border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
};

export default AssignmentPostModal;
