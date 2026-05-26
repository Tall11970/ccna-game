import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';

// Load environment variables
dotenv.config();

// Types
interface AuthRequest extends Request {
  adminId?: string;
  adminEmail?: string;
}

// Initialize Express
const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware: Verify Admin JWT Token
const authenticateAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      adminId: string;
      email: string;
    };

    // Verify user is admin in database
    const { data: adminUser, error } = await supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('id', decoded.adminId)
      .single();

    if (error || !adminUser?.is_admin) {
      res.status(403).json({ error: 'Unauthorized: Not an admin' });
      return;
    }

    req.adminId = decoded.adminId;
    req.adminEmail = decoded.email;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes
app.post('/api/admin/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify user is admin
    const { data: adminUser, error: dbError } = await supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('id', data.user.id)
      .single();

    if (dbError || !adminUser?.is_admin) {
      res.status(403).json({ error: 'User is not an admin' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { adminId: data.user.id, email: data.user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    // Update last admin login
    await supabase
      .from('profiles')
      .update({ last_admin_login: new Date().toISOString() })
      .eq('id', data.user.id);

    res.json({
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users Routes

// GET /api/admin/users - List all users with pagination and filtering
app.get('/api/admin/users', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'active' } = req.query;
    const offset = ((Number(page) - 1) * Number(limit)) || 0;

    let query = supabase
      .from('profiles')
      .select('*', {
        count: 'exact',
      })
      .order('updated_at', { ascending: false });

    // Search by username
    if (search) {
      query = query.or(`username.ilike.%${search}%`);
    }

    // Filter by status
    if (status === 'admin') {
      query = query.eq('is_admin', true);
    } else if (status === 'user') {
      query = query.eq('is_admin', false);
    }

    const { data, error, count } = await query
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      throw error;
    }

    res.json({
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching users:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:userId - Get specific user details
app.get('/api/admin/users/:userId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('User query error:', userError);
      res.status(404).json({ error: 'User not found' });
      return;
    }


    // Get user's quiz history
    const { data: quizzes, error: quizError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false })
      .limit(10);

    if (quizError) {
      console.error('Quiz attempts query error:', quizError);
    }
    console.log('Quiz attempts found:', quizzes?.length || 0);

    // Get user's sessions
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_start', { ascending: false })
      .limit(10);

    // Get user's lesson completions
    const { data: completions } = await supabase
      .from('lesson_completion')
      .select('*')
      .eq('user_id', userId);

    res.json({
      user,
      quizzes,
      sessions,
      completions,
      stats: {
        totalLessonsCompleted: completions?.length || 0,
        totalQuizzes: quizzes?.length || 0,
        avgQuizScore: quizzes?.length
          ? parseFloat((quizzes.reduce((sum: number, q: any) => sum + (q.score || 0), 0) / quizzes.length).toFixed(2))
          : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/admin/users/:userId - Update user
app.put('/api/admin/users/:userId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { username, level, xp_points, exam_type, admin_notes } = req.body;

    const updateData: any = {};
    if (username) updateData.username = username;
    if (level !== undefined) updateData.level = level;
    if (xp_points !== undefined) updateData.xp_points = xp_points;
    if (exam_type) updateData.exam_type = exam_type;
    if (admin_notes) updateData.admin_notes = admin_notes;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log to audit trail
    await supabase.from('admin_audit_log').insert({
      admin_id: req.adminId,
      action: 'user_edited',
      target_user_id: userId,
      changes: updateData,
      description: `Updated user ${userId}`,
    });

    res.json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:userId - Delete user
app.delete('/api/admin/users/:userId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Delete user from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) throw authError;

    // Log to audit trail
    await supabase.from('admin_audit_log').insert({
      admin_id: req.adminId,
      action: 'user_deleted',
      target_user_id: userId,
      description: `Deleted user ${userId}`,
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/admin/users/:userId/reset-progress - Reset user progress
app.post('/api/admin/users/:userId/reset-progress', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Reset user progress
    const { error } = await supabase
      .from('profiles')
      .update({
        level: 1,
        xp_points: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    // Delete quiz attempts and lesson completions
    await supabase.from('quiz_attempts').delete().eq('user_id', userId);
    await supabase.from('lesson_completion').delete().eq('user_id', userId);

    // Log to audit trail
    await supabase.from('admin_audit_log').insert({
      admin_id: req.adminId,
      action: 'progress_reset',
      target_user_id: userId,
      description: `Reset progress for user ${userId}`,
    });

    res.json({ message: 'User progress reset successfully' });
  } catch (error) {
    console.error('Error resetting progress:', error);
    res.status(500).json({ error: 'Failed to reset progress' });
  }
});

// Analytics Routes

// GET /api/admin/analytics/overview - Main dashboard metrics
app.get('/api/admin/analytics/overview', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get total users
    const { count: totalUsers, error: totalUsersError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (totalUsersError) throw totalUsersError;

    // Get users updated in last 30 days (new signups)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newUsers, error: newUsersError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', thirtyDaysAgo);

    if (newUsersError) throw newUsersError;

    // Get active users (with sessions in last 7 days) - get unique user IDs
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeSessions, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id')
      .gte('session_start', sevenDaysAgo);

    if (sessionError) throw sessionError;

    // Get unique active users
    const uniqueActiveUsers = new Set(activeSessions?.map(s => s.user_id) || []).size;

    // Get latest analytics snapshot
    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    // latestSnapshot can be null if no snapshots exist yet
    res.json({
      totalUsers: totalUsers || 0,
      newUsersThisMonth: newUsers || 0,
      activeUsersLast7Days: uniqueActiveUsers,
      latestSnapshot: latestSnapshot || null,
    });
  } catch (error: any) {
    console.error('❌ Error fetching analytics:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error?.message });
  }
});

// GET /api/admin/analytics/quiz-performance - Quiz scores grouped by topic
app.get('/api/admin/analytics/quiz-performance', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('topic_id, score, correct_answers, total_questions');

    if (error) throw error;

    // Group by topic
    const topicMap: Record<string, { scores: number[], attempts: number, totalCorrect: number, totalQuestions: number }> = {};
    data?.forEach((attempt: any) => {
      if (!topicMap[attempt.topic_id]) {
        topicMap[attempt.topic_id] = { scores: [], attempts: 0, totalCorrect: 0, totalQuestions: 0 };
      }
      topicMap[attempt.topic_id].scores.push(attempt.score || 0);
      topicMap[attempt.topic_id].attempts++;
      topicMap[attempt.topic_id].totalCorrect += attempt.correct_answers || 0;
      topicMap[attempt.topic_id].totalQuestions += attempt.total_questions || 0;
    });

    const result = Object.entries(topicMap).map(([topic_id, stats]) => ({
      topic_id,
      attempts: stats.attempts,
      avg_score: parseFloat((stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length).toFixed(1)),
      pass_rate: parseFloat(((stats.scores.filter(s => s >= 70).length / stats.scores.length) * 100).toFixed(1)),
      highest_score: Math.max(...stats.scores),
      lowest_score: Math.min(...stats.scores),
    })).sort((a, b) => b.attempts - a.attempts);

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching quiz performance:', error?.message);
    res.status(500).json({ error: 'Failed to fetch quiz performance' });
  }
});

// GET /api/admin/analytics/user-growth - User growth from snapshots
app.get('/api/admin/analytics/user-growth', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('analytics_snapshots')
      .select('snapshot_date, total_users, active_users, new_users, quizzes_completed')
      .order('snapshot_date', { ascending: true })
      .limit(30);

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching user growth:', error?.message);
    res.status(500).json({ error: 'Failed to fetch user growth' });
  }
});

// GET /api/admin/analytics/leaderboard - Top users by XP, score, streak
app.get('/api/admin/analytics/leaderboard', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Top by XP
    const { data: topXP } = await supabase
      .from('profiles')
      .select('id, username, xp, level, streak')
      .order('xp', { ascending: false })
      .limit(10);

    // Top quiz scores per user
    const { data: quizData } = await supabase
      .from('quiz_attempts')
      .select('user_id, score');

    // Calculate avg score per user
    const userScores: Record<string, number[]> = {};
    quizData?.forEach((q: any) => {
      if (!userScores[q.user_id]) userScores[q.user_id] = [];
      userScores[q.user_id].push(q.score || 0);
    });

    const topByScore = topXP?.map((user: any) => ({
      ...user,
      avg_quiz_score: userScores[user.id]?.length
        ? parseFloat((userScores[user.id].reduce((a: number, b: number) => a + b, 0) / userScores[user.id].length).toFixed(1))
        : 0,
      total_quizzes: userScores[user.id]?.length || 0,
    }));

    res.json(topByScore || []);
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error?.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/admin/analytics/pie-data - Data for pie charts
app.get('/api/admin/analytics/pie-data', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Device breakdown
    const { data: deviceData } = await supabase
      .from('user_sessions').select('device_type');
    const deviceCounts: Record<string, number> = {};
    deviceData?.forEach((s: any) => {
      const d = s.device_type || 'unknown';
      deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    });
    const deviceBreakdown = Object.entries(deviceCounts).map(([name, value]) => ({ name, value }));

    // Pass/Fail rate (70% pass threshold)
    const { data: quizData } = await supabase
      .from('quiz_attempts').select('score');
    const passed = quizData?.filter((q: any) => (q.score || 0) >= 70).length || 0;
    const failed = (quizData?.length || 0) - passed;
    const passFailData = [
      { name: 'Passed (≥70%)', value: passed },
      { name: 'Failed (<70%)', value: failed },
    ].filter(d => d.value > 0);

    // Active vs Inactive users
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeSessions } = await supabase
      .from('user_sessions').select('user_id').gte('session_start', sevenDaysAgo);
    const activeUserIds = new Set(activeSessions?.map((s: any) => s.user_id) || []);
    const { count: totalUsers } = await supabase
      .from('profiles').select('id', { count: 'exact', head: true });
    const activeCount = activeUserIds.size;
    const inactiveCount = (totalUsers || 0) - activeCount;
    const userActivityData = [
      { name: 'Active (7d)', value: activeCount },
      { name: 'Inactive', value: inactiveCount },
    ].filter(d => d.value > 0);

    // Browser breakdown
    const { data: browserData } = await supabase
      .from('user_sessions').select('browser');
    const browserCounts: Record<string, number> = {};
    browserData?.forEach((s: any) => {
      const b = s.browser || 'Unknown';
      browserCounts[b] = (browserCounts[b] || 0) + 1;
    });
    const browserBreakdown = Object.entries(browserCounts).map(([name, value]) => ({ name, value }));

    res.json({ deviceBreakdown, passFailData, userActivityData, browserBreakdown });
  } catch (error: any) {
    console.error('Error fetching pie data:', error?.message);
    res.status(500).json({ error: 'Failed to fetch pie data' });
  }
});

// GET /api/admin/analytics/score-distribution - Score histogram
app.get('/api/admin/analytics/score-distribution', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('score');

    if (error) throw error;

    // Build histogram in 10% buckets
    const buckets: Record<string, number> = {
      '0-10': 0, '11-20': 0, '21-30': 0, '31-40': 0, '41-50': 0,
      '51-60': 0, '61-70': 0, '71-80': 0, '81-90': 0, '91-100': 0,
    };

    data?.forEach((attempt: any) => {
      const score = attempt.score || 0;
      const bucket = Math.min(Math.floor(score / 10), 9);
      const labels = Object.keys(buckets);
      buckets[labels[bucket]]++;
    });

    const result = Object.entries(buckets).map(([range, count]) => ({ range, count }));
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching score distribution:', error?.message);
    res.status(500).json({ error: 'Failed to fetch score distribution' });
  }
});

// ── Shared snapshot generation function ──────────────────────────────────────
async function generateDailySnapshot(): Promise<any> {
  const today = new Date().toISOString().split('T')[0];

  const { count: totalUsers } = await supabase
    .from('profiles').select('id', { count: 'exact', head: true });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: newUsers } = await supabase
    .from('profiles').select('id', { count: 'exact', head: true })
    .gte('updated_at', thirtyDaysAgo);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: activeSessions } = await supabase
    .from('user_sessions').select('user_id').gte('session_start', sevenDaysAgo);
  const activeUsers = new Set(activeSessions?.map((s: any) => s.user_id) || []).size;

  const { count: quizzesCompleted } = await supabase
    .from('quiz_attempts').select('id', { count: 'exact', head: true })
    .gte('attempted_at', today);

  const { data: quizScores } = await supabase
    .from('quiz_attempts').select('score');
  const avgQuizScore = quizScores?.length
    ? parseFloat((quizScores.reduce((sum: number, q: any) => sum + (q.score || 0), 0) / quizScores.length).toFixed(2))
    : 0;

  const { data: sessions } = await supabase
    .from('user_sessions').select('total_time_seconds')
    .not('total_time_seconds', 'is', null);
  const avgSessionDuration = sessions?.length
    ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.total_time_seconds || 0), 0) / sessions.length)
    : 0;

  const { data: topicAttempts } = await supabase
    .from('quiz_attempts').select('topic_id');
  const topicCounts: Record<string, number> = {};
  topicAttempts?.forEach((a: any) => {
    topicCounts[a.topic_id] = (topicCounts[a.topic_id] || 0) + 1;
  });
  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([topic_id, attempts]) => ({ topic_id, attempts }));

  const { data: deviceData } = await supabase
    .from('user_sessions').select('device_type');
  const deviceBreakdown: Record<string, number> = {};
  deviceData?.forEach((s: any) => {
    const d = s.device_type || 'unknown';
    deviceBreakdown[d] = (deviceBreakdown[d] || 0) + 1;
  });

  const { data: snapshot, error } = await supabase
    .from('analytics_snapshots')
    .upsert({
      snapshot_date: today,
      total_users: totalUsers || 0,
      active_users: activeUsers,
      new_users: newUsers || 0,
      quizzes_completed: quizzesCompleted || 0,
      avg_quiz_score: avgQuizScore,
      avg_session_duration_seconds: avgSessionDuration,
      top_topics: topTopics,
      device_breakdown: deviceBreakdown,
    }, { onConflict: 'snapshot_date' })
    .select()
    .single();

  if (error) throw error;
  return snapshot;
}

// POST /api/admin/analytics/snapshot - Manually generate a snapshot
app.post('/api/admin/analytics/snapshot', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await generateDailySnapshot();

    await supabase.from('admin_audit_log').insert({
      admin_id: req.adminId,
      action: 'snapshot_generated',
      description: `Manually generated analytics snapshot for ${new Date().toISOString().split('T')[0]}`,
    });

    res.json({ message: 'Snapshot generated successfully', snapshot });
  } catch (error: any) {
    console.error('❌ Error generating snapshot:', error?.message);
    res.status(500).json({ error: 'Failed to generate snapshot' });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Scheduled Jobs ────────────────────────────────────────────────────────────
// Auto-generate analytics snapshot every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('🕛 Running scheduled daily snapshot...');
  try {
    await generateDailySnapshot();
    console.log('✅ Daily snapshot generated automatically');
  } catch (error: any) {
    console.error('❌ Scheduled snapshot failed:', error?.message);
  }
}, {
  timezone: 'America/Los_Angeles'
});

console.log('⏰ Daily snapshot scheduled for midnight (America/Los_Angeles)');

// Start server
app.listen(PORT, () => {
  console.log(`Admin Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
