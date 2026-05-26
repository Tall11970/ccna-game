import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiClient } from '../services/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
  PieChart, Pie, Sector
} from 'recharts';

interface AnalyticsPageProps {
  onLogout: () => void;
}

const COLORS = ['#00d4ff', '#00ff88', '#ffcc00', '#ff4466', '#a855f7', '#f97316', '#06b6d4', '#84cc16'];

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const engagementRef = useRef<HTMLDivElement>(null);
  const [quizPerf, setQuizPerf] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [pieData, setPieData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  // Scroll to engagement section if hash is #engagement
  useEffect(() => {
    if (!isLoading && location.hash === '#engagement' && engagementRef.current) {
      setTimeout(() => {
        engagementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isLoading, location.hash]);

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const [quiz, growth, leaders, distribution, over, pie] = await Promise.all([
        apiClient.client.get('/admin/analytics/quiz-performance'),
        apiClient.client.get('/admin/analytics/user-growth'),
        apiClient.client.get('/admin/analytics/leaderboard'),
        apiClient.client.get('/admin/analytics/score-distribution'),
        apiClient.client.get('/admin/analytics/overview'),
        apiClient.client.get('/admin/analytics/pie-data'),
      ]);
      setQuizPerf(quiz.data);
      setUserGrowth(growth.data);
      setLeaderboard(leaders.data);
      setScoreDistribution(distribution.data);
      setOverview(over.data);
      setPieData(pie.data);
    } catch (err: any) {
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    onLogout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <Layout pageTitle="Advanced Analytics" onLogout={handleLogout}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Advanced Analytics" onLogout={handleLogout}>
      {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* Quiz Performance by Topic */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '8px' }}>📊 Quiz Performance by Topic</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
          Average scores and attempt counts per topic
        </p>
        {quizPerf.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No quiz data available yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quizPerf} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="topic_id" tick={{ fill: '#8ba3c0', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: '#8ba3c0', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#162035', border: '1px solid #243a60', borderRadius: '8px' }}
                labelStyle={{ color: '#e0eeff' }}
                formatter={(val: any, name: string) => [
                  name === 'avg_score' ? `${val}%` : name === 'pass_rate' ? `${val}%` : val,
                  name === 'avg_score' ? 'Avg Score' : name === 'pass_rate' ? 'Pass Rate' : 'Attempts'
                ]}
              />
              <Legend wrapperStyle={{ color: '#8ba3c0', paddingTop: '20px' }} />
              <Bar dataKey="avg_score" name="Avg Score" fill="#00d4ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pass_rate" name="Pass Rate" fill="#00ff88" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Score Distribution */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '8px' }}>🎯 Score Distribution</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
          How many quiz attempts fall into each score range
        </p>
        {scoreDistribution.every(b => b.count === 0) ? (
          <p style={{ color: 'var(--text-secondary)' }}>No quiz data available yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={scoreDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="range" tick={{ fill: '#8ba3c0', fontSize: 12 }} />
              <YAxis tick={{ fill: '#8ba3c0', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#162035', border: '1px solid #243a60', borderRadius: '8px' }}
                labelStyle={{ color: '#e0eeff' }}
                formatter={(val: any) => [val, 'Attempts']}
              />
              <Bar dataKey="count" name="Attempts" radius={[4, 4, 0, 0]}>
                {scoreDistribution.map((entry, index) => (
                  <Cell
                    key={entry.range}
                    fill={entry.range.startsWith('9') || entry.range === '91-100' ? '#00ff88'
                      : entry.range.startsWith('7') || entry.range.startsWith('8') ? '#00d4ff'
                      : entry.range.startsWith('6') ? '#ffcc00' : '#ff4466'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>

        {/* Pass / Fail Rate */}
        <div className="card">
          <h3 style={{ marginBottom: '4px' }}>✅ Pass / Fail Rate</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>Pass threshold: 70%</p>
          {!pieData?.passFailData?.length ? (
            <p style={{ color: 'var(--text-secondary)' }}>No quiz data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData.passFailData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={4} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  <Cell fill="#00ff88" />
                  <Cell fill="#ff4466" />
                </Pie>
                <Tooltip contentStyle={{ background: '#162035', border: '1px solid #243a60', borderRadius: '8px' }}
                  formatter={(val: any, name: string) => [val, name]} />
                <Legend wrapperStyle={{ color: '#8ba3c0', fontSize: '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Active vs Inactive Users */}
        <div className="card">
          <h3 style={{ marginBottom: '4px' }}>👥 User Activity</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>Active in last 7 days vs inactive</p>
          {!pieData?.userActivityData?.length ? (
            <p style={{ color: 'var(--text-secondary)' }}>No user data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData.userActivityData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={4} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  <Cell fill="#00d4ff" />
                  <Cell fill="#243a60" />
                </Pie>
                <Tooltip contentStyle={{ background: '#162035', border: '1px solid #243a60', borderRadius: '8px' }}
                  formatter={(val: any, name: string) => [val, name]} />
                <Legend wrapperStyle={{ color: '#8ba3c0', fontSize: '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: '4px' }}>📱 Device Breakdown</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>Sessions by device type</p>
          {!pieData?.deviceBreakdown?.length ? (
            <p style={{ color: 'var(--text-secondary)' }}>No session data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData.deviceBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={4} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.deviceBreakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#162035', border: '1px solid #243a60', borderRadius: '8px' }}
                  formatter={(val: any, name: string) => [val, name]} />
                <Legend wrapperStyle={{ color: '#8ba3c0', fontSize: '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Browser Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: '4px' }}>🌐 Browser Breakdown</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>Sessions by browser</p>
          {!pieData?.browserBreakdown?.length ? (
            <p style={{ color: 'var(--text-secondary)' }}>No session data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData.browserBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={4} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.browserBreakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#162035', border: '1px solid #243a60', borderRadius: '8px' }}
                  formatter={(val: any, name: string) => [val, name]} />
                <Legend wrapperStyle={{ color: '#8ba3c0', fontSize: '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* User Growth Over Time */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '8px' }}>📈 Platform Growth Over Time</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
          Total users and active users from daily snapshots — generate a snapshot each day to build this chart
        </p>
        {userGrowth.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No snapshot data yet. Generate snapshots daily to track growth.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={userGrowth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="snapshot_date" tick={{ fill: '#8ba3c0', fontSize: 11 }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fill: '#8ba3c0', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#162035', border: '1px solid #243a60', borderRadius: '8px' }}
                labelStyle={{ color: '#e0eeff' }}
                labelFormatter={(d) => new Date(d).toLocaleDateString()}
              />
              <Legend wrapperStyle={{ color: '#8ba3c0' }} />
              <Line type="monotone" dataKey="total_users" name="Total Users" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff' }} />
              <Line type="monotone" dataKey="active_users" name="Active Users" stroke="#00ff88" strokeWidth={2} dot={{ fill: '#00ff88' }} />
              <Line type="monotone" dataKey="quizzes_completed" name="Quizzes" stroke="#ffcc00" strokeWidth={2} dot={{ fill: '#ffcc00' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Engagement Section */}
      <div className="card" ref={engagementRef} id="engagement" style={{ marginBottom: '24px', scrollMarginTop: '80px' }}>
        <h3 style={{ marginBottom: '8px' }}>⚡ Engagement Rate</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
          What percentage of your total users are actively learning each week
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00d4ff' }}>
              {overview?.totalUsers && overview?.activeUsersLast7Days
                ? `${Math.round((overview.activeUsersLast7Days / overview.totalUsers) * 100)}%`
                : '0%'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Weekly Engagement Rate</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>Active users ÷ total users (7d)</div>
          </div>
          <div style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>
              {overview?.activeUsersLast7Days || 0}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Active Users (7 days)</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>Users with at least one session</div>
          </div>
          <div style={{ background: 'rgba(255,204,0,0.08)', border: '1px solid rgba(255,204,0,0.2)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffcc00' }}>
              {overview?.totalUsers || 0}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Total Registered Users</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>All time signups</div>
          </div>
          <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#a855f7' }}>
              {overview?.newUsersThisMonth || 0}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>New Users (30 days)</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>Recent signups this month</div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '16px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>How to read this:</strong>{' '}
            A <strong style={{ color: '#00ff88' }}>healthy engagement rate</strong> for an educational platform is typically <strong>20–40%</strong> weekly.
            Above 40% is excellent. Below 10% means users may not be returning after their first visit.
            Focus on streaks, new content, and reminders to boost engagement.
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <h3 style={{ marginBottom: '8px' }}>🏆 Top Users Leaderboard</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
          Top 10 users ranked by XP
        </p>
        {leaderboard.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No user data available yet</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Level</th>
                  <th>XP</th>
                  <th>Streak 🔥</th>
                  <th>Avg Quiz Score</th>
                  <th>Quizzes Taken</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user, index) => (
                  <tr key={user.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/users/${user.id}`)}>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: index === 0 ? '#ffcc00' : index === 1 ? '#aaaaaa' : index === 2 ? '#cd7f32' : 'inherit'
                      }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{user.username || '-'}</td>
                    <td>{user.level}</td>
                    <td style={{ color: '#00d4ff', fontWeight: 700 }}>{(user.xp || 0).toLocaleString()}</td>
                    <td>{user.streak || 0}</td>
                    <td>{user.avg_quiz_score ? `${user.avg_quiz_score}%` : '-'}</td>
                    <td>{user.total_quizzes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AnalyticsPage;
