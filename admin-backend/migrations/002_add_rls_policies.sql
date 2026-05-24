-- Enable RLS on tables that need it
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Quiz Attempts: Users can insert and select their own quiz attempts
CREATE POLICY "Users can insert their own quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own quiz attempts"
  ON quiz_attempts FOR SELECT
  WHERE auth.uid() = user_id;

-- Lesson Completion: Users can insert and select their own lesson completions
CREATE POLICY "Users can insert their own lesson completions"
  ON lesson_completion FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own lesson completions"
  ON lesson_completion FOR SELECT
  WHERE auth.uid() = user_id;

-- User Sessions: Users can insert and select their own sessions
CREATE POLICY "Users can insert their own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  WHERE auth.uid() = user_id;

-- Admins can view all records in these tables
CREATE POLICY "Admins can view all quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all lesson completions"
  ON lesson_completion FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all user sessions"
  ON user_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
