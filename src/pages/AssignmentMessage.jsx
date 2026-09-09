import { Eye, Paperclip, Upload, X, FileText, Calendar, Award, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { API } from '../service/UserAuth';
import { uploadMedia, STAGE_LABELS } from '../service/MediaUploader';
import MediaMessage from '../components/chat/MediaMessage';
import { getAssignmentFromDB, saveAssignmentToDB, getSubmissionsFromDB, saveSubmissionsToDB, getGroupMembersFromDB } from '../service/db';
import { useState, useRef, useEffect } from 'react';
const AssignmentMessage = ({ id, userRole = 'student', isMobile = false, isPanel = false, isDetailOnly = false, onClose = null, onOpenPanel = null }) => {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [submissionText, setSubmissionText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadStates, setUploadStates] = useState({}); // Tracking individual file progress
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const fileInputRef = useRef(null);


  useEffect(() => {
    const fetchAssignment = async () => {
      // 1. Try to load from IDB first for instant UI
      try {
        const cached = await getAssignmentFromDB(id);
        if (cached) {
          setAssignment(cached);
          setLoading(false); // Show UI immediately if cache hits
        }
      } catch (e) {
        console.warn("IDB read failed:", e);
      }

      // 2. Always fetch from network to get fresh data
      try {
        const response = await fetch(
          `${API}/classroom/assignment/get/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "User-Id": localStorage.getItem("userid"),
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          data.deadline = new Date(data.deadline * 1000).toISOString();
          
          // Update UI with fresh data
          setAssignment(data);
          
          // Sync back to IDB
          saveAssignmentToDB({ ...data, id });
        } else {
           // If network fails and we have no cache, we might still be in loading state
           if (!assignment) throw new Error("Network fail and no cache");
        }
      } catch (err) {
        console.error("Fetch assignment failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [id]);

  // Fetch submissions
  useEffect(() => {
    if (assignment) {
      fetchSubmissions();
    }
  }, [userRole, assignment]);

  const fetchSubmissions = async () => {
    // 1. Try to load from IDB first for instant UI
    try {
      const cached = await getSubmissionsFromDB(id);
      if (cached) {
        console.log("Loaded submissions from offline cache");
        setSubmissions(cached);
      }
    } catch (e) {
      console.warn("Submissions IDB read failed:", e);
    }

    // 2. Always fetch from network to get fresh data
    try {
      if (userRole === 'faculty') {
        const response = await fetch(
          `${API}/classroom/submissions/getall/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "User-Id": localStorage.getItem("userid"),
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSubmissions(data);
          saveSubmissionsToDB(id, data);

          // Direct real-time group member resolution (bypassing IDB cache race conditions)
          const chatIdMatch = window.location.href.match(/\/chat\/([^/?#]+)/);
          const activeChatId = chatIdMatch ? chatIdMatch[1] : null;
          if (activeChatId) {
            fetch(`${API}/group/getmembers/${activeChatId}`, {
              headers: { "Content-Type": "application/json", "User-Id": localStorage.getItem("userid") }
            })
            .then(res => res.ok ? res.json() : null)
            .then(members => {
              if (members && members.length) {
                const profileMap = {};
                members.forEach(m => { profileMap[m.userId] = m.userName; });
                setUserProfiles(prev => ({ ...prev, ...profileMap }));
              }
            }).catch(e => {
              getGroupMembersFromDB(activeChatId).then(members => {
                if (members && members.length) {
                  const profileMap = {};
                  members.forEach(m => { profileMap[m.userId] = m.userName; });
                  setUserProfiles(prev => ({ ...prev, ...profileMap }));
                }
              }).catch(()=>{});
            });
          }
        }
      } else {
        // Student query scope
        const response = await fetch(
          `${API}/classroom/submission/get/${id}?id=${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "User-Id": localStorage.getItem("userid"),
            },
          }
        );

        if (response.ok) {
          const text = await response.text();
          if (text) {
             const data = JSON.parse(text);
             setSubmissions([data]);
             saveSubmissionsToDB(id, [data]);

             const chatIdMatch = window.location.href.match(/\/chat\/([^/?#]+)/);
             const activeChatId = chatIdMatch ? chatIdMatch[1] : null;
             if (activeChatId) {
               fetch(`${API}/group/getmembers/${activeChatId}`, {
                 headers: { "Content-Type": "application/json", "User-Id": localStorage.getItem("userid") }
               })
               .then(res => res.ok ? res.json() : null)
               .then(members => {
                 if (members && members.length) {
                   const profileMap = {};
                   members.forEach(m => { profileMap[m.userId] = m.userName; });
                   setUserProfiles(prev => ({ ...prev, ...profileMap }));
                 }
               }).catch(e => {
                 getGroupMembersFromDB(activeChatId).then(members => {
                   if (members && members.length) {
                     const profileMap = {};
                     members.forEach(m => { profileMap[m.userId] = m.userName; });
                     setUserProfiles(prev => ({ ...prev, ...profileMap }));
                   }
                 }).catch(()=>{});
               });
             }
          } else {
             setSubmissions([]);
             saveSubmissionsToDB(id, []);
          }
        }
      }
    } catch (err) {
      console.error("Submissions load fail:", err);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const oversized = files.filter(f => f.size > 50 * 1024 * 1024);
    if (oversized.length > 0) {
      alert(`Some files exceed the 50MB limit: ${oversized.map(f => f.name).join(', ')}`);
      e.target.value = '';
      return;
    }
    setUploadedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!submissionText.trim() && uploadedFiles.length === 0) {
      alert('Please add some text or upload a file');
      return;
    }

    setSubmitting(true);
    try {
      const mediaIds = [];

      // Upload each file and get mediaId
      for (const file of uploadedFiles) {
        const fileId = file.name + file.size;
        setUploadStates(prev => ({ ...prev, [fileId]: { progress: 0, stage: 'preparing' } }));

        try {
          const result = await uploadMedia(file, ({ stage, progress }) => {
            setUploadStates(prev => ({
              ...prev,
              [fileId]: { progress, stage }
            }));
          });
          mediaIds.push(result.mediaId);
          setUploadStates(prev => ({ ...prev, [fileId]: { ...prev[fileId], stage: 'done' } }));
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          alert(`Failed to upload ${file.name}: ${err.message}`);
          setSubmitting(false);
          return;
        }
      }

      const csvMediaIds = mediaIds.join(',');

      const submissionPayload = {
        assignmentId: parseInt(id, 10),
        comment: submissionText,
        content: csvMediaIds,
        userId: localStorage.getItem("userid"),
        timestamp: new Date().toISOString()
        // Specifically omitting 'submissionid' per schema design constraints
      };

      const response = await fetch(
        `${API}/classroom/assignment/submit/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Id": localStorage.getItem("userid"),
          },
          body: JSON.stringify(submissionPayload),
        }
      );

      if (response.ok) {
        alert('Assignment submitted successfully!');
        setShowSubmissionForm(false);
        setSubmissionText('');
        setUploadedFiles([]);
        setUploadStates({});
        if (onClose) onClose();
        else setShowModal(false);
      } else {
        alert('Failed to submit assignment');
      }
    } catch (err) {
      console.error('Error submitting assignment:', err);
      alert('Error submitting assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const getParsedDate = (dateString) => {
    if (!dateString) return new Date();
    const timeNum = Number(dateString);
    if (!isNaN(timeNum) && timeNum > 0 && timeNum < 100000000000) {
      return new Date(timeNum * 1000);
    }
    return new Date(dateString);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = getParsedDate(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isDeadlinePassed = () => {
    if (!assignment?.deadline) return false;
    return new Date(assignment.deadline) < new Date();
  };

  const handleClose = () => {
    if (onClose) onClose();
    else setShowModal(false);
  };

  if (loading) {
    return (
      <div style={{
        padding: isMobile ? '10px 12px' : '12px 16px',
        backgroundColor: '#374151',
        borderRadius: '10px',
        fontSize: isMobile ? '12px' : '13px',
        color: '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div className="spinner" style={{
          width: '14px',
          height: '14px',
          border: '2px solid #4b5563',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        Loading assignment...
      </div>
    );
  }

  if (!assignment) {
    return (
      <div style={{
        padding: isMobile ? '10px 12px' : '12px 16px',
        backgroundColor: '#7f1d1d',
        borderRadius: '10px',
        fontSize: isMobile ? '12px' : '13px',
        color: '#fca5a5',
      }}>
        ⚠️ Assignment not found
      </div>
    );
  }

  return (
    <>
      {/* Minimal Message Bubble */}
      {!isDetailOnly && (
        <div 
          onClick={(e) => {
            if (isMobile) {
              e.stopPropagation();
              onOpenPanel ? onOpenPanel(id) : setShowModal(true);
            }
          }}
          style={{
          padding: isMobile ? '10px 12px' : '12px 16px',
          backgroundColor: '#1e3a8a',
          borderRadius: '12px',
          border: '2px solid #3b82f6',
          maxWidth: '100%',
          cursor: isMobile ? 'pointer' : 'default',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: isMobile ? '8px' : '10px',
            marginBottom: '10px',
          }}>
            <div style={{
              width: isMobile ? '32px' : '36px',
              height: isMobile ? '32px' : '36px',
              backgroundColor: 'var(--accent-color)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: isMobile ? '16px' : '18px',
            }}>
              📝
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{
                margin: 0,
                fontSize: isMobile ? '14px' : '15px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {assignment.title}
              </h4>

              <p style={{
                margin: 0,
                fontSize: isMobile ? '12px' : '13px',
                color: '#bfdbfe',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: '1.4',
              }}>
                {assignment.description}
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: isMobile ? '11px' : '12px',
              color: isDeadlinePassed() ? '#fca5a5' : '#93c5fd',
              fontWeight: '500',
            }}>
              <Clock size={isMobile ? 14 : 16} />
              <span>{formatDate(assignment.deadline)}</span>
            </div>

            {!isMobile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPanel ? onOpenPanel(id) : setShowModal(true);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  padding: isMobile ? '6px 12px' : '7px 14px',
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: isMobile ? '12px' : '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-color)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Eye size={isMobile ? 14 : 16} />
                View Info
              </button>
            )}
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      {(showModal || isDetailOnly) && (
        <>
          {/* Backdrop */}
          {!isPanel && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                zIndex: 999,
                backdropFilter: 'blur(4px)',
              }}
              onClick={handleClose}
            />
          )}

          {/* Modal */}
          <div
            style={{
              ...(isPanel ? {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--bg-card)',
                height: '100%',
                overflow: 'hidden',
              } : {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'var(--message-bg-incoming)',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid #374151',
                zIndex: 1000,
                width: isMobile ? '95%' : '90%',
                maxWidth: '700px',
                maxHeight: isMobile ? '90vh' : '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              })
            }}
          >
            {/* Header */}
            <div style={{
              padding: isMobile ? '16px' : '20px',
              borderBottom: '1px solid #374151',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}>
              <div style={{
                width: isMobile ? '40px' : '48px',
                height: isMobile ? '40px' : '48px',
                backgroundColor: 'var(--accent-color)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '20px' : '24px',
                flexShrink: 0,
              }}>
                📝
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: isMobile ? '18px' : '20px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '4px',
                }}>
                  {assignment.title}
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: isMobile ? '12px' : '13px',
                  color: assignment.status === 'submitted' ? '#10b981' : '#9ca3af',
                  fontWeight: '500',
                }}>
                  {assignment.status === 'active' ? <CheckCircle size={14} /> : <span style={{ fontSize: '14px', fontWeight: '700' }}>X</span>}
                  <span style={{ textTransform: 'capitalize' }}>{assignment.status || 'closed'}</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                style={{
                  width: isMobile ? '32px' : '36px',
                  height: isMobile ? '32px' : '36px',
                  backgroundColor: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                 <span style={{ fontSize: '20px', fontWeight: '700' }}>X</span>
              </button>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: isMobile ? '16px' : '20px',
            }}>
              {/* Assignment Details */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: isMobile ? '14px' : '15px',
                  fontWeight: '600',
                  color: '#60a5fa',
                }}>
                  Description
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: isMobile ? '13px' : '14px',
                  color: '#d1d5db',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}>
                  {assignment.description}
                </p>
              </div>

              {/* Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: isMobile ? '12px' : '16px',
                marginBottom: '20px',
              }}>
                <div style={{
                  padding: isMobile ? '12px' : '14px',
                  backgroundColor: '#374151',
                  borderRadius: '10px',
                  border: '1px solid #4b5563',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}>
                    <Calendar size={16} color="#60a5fa" />
                    <span style={{
                      fontSize: isMobile ? '11px' : '12px',
                      color: '#9ca3af',
                      fontWeight: '500',
                    }}>
                      Deadline
                    </span>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: isMobile ? '13px' : '14px',
                    color: isDeadlinePassed() ? '#fca5a5' : 'var(--text-primary)',
                    fontWeight: '600',
                  }}>
                    {formatDate(assignment.deadline)}
                  </p>
                  {isDeadlinePassed() && (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--danger-color)',
                      fontWeight: '500',
                      marginTop: '4px',
                      display: 'block',
                    }}>
                      ⚠️ Deadline passed
                    </span>
                  )}
                </div>

                <div style={{
                  padding: isMobile ? '12px' : '14px',
                  backgroundColor: '#374151',
                  borderRadius: '10px',
                  border: '1px solid #4b5563',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}>
                    <Award size={16} color="#60a5fa" />
                    <span style={{
                      fontSize: isMobile ? '11px' : '12px',
                      color: '#9ca3af',
                      fontWeight: '500',
                    }}>
                      Maximum Marks
                    </span>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: isMobile ? '13px' : '14px',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                  }}>
                    {assignment.marks} points
                  </p>
                </div>
              </div>

              {/* Attachments */}
              {assignment.attachments && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: isMobile ? '14px' : '15px',
                    fontWeight: '600',
                    color: '#60a5fa',
                  }}>
                    Attachments
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {assignment.attachments.split(',').map((mediaId, idx) => (
                      <MediaMessage 
                        key={idx}
                        msg={{ content: mediaId.trim() }}
                        isMobile={isMobile}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Student: Submission Form */}
              {userRole === 'student' && !showSubmissionForm && submissions.length === 0 && (
                <button
                  onClick={() => {
                    if (isDeadlinePassed()) {
                      alert('Deadline has passed. Submission is not allowed.');
                      return;
                    }
                    setShowSubmissionForm(true);
                  }}
                  disabled={isDeadlinePassed()}
                  style={{
                    width: '100%',
                    padding: isMobile ? '12px' : '14px',
                    backgroundColor: isDeadlinePassed() ? '#4b5563' : '#10b981',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: isMobile ? '14px' : '15px',
                    fontWeight: '600',
                    cursor: isDeadlinePassed() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    opacity: isDeadlinePassed() ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeadlinePassed()) {
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDeadlinePassed()) {
                      e.currentTarget.style.backgroundColor = '#10b981';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <Upload size={18} />
                  {isDeadlinePassed() ? 'Submission Closed' : 'Add Your Work'}
                </button>
              )}

              {/* Student: Submission Interface */}
              {userRole === 'student' && showSubmissionForm && (
                <div style={{
                  padding: isMobile ? '16px' : '20px',
                  backgroundColor: '#111827',
                  borderRadius: '12px',
                  border: '2px solid #3b82f6',
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    fontSize: isMobile ? '15px' : '16px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                  }}>
                    Submit Your Work
                  </h4>

                  {/* Text Input */}
                  <textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Write your answer or add notes..."
                    style={{
                      minWidth: '90%',
                      minHeight: '120px',
                      padding: '12px',
                      backgroundColor: 'var(--message-bg-incoming)',
                      border: '1px solid #4b5563',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '13px' : '14px',
                      resize: 'vertical',
                      marginBottom: '16px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#4b5563'}
                  />

                  {/* Uploaded Files */}
                  {uploadedFiles.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      {uploadedFiles.map((file, index) => {
                        const fileId = file.name + file.size;
                        const state = uploadStates[fileId];
                        return (
                          <div
                            key={index}
                            style={{
                              padding: '12px',
                              backgroundColor: 'var(--message-bg-incoming)',
                              borderRadius: '10px',
                              marginBottom: '8px',
                              border: '1px solid #374151',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <FileText size={18} color="#60a5fa" />
                              <span style={{
                                flex: 1,
                                fontSize: '13px',
                                color: '#d1d5db',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {file.name}
                              </span>
                              {!submitting && (
                                <button
                                  onClick={() => removeFile(index)}
                                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                                >
                                  <span style={{ fontSize: '16px', fontWeight: '700' }}>X</span>
                                </button>
                              )}
                            </div>

                            {state && (
                              <div style={{ width: '100%' }}>
                                <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ width: `${state.progress}%`, height: '100%', backgroundColor: state.stage === 'done' ? '#10b981' : '#3b82f6', transition: 'width 0.3s' }} />
                                </div>
                                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{STAGE_LABELS[state.stage] || 'Waiting...'}</span>
                                  <span>{state.progress}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        flex: 1,
                        minWidth: isMobile ? '100%' : '140px',
                        padding: isMobile ? '10px 16px' : '11px 18px',
                        backgroundColor: '#374151',
                        color: 'var(--text-primary)',
                        border: '1px solid #4b5563',
                        borderRadius: '8px',
                        fontSize: isMobile ? '13px' : '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4b5563';
                        e.currentTarget.style.borderColor = '#60a5fa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#374151';
                        e.currentTarget.style.borderColor = '#4b5563';
                      }}
                    >
                      <Paperclip size={16} />
                      Add Files
                    </button>

                    <button
                      onClick={handleSubmit}
                      disabled={submitting || (!submissionText.trim() && uploadedFiles.length === 0)}
                      style={{
                        flex: 2,
                        minWidth: isMobile ? '100%' : '140px',
                        padding: isMobile ? '10px 16px' : '11px 18px',
                        backgroundColor: (submitting || (!submissionText.trim() && uploadedFiles.length === 0))
                          ? '#4b5563'
                          : '#10b981',
                        color: 'var(--text-primary)',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: isMobile ? '13px' : '14px',
                        fontWeight: '600',
                        cursor: (submitting || (!submissionText.trim() && uploadedFiles.length === 0))
                          ? 'not-allowed'
                          : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        opacity: (submitting || (!submissionText.trim() && uploadedFiles.length === 0)) ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!submitting && (submissionText.trim() || uploadedFiles.length > 0)) {
                          e.currentTarget.style.backgroundColor = '#059669';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!submitting && (submissionText.trim() || uploadedFiles.length > 0)) {
                          e.currentTarget.style.backgroundColor = '#10b981';
                        }
                      }}
                    >
                      {submitting ? (
                        <>
                          <div className="spinner" style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid #ffffff40',
                            borderTop: '2px solid #ffffff',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                          }} />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Submit Work
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Expand View Submissions interface natively to both scopes for display purposes */}
              {(userRole === 'faculty' || (userRole === 'student' && submissions.length > 0)) && (
                <div style={{
                  marginTop: '20px',
                  padding: isMobile ? '16px' : '20px',
                  backgroundColor: '#111827',
                  borderRadius: '12px',
                  border: '1px solid #374151',
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    fontSize: isMobile ? '15px' : '16px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <FileText size={18} color="#60a5fa" />
                    {userRole === 'faculty' ? 'Student Submissions' : 'Your Submitted Work'}
                  </h4>

                  {submissions.length === 0 ? (
                    <p style={{
                      margin: 0,
                      fontSize: isMobile ? '13px' : '14px',
                      color: '#9ca3af',
                      textAlign: 'center',
                      padding: '20px',
                    }}>
                      No submissions yet
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {submissions.map((submission, index) => (
                        <div
                          key={index}
                          style={{
                            padding: isMobile ? '12px' : '14px',
                            backgroundColor: 'var(--message-bg-incoming)',
                            borderRadius: '8px',
                            border: '1px solid #374151',
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '8px',
                          }}>
                            <div>
                              <p style={{
                                margin: '0 0 4px 0',
                                fontSize: isMobile ? '13px' : '14px',
                                color: 'var(--text-primary)',
                                fontWeight: '600',
                              }}>
                                {userProfiles[submission.userId] || submission.studentName || submission.userId}
                              </p>
                              <p style={{
                                margin: 0,
                                fontSize: isMobile ? '11px' : '12px',
                                color: '#9ca3af',
                              }}>
                                Submitted: {formatDate(submission.timestamp)}
                              </p>
                            </div>
                            <span style={{
                              padding: '4px 10px',
                              backgroundColor: getParsedDate(submission.timestamp) > new Date(assignment.deadline)
                                ? '#7f1d1d'
                                : '#065f46',
                              color: getParsedDate(submission.timestamp) > new Date(assignment.deadline)
                                ? '#fca5a5'
                                : '#10b981',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                            }}>
                              {new Date(submission.timestamp) > new Date(assignment.deadline) ? 'Late' : 'On Time'}
                            </span>
                          </div>
                          
                          {submission.comment && (
                            <p style={{ fontSize: '13px', color: '#e5e7eb', marginBottom: '8px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                              {submission.comment}
                            </p>
                          )}

                          {submission.content && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                              {submission.content.split(',').map((mediaId, idx) => (
                                <MediaMessage 
                                  key={idx}
                                  msg={{ content: mediaId.trim() }}
                                  isMobile={isMobile}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default AssignmentMessage;