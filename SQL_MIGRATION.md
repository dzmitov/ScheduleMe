# SQL Migration for Clerk Integration

## Add user_id column to lessons table

Run this SQL query in your Vercel Postgres database to add the `user_id` column to track which user created each lesson:

```sql
-- Add user_id column to lessons table
ALTER TABLE lessons 
ADD COLUMN user_id TEXT;

-- Optional: Add index for better query performance
CREATE INDEX idx_lessons_user_id ON lessons(user_id);
```

## Notes

- The `user_id` column will store the Clerk user ID
- Existing lessons will have `NULL` for `user_id` (you can update them manually if needed)
- Only the admin user (dzmitov@gmail.com) can create/edit/delete lessons
- All users can view lessons, but only lessons created by them or by the admin

## Future Enhancement (Optional)

If you want to filter lessons by user in the future, you can add this query to your API:

```sql
-- Get lessons for a specific user
SELECT * FROM lessons 
WHERE user_id = $1 OR user_id IS NULL
ORDER BY date, start_time;
```

This would allow each user to see only their own lessons plus any legacy lessons (where user_id is NULL).
