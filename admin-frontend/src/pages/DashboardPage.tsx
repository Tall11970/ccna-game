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

        <div className="metric-card">
          <div className="metric-label">
            <TrendingUp size={16} style={{ marginRight: '4px' }} />
            Engagement Rate
          </div>
          <div className="metric-value">
            {analytics?.totalUsers
              ? Math.round((analytics.activeUsersLast7Days / analytics.totalUsers) * 100)
              : 0}
            %
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
          <button className="btn-secondary" disabled>
            Advanced Analytics (Coming Soon)
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h3>Latest Snapshot</h3>
        {analytics?.latestSnapshot ? (
          <div className="snapshot-info">
            <p>
              <strong>Date:</strong> {new Date(analytics.latestSnapshot.snapshot_date).toLocaleDateString()}
            </p>
            {analytics.latestSnapshot.top_topics && (
              <div>
                <strong>Top Topics:</strong>
                <ul style={{ marginLeft: '20px' }}>
                  {Array.isArray(analytics.latestSnapshot.top_topics) &&
                    analytics.latestSnapshot.top_topics.slice(0, 5).map((topic: any) => (
                      <li key={topic.topic_id}>
                        {topic.topic_id}: {topic.views} views, {topic.completions} completions
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No snapshot data available yet</p>
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
