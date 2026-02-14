# SQL Migration for app_users Table

Execute the following SQL statements to create the app_users table and set up the initial admin user:

```sql
-- Create app_users table
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer',
  teacher_id TEXT NULL REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- Add the default admin user (dzmitov@gmail.com)
INSERT INTO app_users (id, email, role)
VALUES ('admin-1', 'dzmitov@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';
```

This migration:
1. Creates the app_users table with the required fields
2. Adds an index on the email field for faster lookups
3. Inserts the default admin user (dzmitov@gmail.com) with admin role