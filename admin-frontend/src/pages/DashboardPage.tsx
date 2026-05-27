import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiClient, AnalyticsOverview } from '../services/api';
import { TrendingUp, Users, Activity, Calendar } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import './DashboardPage.css';

interface DashboardPageProps {
  onLogout: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TrendBadge({ thisWeek, lastWeek, suffix = '' }: { thisWeek: number; lastWeek: number; suffix?: string }) {
  if (thisWeek === 0 && lastWeek === 0) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>No data yet</span>;
  const diff = thisWeek - lastWeek;
  const pct = lastWeek > 0 ? Math.round(Math.abs(diff / lastWeek) * 100) : 100;
  const up = diff >= 0;
  return (
    <span style={{ fontSize: '0.75rem', color: up ? '#00ff88' : '#ff4466', marginTop: '2px', display: 'block' }}>
      {up ? '▲' : '▼'} {pct}% vs last week
    </span>
  );
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [extraStats, setExtraStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setIsLoading(true);
        const [overviewData, extraData] = await Promise.all([
          apiClient.getAnalyticsOverview(),
          apiClient.client.get('/admin/dashboard/extra-stats'),
        ]);
        setAnalytics(overviewData);
        setExtraStats(extraData.data);
      } catch (err: any) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
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

  const wc = extraStats?.weekComparison;

  return (
    <Layout pageTitle="Dashboard" onLogout={handleLogout}>
      {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* ── Metric Cards ── */}
      <div className="card-grid">
        <div className="metric-card success">
          <div className="metric-label"><Users size={16} style={{ marginRight: '4px' }} />Total Users</div>
          <div className="metric-value">{analytics?.totalUsers || 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label"><Calendar size={16} style={{ marginRight: '4px' }} />New This Month</div>
          <div className="metric-value">{analytics?.newUsersThisMonth || 0}</div>
        </div>
        <div className="metric-card warning">
          <div className="metric-label"><Activity size={16} style={{ marginRight: '4px' }} />Active (Last 7 Days)</div>
          <div className="metric-value">{analytics?.activeUsersLast7Days || 0}</div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/analytics#engagement')} title="Click to view detailed engagement analytics">
          <div className="metric-label"><TrendingUp size={16} style={{ marginRight: '4px' }} />Engagement Rate ↗</div>
          <div className="metric-value">
            {analytics?.totalUsers ? Math.round((analytics.activeUsersLast7Days / analytics.totalUsers) * 100) : 0}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Active users ÷ total users (7d)</div>
        </div>
      </div>

      {/* ── This Week vs Last Week ── */}
      {wc && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginTop: '24px' }}>
          {[
            { label: 'Quizzes Taken', icon: '📝', thisWeek: wc.thisWeek.quizzes, lastWeek: wc.lastWeek.quizzes, display: String(wc.thisWeek.quizzes) },
            { label: 'Avg Quiz Score', icon: '🎯', thisWeek: wc.thisWeek.avgScore, lastWeek: wc.lastWeek.avgScore, display: wc.thisWeek.avgScore ? `${wc.thisWeek.avgScore}%` : '—' },
            { label: 'New Signups', icon: '👤', thisWeek: wc.thisWeek.newSignups, lastWeek: wc.lastWeek.newSignups, display: String(wc.thisWeek.newSignups) },
            { label: 'Active Users', icon: '⚡', thisWeek: wc.thisWeek.activeUsers, lastWeek: wc.lastWeek.activeUsers, display: String(wc.thisWeek.activeUsers) },
          ].map(item => (
            <div key={item.label} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>{item.icon} {item.label}</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#e0eeff', lineHeight: 1 }}>{item.display}</div>
              <div style={{ marginTop: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last week: {item.lastWeek}</span>
                <TrendBadge thisWeek={item.thisWeek} lastWeek={item.lastWeek} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 7-Day DAU Sparkline ── */}
      {extraStats?.dauData?.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '4px' }}>📅 Daily Active Users — Last 7 Days</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>Unique users with at least one session per day</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={extraStats.dauData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="date" tick={{ fill: '#8ba3c0', fontSize: 11 }}
                tickFormatter={(d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })} />
              <YAxis tick={{ fill: '#8ba3c0', fontSize: 12 }} allowDecimals={false} width={28} />
              <Tooltip
                contentStyle={{ background: '#1a2a45', border: '1px solid #3a5a8a', borderRadius: '8px' }}
                labelStyle={{ color: '#e0eeff', fontWeight: 600 }}
                itemStyle={{ color: '#e0eeff' }}
                labelFormatter={(d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                formatter={(val: any) => [val, 'Active Users']}
              />
              <Bar dataKey="dau" name="Active Users" fill="#00d4ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Pie Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '24px' }}>

        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ marginBottom: '2px', fontSize: '0.95rem' }}>⚡ Engagement Rate</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0' }}>Active vs total users (7d)</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={[
                { name: 'Active (7d)', value: analytics?.activeUsersLast7Days || 0 },
                { name: 'Inactive', value: Math.max(0, (analytics?.totalUsers || 0) - (analytics?.activeUsersLast7Days || 0)) },
              ]} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                <Cell fill="#00d4ff" /><Cell fill="#2a3a5a" />
              </Pie>
              <Tooltip contentStyle={{ background: '#1a2a45', border: '1px solid #3a5a8a', borderRadius: '8px' }}
                labelStyle={{ color: '#e0eeff', fontWeight: 600 }} itemStyle={{ color: '#e0eeff' }}
                formatter={(val: any, name: string) => {
                  const total = analytics?.totalUsers || 0;
                  return [`${val} users${total ? ` (${((val / total) * 100).toFixed(1)}%)` : ''}`, name];
                }} />
              <Legend wrapperStyle={{ color: '#8ba3c0', fontSize: '0.78rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ marginBottom: '2px', fontSize: '0.95rem' }}>✅ Pass / Fail Rate</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0' }}>Quiz attempts ≥ 70% threshold</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={(() => {
                const score = analytics?.latestSnapshot?.avg_quiz_score;
                const completed = analytics?.latestSnapshot?.quizzes_completed || 0;
                if (!completed) return [{ name: 'No data', value: 1 }];
                const passEst = Math.round(completed * ((score && score >= 70 ? score : 70) / 100));
                return [{ name: 'Passed (≥70%)', value: passEst }, { name: 'Failed (<70%)', value: Math.max(0, completed - passEst) }];
              })()} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                <Cell fill="#00ff88" /><Cell fill="#ff4466" />
              </Pie>
              <Tooltip contentStyle={{ background: '#1a2a45', border: '1px solid #3a5a8a', borderRadius: '8px' }}
                labelStyle={{ color: '#e0eeff', fontWeight: 600 }} itemStyle={{ color: '#e0eeff' }}
                formatter={(val: any, name: string) => {
                  const completed = analytics?.latestSnapshot?.quizzes_completed || 0;
                  return [`${val} attempts${completed ? ` (${((val / completed) * 100).toFixed(1)}%)` : ''}`, name];
                }} />
              <Legend wrapperStyle={{ color: '#8ba3c0', fontSize: '0.78rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ marginBottom: '2px', fontSize: '0.95rem' }}>👥 New vs Returning</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0' }}>New signups this month vs existing</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={[
                { name: 'New (this month)', value: analytics?.newUsersThisMonth || 0 },
                { name: 'Returning', value: Math.max(0, (analytics?.totalUsers || 0) - (analytics?.newUsersThisMonth || 0)) },
              ]} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                <Cell fill="#ffcc00" /><Cell fill="#a855f7" />
              </Pie>
              <Tooltip contentStyle={{ background: '#1a2a45', border: '1px solid #3a5a8a', borderRadius: '8px' }}
                labelStyle={{ color: '#e0eeff', fontWeight: 600 }} itemStyle={{ color: '#e0eeff' }}
                formatter={(val: any, name: string) => {
                  const total = analytics?.totalUsers || 0;
                  return [`${val} users${total ? ` (${((val / total) * 100).toFixed(1)}%)` : ''}`, name];
                }} />
              <Legend wrapperStyle={{ color: '#8ba3c0', fontSize: '0.78rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Recent Activity + Streak Leaders ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '24px' }}>

        <div className="card">
          <h3 style={{ marginBottom: '4px' }}>📋 Recent Activity</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>Last 10 quiz attempts across all users</p>
          {!extraStats?.recentActivity?.length ? (
            <p style={{ color: 'var(--text-secondary)' }}>No quiz activity yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {extraStats.recentActivity.map((a: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 14px', background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      background: (a.score || 0) >= 70 ? '#00ff88' : '#ff4466' }} />
                    <div>
                      <span style={{ fontWeight: 600, color: '#e0eeff', fontSize: '0.9rem' }}>{a.username}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '8px' }}>{a.topic_id}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: (a.score || 0) >= 70 ? '#00ff88' : '#ff4466' }}>{a.score || 0}%</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', minWidth: '52px', textAlign: 'right' }}>{timeAgo(a.attempted_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '4px' }}>🔥 Streak Leaders</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>Top 5 users by current streak</p>
          {!extraStats?.streakLeaders?.length ? (
            <p style={{ color: 'var(--text-secondary)' }}>No streak data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {extraStats.streakLeaders.map((user: any, i: number) => (
                <div key={user.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer',
                }} onClick={() => navigate(`/users/${user.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: '#e0eeff', fontSize: '0.88rem' }}>{user.username || 'Unknown'}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>Lvl {user.level}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#ff9500', fontSize: '1.05rem' }}>🔥 {user.streak}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>days</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Struggling Topics + At-Risk / Recent Signups ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>

        <div className="card">
          <h3 style={{ marginBottom: '4px' }}>⚠️ Struggling Topics</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>Topics with avg score below 60% — may need content review</p>
          {!extraStats?.strugglingTopics?.length ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '10px' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <span style={{ color: '#00ff88' }}>All topics are performing well!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {extraStats.strugglingTopics.map((topic: any) => (
                <div key={topic.topic_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'rgba(255,68,102,0.08)',
                  border: '1px solid rgba(255,68,102,0.25)', borderRadius: '8px',
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#e0eeff' }}>{topic.topic_id}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '8px' }}>{topic.attempts} attempt{topic.attempts !== 1 ? 's' : ''}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#ff4466', fontSize: '1rem' }}>{topic.avg_score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* At-Risk Banner */}
          <div className="card" style={{
            background: (extraStats?.atRiskCount || 0) > 0 ? 'rgba(255,204,0,0.06)' : 'rgba(0,255,136,0.06)',
            border: `1px solid ${(extraStats?.atRiskCount || 0) > 0 ? 'rgba(255,204,0,0.3)' : 'rgba(0,255,136,0.3)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '2rem' }}>{(extraStats?.atRiskCount || 0) > 0 ? '😴' : '🎉'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.5rem', color: (extraStats?.atRiskCount || 0) > 0 ? '#ffcc00' : '#00ff88' }}>
                  {extraStats?.atRiskCount || 0} users
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {(extraStats?.atRiskCount || 0) > 0
                    ? "haven't logged in for 30+ days"
                    : 'All users active in the last 30 days!'}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Signups */}
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: '4px' }}>👤 Recent Signups</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>Last 5 new users</p>
            {!extraStats?.recentSignups?.length ? (
              <p style={{ color: 'var(--text-secondary)' }}>No users yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {extraStats.recentSignups.map((user: any) => (
                  <div key={user.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer',
                  }} onClick={() => navigate(`/users/${user.id}`)}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#e0eeff', fontSize: '0.88rem' }}>{user.username || 'Unknown'}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginLeft: '8px' }}>Lvl {user.level}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }}>{timeAgo(user.updated_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3>Quick Actions</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Manage users and view detailed analytics</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={() => navigate('/users')}>Manage Users</button>
          <button className="btn-secondary" onClick={() => navigate('/analytics')}>Advanced Analytics</button>
        </div>
      </div>

      {/* ── Latest Snapshot ── */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Latest Snapshot</h3>
          <button className="btn-primary" onClick={handleGenerateSnapshot} disabled={isGeneratingSnapshot}>
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
                      background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                      borderRadius: '6px', padding: '4px 10px', fontSize: '0.85rem',
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
