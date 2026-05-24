import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiClient, UserDetail } from '../services/api';
import { ArrowLeft, Edit2, Trash2, RotateCcw } from 'lucide-react';
import './UserDetailPage.css';

interface UserDetailPageProps {
  onLogout: () => void;
}

const UserDetailPage: React.FC<UserDetailPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    level: 0,
    admin_notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserDetail();
    }
  }, [userId]);

  const fetchUserDetail = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await apiClient.getUserDetail(userId);

      // The API returns { user, quizzes, sessions, completions, stats }
      // Flatten the nested structure into a single UserDetail object
      const completeUserData: UserDetail = {
        ...(response.user || response),
        quizzes: response.quizzes || [],
        sessions: response.sessions || [],
        completions: response.completions || [],
        stats: response.stats || { totalLessonsCompleted: 0, totalQuizzes: 0, avgQuizScore: 0 }
      };

      setUser(completeUserData);
      setEditData({
        username: completeUserData.username || '',
        level: completeUserData.level,
        admin_notes: completeUserData.admin_notes || '',
      });
    } catch (err: any) {
      console.error('Failed to fetch user details:', err);
      setError('Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    onLogout();
    navigate('/login');
  };

  const handleSaveChanges = async () => {
    if (!userId) return;

    try {
      setIsSaving(true);
      await apiClient.updateUser(userId, editData);
      alert('User updated successfully');
      setIsEditing(false);
      fetchUserDetail();
    } catch (err: any) {
      console.error('Failed to update user:', err);
      alert(err.response?.data?.error || 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditData({
        username: user.username || '',
        level: user.level,
        admin_notes: user.admin_notes || '',
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!userId || !user) return;

    if (confirm(`Are you sure you want to delete ${user.username}? This action cannot be undone.`)) {
      try {
        await apiClient.deleteUser(userId);
        alert('User deleted successfully');
        navigate('/users');
      } catch (err: any) {
        console.error('Failed to delete user:', err);
        alert(err.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  const handleResetProgress = async () => {
    if (!userId || !user) return;

    if (confirm(`Reset progress for ${user.username}? This will reset their level and XP to 0.`)) {
      try {
        await apiClient.resetUserProgress(userId);
        alert('User progress reset successfully');
        fetchUserDetail();
      } catch (err: any) {
        console.error('Failed to reset progress:', err);
        alert(err.response?.data?.error || 'Failed to reset progress');
      }
    }
  };

  if (isLoading) {
    return (
      <Layout pageTitle="User Details" onLogout={handleLogout}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading user details...</p>
        </div>
      </Layout>
    );
  }

  if (error || !user) {
    console.error('Error state:', { error, user, userId });
    return (
      <Layout pageTitle="User Details" onLogout={handleLogout}>
        <div className="error-message">{error || 'User not found'}</div>
        <button className="btn-secondary" onClick={() => navigate('/users')}>
          <ArrowLeft size={16} />
          Back to Users
        </button>
      </Layout>
    );
  }

  if (!user.stats) {
    console.warn('Missing user.stats:', user);
    return (
      <Layout pageTitle="User Details" onLogout={handleLogout}>
        <div className="error-message">User data incomplete - missing stats</div>
        <button className="btn-secondary" onClick={() => navigate('/users')}>
          <ArrowLeft size={16} />
          Back to Users
        </button>
      </Layout>
    );
  }

  return (
    <Layout pageTitle={`User: ${user.username}`} onLogout={handleLogout}>
      <button
        className="btn-secondary"
        onClick={() => navigate('/users')}
        style={{ marginBottom: '20px' }}
      >
        <ArrowLeft size={16} />
        Back to Users
      </button>

      <div className="user-detail-grid">
        {/* User Info Card */}
        <div className="card">
          <div className="card-header">
            <h3>User Information</h3>
            {!isEditing && (
              <div className="card-actions">
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="edit-form">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={editData.username}
                  onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Level</label>
                <input
                  type="number"
                  className="form-control"
                  value={editData.level}
                  onChange={(e) => setEditData({ ...editData, level: parseInt(e.target.value) })}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Admin Notes</label>
                <textarea
                  className="form-control"
                  value={editData.admin_notes}
                  onChange={(e) => setEditData({ ...editData, admin_notes: e.target.value })}
                  rows={4}
                  placeholder="Internal notes about this user"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn-success"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="user-info">
              <div className="info-row">
                <span className="info-label">Username:</span>
                <span className="info-value">{user.username || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Level:</span>
                <span className="info-value">{user.level}</span>
              </div>
              <div className="info-row">
                <span className="info-label">XP:</span>
                <span className="info-value">{(user.xp || 0).toLocaleString()}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Streak:</span>
                <span className="info-value">{user.streak || 0}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status:</span>
                <span className="info-value">
                  {user.is_admin ? <span className="badge admin">ADMIN</span> : <span className="badge">USER</span>}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Last Updated:</span>
                <span className="info-value">{new Date(user.updated_at).toLocaleDateString()}</span>
              </div>
              {user.last_admin_login && (
                <div className="info-row">
                  <span className="info-label">Last Admin Login:</span>
                  <span className="info-value">{new Date(user.last_admin_login).toLocaleDateString()}</span>
                </div>
              )}
              {user.admin_notes && (
                <div className="info-row">
                  <span className="info-label">Admin Notes:</span>
                  <span className="info-value">{user.admin_notes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Card */}
        <div className="card">
          <h3>Statistics</h3>
          <div className="stat-group">
            <div className="stat-item">
              <span className="stat-label">Lessons Completed</span>
              <span className="stat-value">{user.stats.totalLessonsCompleted}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Quizzes Taken</span>
              <span className="stat-value">{user.stats.totalQuizzes}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Quiz Score</span>
              <span className="stat-value">{typeof user.stats.avgQuizScore === 'string' ? user.stats.avgQuizScore : (user.stats.avgQuizScore || 0).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button
            className="btn-secondary"
            onClick={handleResetProgress}
          >
            <RotateCcw size={16} />
            Reset Progress
          </button>
          <button
            className="btn-danger"
            onClick={handleDelete}
          >
            <Trash2 size={16} />
            Delete User
          </button>
        </div>
      </div>

      {/* Quiz History */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3>Recent Quiz Attempts ({user.quizzes?.length || 0})</h3>
        {user.quizzes && user.quizzes.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Score</th>
                  <th>Correct / Total</th>
                  <th>Time (seconds)</th>
                  <th>Attempted</th>
                </tr>
              </thead>
              <tbody>
                {user.quizzes.slice(0, 10).map((quiz) => (
                  <tr key={quiz.id}>
                    <td>{quiz.topic_id}</td>
                    <td>{quiz.score?.toFixed(2) || '-'}%</td>
                    <td>
                      {quiz.correct_answers}/{quiz.total_questions}
                    </td>
                    <td>{quiz.time_spent_seconds || '-'}</td>
                    <td>{new Date(quiz.attempted_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No quiz attempts yet</p>
        )}
      </div>

      {/* Sessions */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3>Recent Sessions ({user.sessions?.length || 0})</h3>
        {user.sessions && user.sessions.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Browser</th>
                  <th>Started</th>
                  <th>Duration (minutes)</th>
                </tr>
              </thead>
              <tbody>
                {user.sessions.slice(0, 10).map((session) => {
                  const duration = session.total_time_seconds
                    ? Math.round(session.total_time_seconds / 60)
                    : '-';
                  return (
                    <tr key={session.id}>
                      <td>{session.device_type || '-'}</td>
                      <td>{session.browser || '-'}</td>
                      <td>{new Date(session.session_start).toLocaleDateString()}</td>
                      <td>{duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No sessions recorded</p>
        )}
      </div>
    </Layout>
  );
};

export default UserDetailPage;
