import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, XCircle, Search, RefreshCcw, Download, Users, Award, BarChart3, Loader2 } from 'lucide-react';
import { API } from '../../service/UserAuth';
import Avatar from '../chat/Avatar';
import ClassroomReportModal from './ClassroomReportModal';

/**
 * ClassroomMatrixModal Component (Faculty Controls & Analytics Matrix)
 * Displays Student Completion Stats (Endpoint B: GET /api/classroom/{roomId}/student-stats)
 * Render Green Tick (✔) & Red Cross (✘) Matrix View for student submission status
 * Provides role-based control and triggers the Report Export Modal
 */
const ClassroomMatrixModal = ({ roomId, classroomName = '', userRole = 'student', isOpen, onClose }) => {
  const [studentStats, setStudentStats] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [matrixData, setMatrixData] = useState({}); // { [userId]: { [assignmentId]: { status: 'SUBMITTED' | 'MISSING', ... } } }
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'pending' | 'completed'
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'stats'

  // Enforce Role-Based Access Control
  const isFaculty = userRole === 'faculty' || userRole === 'admin';

  useEffect(() => {
    if (isOpen && isFaculty && roomId) {
      fetchData();
    }
  }, [isOpen, isFaculty, roomId]);

  const fetchData = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userid');

    try {
      // 1. Fetch Student Completion Stats (Endpoint B)
      const statsRes = await fetch(`${API}/classroom/${roomId}/student-stats`, {
        headers: { 'User-Id': userId, 'Content-Type': 'application/json' },
      });

      let statsList = [];
      if (statsRes.ok) {
        statsList = await statsRes.json();
        setStudentStats(statsList);
      } else {
        console.warn('Failed to fetch student stats, status:', statsRes.status);
      }

      // 2. Fetch Assignments for this classroom room
      const assignmentsRes = await fetch(`${API}/classroom/assignments/getall/${roomId}`, {
        headers: { 'User-Id': userId, 'Content-Type': 'application/json' },
      }).catch(() => null);

      let fetchedAssignments = [];
      if (assignmentsRes && assignmentsRes.ok) {
        fetchedAssignments = await assignmentsRes.json();
        setAssignments(fetchedAssignments);
      }

      // 3. Fetch Student Submission Statuses for each assignment (Endpoint A)
      if (fetchedAssignments.length > 0) {
        const matrix = {};
        for (const assign of fetchedAssignments) {
          const assignId = assign.id || assign.assignmentId;
          if (!assignId) continue;

          try {
            const studentStatusRes = await fetch(`${API}/classroom/assignment/${assignId}/students`, {
              headers: { 'User-Id': userId, 'Content-Type': 'application/json' },
            });

            if (studentStatusRes.ok) {
              const studentStatuses = await studentStatusRes.json();
              studentStatuses.forEach((st) => {
                if (!matrix[st.userId]) {
                  matrix[st.userId] = {};
                }
                matrix[st.userId][assignId] = st;
              });
            }
          } catch (e) {
            console.warn(`Failed to fetch student statuses for assignment ${assignId}:`, e);
          }
        }
        setMatrixData(matrix);
      }
    } catch (err) {
      console.error('Failed to load matrix analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Role Protection Check: If student attempts to view, block interface
  if (!isFaculty) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card, #1e293b)',
            padding: '24px',
            borderRadius: '16px',
            textAlign: 'center',
            maxWidth: '400px',
            color: 'var(--text-primary, #f8fafc)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <XCircle size={48} color="#ef4444" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>Access Restricted</h3>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-secondary, #94a3b8)' }}>
            Classroom Assignment Analytics and Matrix Reports are available exclusively to faculty members and instructors.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--accent-color, #3b82f6)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Filter students based on search and selected tab
  const filteredStudents = studentStats.filter((student) => {
    const matchesSearch =
      (student.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.userId || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'pending') {
      return (student.pendingAssignments || 0) > 0;
    } else if (filterTab === 'completed') {
      return (student.completionPercentage || 0) === 100;
    }
    return true;
  });

  // Calculate overall class summary stats
  const totalStudents = studentStats.length;
  const totalClassAssignments = assignments.length || (studentStats[0]?.totalAssignments || 0);
  const avgCompletion = totalStudents
    ? Math.round(
        studentStats.reduce((acc, curr) => acc + (curr.completionPercentage || 0), 0) / totalStudents
      )
    : 0;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '1100px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            color: 'var(--text-primary, #f8fafc)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar Header */}
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-color, #334155)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.12), transparent)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                }}
              >
                <BarChart3 size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Classroom Matrix Analytics</h2>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    Faculty View
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
                  {classroomName || `Room #${roomId}`} • Submission tracking & completion stats
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Export Matrix Report Button */}
              <button
                onClick={() => setShowExportModal(true)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'var(--accent-color, #3b82f6)',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Download size={16} />
                Export Matrix Report
              </button>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Overview Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color, #334155)',
              backgroundColor: 'var(--bg-secondary, #0f172a)',
            }}
          >
            <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>Enrolled Students</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary, #f8fafc)' }}>{totalStudents}</div>
            </div>

            <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>Total Assignments</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#60a5fa' }}>{totalClassAssignments}</div>
            </div>

            <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>Class Completion Rate</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: avgCompletion >= 75 ? '#34d399' : '#f59e0b' }}>
                {avgCompletion}%
              </div>
            </div>
          </div>

          {/* Sub-Header Controls */}
          <div
            style={{
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              borderBottom: '1px solid var(--border-color, #334155)',
            }}
          >
            {/* View Switcher Tabs */}
            <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-secondary, #0f172a)', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => setActiveTab('matrix')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'matrix' ? 'var(--accent-color, #3b82f6)' : 'transparent',
                  color: activeTab === 'matrix' ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ✔ Matrix View (Grid)
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'stats' ? 'var(--accent-color, #3b82f6)' : 'transparent',
                  color: activeTab === 'stats' ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                📊 Student Stats List
              </button>
            </div>

            {/* Search & Refresh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 32px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, #334155)',
                    backgroundColor: 'var(--bg-secondary, #0f172a)',
                    color: 'var(--text-primary, #f8fafc)',
                    fontSize: '13px',
                    outline: 'none',
                    width: '200px',
                  }}
                />
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                title="Refresh Data"
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color, #334155)',
                  backgroundColor: 'var(--bg-secondary, #0f172a)',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#60a5fa' }} />
                <p style={{ margin: 0, fontWeight: '600' }}>Loading assignment matrix analytics...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: '600' }}>No student record data found matching filters.</p>
              </div>
            ) : activeTab === 'matrix' ? (
              /* Green Tick (✔) & Red Cross (✘) Matrix View Table */
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color, #334155)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary, #0f172a)', borderBottom: '1px solid var(--border-color, #334155)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: '700', minWidth: '180px', position: 'sticky', left: 0, backgroundColor: 'var(--bg-secondary, #0f172a)', zIndex: 2 }}>
                        Student Name
                      </th>
                      {assignments.map((assign, idx) => (
                        <th key={assign.id || idx} style={{ padding: '12px 16px', fontWeight: '700', minWidth: '140px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: '700' }}>{assign.title || `Assignment ${idx + 1}`}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 'normal' }}>
                            {assign.marks ? `${assign.marks} pts` : 'Task'}
                          </div>
                        </th>
                      ))}
                      {assignments.length === 0 && (
                        <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                          No Assignments Posted Yet
                        </th>
                      )}
                      <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right', minWidth: '110px' }}>Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const stMatrix = matrixData[student.userId] || {};
                      const pct = student.completionPercentage || 0;

                      return (
                        <tr
                          key={student.userId}
                          style={{
                            borderBottom: '1px solid var(--border-color, #334155)',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Student Info Sticky Column */}
                          <td
                            style={{
                              padding: '12px 16px',
                              position: 'sticky',
                              left: 0,
                              backgroundColor: 'var(--bg-card, #1e293b)',
                              zIndex: 1,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Avatar
                                chat={{ profile: student.profilePic, userName: student.userName }}
                                size={32}
                              />
                              <div>
                                <div style={{ fontWeight: '700', color: 'var(--text-primary, #f8fafc)' }}>{student.userName}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>ID: {student.userId}</div>
                              </div>
                            </div>
                          </td>

                          {/* Matrix Assignment Cells */}
                          {assignments.map((assign) => {
                            const assignId = assign.id || assign.assignmentId;
                            const statusObj = stMatrix[assignId];
                            const isSubmitted = statusObj ? statusObj.status === 'SUBMITTED' : false;

                            return (
                              <td key={assignId} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                {isSubmitted ? (
                                  <span
                                    title={statusObj?.submittedAt ? `Submitted: ${new Date(statusObj.submittedAt).toLocaleDateString()}` : 'Submitted'}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      backgroundColor: 'rgba(16, 185, 129, 0.18)',
                                      color: '#34d399',
                                      fontWeight: '800',
                                      fontSize: '11px',
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                    }}
                                  >
                                    <CheckCircle2 size={13} /> SUBMITTED
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                      color: '#f87171',
                                      fontWeight: '800',
                                      fontSize: '11px',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                    }}
                                  >
                                    <XCircle size={13} /> MISSING
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {assignments.length === 0 && (
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                              -
                            </td>
                          )}

                          {/* Progress Cell */}
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <span style={{ fontWeight: '800', color: pct >= 80 ? '#34d399' : pct >= 50 ? '#f59e0b' : '#f87171' }}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Student Stats Overview Cards List */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {filteredStudents.map((student) => {
                  const pct = student.completionPercentage || 0;
                  return (
                    <div
                      key={student.userId}
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--bg-secondary, #0f172a)',
                        border: '1px solid var(--border-color, #334155)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Avatar chat={{ profile: student.profilePic, userName: student.userName }} size={44} />
                        <div>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>{student.userName}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>ID: {student.userId}</span>
                        </div>
                      </div>

                      {/* Stats numbers */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
                        <span>Completed: <strong style={{ color: '#34d399' }}>{student.completedAssignments || 0}</strong></span>
                        <span>Pending: <strong style={{ color: '#f87171' }}>{student.pendingAssignments || 0}</strong></span>
                        <span>Total: <strong>{student.totalAssignments || 0}</strong></span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontWeight: '700' }}>
                          <span>Completion Rate</span>
                          <span style={{ color: pct >= 80 ? '#34d399' : '#f59e0b' }}>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              backgroundColor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Report Modal */}
      {showExportModal && (
        <ClassroomReportModal
          roomId={roomId}
          classroomName={classroomName}
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
};

export default ClassroomMatrixModal;
