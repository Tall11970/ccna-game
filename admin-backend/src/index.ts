import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Get users created in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', thirtyDaysAgo);

    // Get active users (with sessions in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gt('session_start', sevenDaysAgo)
      .distinct('user_id');

    // Get latest analytics snapshot
    const { data: latestSnapshot } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    res.json({
      totalUsers: totalUsers || 0,
      newUsersThisMonth: newUsers || 0,
      activeUsersLast7Days: activeUsers || 0,
      latestSnapshot,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
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

// Start server
app.listen(PORT, () => {
  console.log(`Admin Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
