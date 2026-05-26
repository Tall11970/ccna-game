import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiClient, AnalyticsOverview } from '../services/api';
import { TrendingUp, Users, Activity, Calendar } from 'lucide-react';
import './DashboardPage.css';

interface DashboardPageProps {
  onLogout: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.getAnalyticsOverview();
        setAnalytics(data);
      } catch (err: any) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleLogout = () => {
    apiClient.logout();
    onLogout();
    navigate('/login');
  };

  const handleGenerateSnapshot = async () => {
    try {
      setIsGeneratingSnapshot(true);
      setSnapshotMessage('');
      await apiClient.generateSnapshot();
      setSnapshotMessage('✅ Snapshot generated successfully!');
      // Refresh analytics to show new snapshot
      const data = await apiClient.getAnalyticsOverview();
      setAnalytics(data);
    } catch (err: any) {
      setSnapshotMessage('❌ Failed to generate snapshot');
    } finally {
      setIsGeneratingSnapshot(false);
    }
  };

  if (isLoading) {
    return (
      <Layout pageTitle="Dashboard" onLogout={handleLogout}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Dashboard" onLogout={handleLogout}>
      {error && (
        <div className="error-message" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div className="card-grid">
        <div className="metric-card success">
          <div className="metric-label">
            <Users size={16} style={{ marginRight: '4px' }} />
            Total Users
          </div>
          <div className="metric-value">{analytics?.totalUsers || 0}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            <Calendar size={16} style={{ marginRight: '4px' }} />
            New This Month
          </div>
          <div className="metric-value">{analytics?.newUsersThisMonth || 0}</div>
        </div>

        <div className="metric-card warning">
          <div className="metric-label">
            <Activity size={16} style={{ marginRight: '4px' }} />
            Active (Last 7 Days)
          </div>
          <div className="metric-value">{analytics?.activeUsersLast7Days || 0}</div>
        </div>

        <div
          className="metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/analytics#engagement')}
          title="Click to view detailed engagement analytics"
        >
          <div className="metric-label">
            <TrendingUp size={16} style={{ marginRight: '4px' }} />
            Engagement Rate ↗
          </div>
          <div className="metric-value">
            {analytics?.totalUsers
              ? Math.round((analytics.activeUsersLast7Days / analytics.totalUsers) * 100)
              : 0}
            %
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Active users ÷ total users (7d)
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h3>Quick Actions</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Manage users and view detailed analytics
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-primary"
            onClick={() => navigate('/users')}
          >
            Manage Users
          </button>
          <button className="btn-secondary" onClick={() => navigate('/analytics')}>
            Advanced Analytics
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Latest Snapshot</h3>
          <button
            className="btn-primary"
            onClick={handleGenerateSnapshot}
            disabled={isGeneratingSnapshot}
          >
            {isGeneratingSnapshot ? 'Generating...' : '📸 Generate Snapshot'}
          </button>
        </div>

        {snapshotMessage && (
          <p style={{ marginBottom: '16px', color: snapshotMessage.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>
            {snapshotMessage}
          </p>
        )}

        {analytics?.latestSnapshot ? (
          <div className="snapshot-grid">
            <div className="snapshot-item">
              <span className="snapshot-label">Date</span>
              <span className="snapshot-value">{new Date(analytics.latestSnapshot.snapshot_date).toLocaleDateString()}</span>
            </div>
            <div className="snapshot-item">
              <span className="snapshot-label">Total Users</span>
              <span className="snapshot-value">{analytics.latestSnapshot.total_users ?? '-'}</span>
            </div>
            <div className="snapshot-item">
              <span className="snapshot-label">Active Users</span>
              <span className="snapshot-value">{analytics.latestSnapshot.active_users ?? '-'}</span>
            </div>
            <div className="snapshot-item">
              <span className="snapshot-label">New Users</span>
              <span className="snapshot-value">{analytics.latestSnapshot.new_users ?? '-'}</span>
            </div>
            <div className="snapshot-item">
              <span className="snapshot-label">Quizzes Completed</span>
              <span className="snapshot-value">{analytics.latestSnapshot.quizzes_completed ?? '-'}</span>
            </div>
            <div className="snapshot-item">
              <span className="snapshot-label">Avg Quiz Score</span>
              <span className="snapshot-value">{analytics.latestSnapshot.avg_quiz_score ? `${analytics.latestSnapshot.avg_quiz_score}%` : '-'}</span>
            </div>
            <div className="snapshot-item">
              <span className="snapshot-label">Avg Session</span>
              <span className="snapshot-value">
                {analytics.latestSnapshot.avg_session_duration_seconds
                  ? `${Math.round(analytics.latestSnapshot.avg_session_duration_seconds / 60)} min`
                  : '-'}
              </span>
            </div>

            {analytics.latestSnapshot.top_topics?.length > 0 && (
              <div className="snapshot-item" style={{ gridColumn: '1 / -1' }}>
                <span className="snapshot-label">Top Topics</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {analytics.latestSnapshot.top_topics.slice(0, 5).map((topic: any) => (
                    <span key={topic.topic_id} style={{
                      background: 'rgba(0,212,255,0.1)',
                      border: '1px solid rgba(0,212,255,0.3)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.85rem'
                    }}>
                      {topic.topic_id} — {topic.attempts} attempts
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>
            No snapshot data yet. Click "Generate Snapshot" to capture today's metrics.
          </p>
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
