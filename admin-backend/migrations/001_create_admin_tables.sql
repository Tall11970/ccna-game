-- Admin Users Table (extends existing profiles)
-- This migration assumes profiles table already exists from main app

-- 1. Events Table - Track all user actions
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  -- event_types: 'lesson_viewed', 'quiz_started', 'quiz_completed', 'animation_played', 'login', 'logout', etc.
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_user_created ON events(user_id, created_at);

-- 2. User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_end TIMESTAMP,
  device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
  os_name VARCHAR(50), -- 'iOS', 'macOS', 'Windows', 'Linux'
  browser VARCHAR(50), -- 'Chrome', 'Safari', 'Firefox'
  pages_visited INTEGER DEFAULT 0,
  total_time_seconds INTEGER,
  ip_address INET
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_session_start ON user_sessions(session_start);

-- 3. Quiz Attempts - Detailed history
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id VARCHAR(100) NOT NULL,
  score DECIMAL(5, 2),
  correct_answers INTEGER,
  total_questions INTEGER,
  time_spent_seconds INTEGER,
  question_responses JSONB, -- { q1: 'A', q2: 'B', ... }
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quiz_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_topic_id ON quiz_attempts(topic_id);
CREATE INDEX idx_quiz_attempted_at ON quiz_attempts(attempted_at);

-- 4. Lesson Completion Tracking
CREATE TABLE IF NOT EXISTS lesson_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id VARCHAR(100) NOT NULL,
  lesson_index INTEGER,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  time_spent_seconds INTEGER
);

CREATE INDEX idx_lesson_user_id ON lesson_completion(user_id);
CREATE INDEX idx_lesson_topic_id ON lesson_completion(topic_id);

-- 5. Animation Engagement
CREATE TABLE IF NOT EXISTS animation_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  animation_type VARCHAR(50), -- 'hsrp_anim', 'dai_anim', 'vlan_hopping_anim', etc.
  topic_id VARCHAR(100),
  play_count INTEGER DEFAULT 1,
  total_watch_time_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  first_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_played TIMESTAMP
);

CREATE INDEX idx_animation_user_id ON animation_engagement(user_id);
CREATE INDEX idx_animation_type ON animation_engagement(animation_type);

-- 6. Daily Analytics Snapshot (aggregated for performance)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE UNIQUE,
  total_users INTEGER,
  active_users INTEGER,
  new_users INTEGER,
  lessons_viewed INTEGER,
  quizzes_completed INTEGER,
  avg_quiz_score DECIMAL(5, 2),
  avg_session_duration_seconds INTEGER,
  device_breakdown JSONB, -- { mobile: 45, desktop: 55 }
  certification_breakdown JSONB, -- { CCNA: 65, ENCOR: 25, ENARSI: 10 }
  top_topics JSONB, -- [{ topic_id: 'port_security', views: 892, completions: 658 }, ...]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_snapshot_date ON analytics_snapshots(snapshot_date);

-- 7. Admin Audit Log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action VARCHAR(100),
  -- actions: 'user_created', 'user_deleted', 'user_banned', 'progress_reset', 'user_edited', etc.
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changes JSONB, -- { field: 'level', old_value: 10, new_value: 12 }
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_target_user ON admin_audit_log(target_user_id);
CREATE INDEX idx_audit_created_at ON admin_audit_log(created_at);

-- 8. System Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100),
  -- metrics: 'api_response_time', 'db_query_time', 'page_load_time', 'cpu_usage', 'memory_usage'
  value DECIMAL(10, 2),
  unit VARCHAR(20), -- 'ms', 's', '%', 'count'
  endpoint VARCHAR(200),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_perf_metric_name ON performance_metrics(metric_name);
CREATE INDEX idx_perf_recorded_at ON performance_metrics(recorded_at);

-- 9. Error Logs
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  error_type VARCHAR(100),
  error_message TEXT,
  stack_trace TEXT,
  url VARCHAR(500),
  user_agent TEXT,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT
);

CREATE INDEX idx_error_type ON error_logs(error_type);
CREATE INDEX idx_error_occurred ON error_logs(occurred_at);
CREATE INDEX idx_error_resolved ON error_logs(resolved);

-- 10. Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0, -- 0-100
  target_users JSONB DEFAULT '{}', -- { user_ids: [...], roles: [...] }
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_feature_name ON feature_flags(feature_name);

-- 11. Modify profiles table to add admin fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_admin_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create indexes on profiles for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_exam_type ON public.profiles(exam_type) WHERE exam_type IS NOT NULL;

-- Grant permissions (adjust role names as needed for your Supabase setup)
GRANT SELECT, INSERT, UPDATE ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_sessions TO authenticated;
GRANT SELECT, INSERT ON quiz_attempts TO authenticated;
GRANT SELECT, INSERT ON lesson_completion TO authenticated;
GRANT SELECT, INSERT, UPDATE ON animation_engagement TO authenticated;
GRANT SELECT ON analytics_snapshots TO authenticated;
GRANT SELECT, INSERT ON error_logs TO authenticated;

-- Admin-only tables (require service role or admin auth)
GRANT USAGE ON SCHEMA public TO authenticated;
