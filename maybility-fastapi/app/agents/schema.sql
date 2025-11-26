-- Events table with optimized indexes for calendar operations
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    attendees TEXT[], -- Array of email addresses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT reasonable_duration CHECK (end_time - start_time <= INTERVAL '7 days')
);

-- Partial indexes for performance (only index active/relevant data)
CREATE INDEX idx_events_user_time ON events(user_id, start_time) 
WHERE start_time >= NOW() - INTERVAL '1 day'; -- Only recent/upcoming events

CREATE INDEX idx_events_user_upcoming ON events(user_id, start_time) 
WHERE start_time >= NOW(); -- Only upcoming events

CREATE INDEX idx_events_title_search ON events USING gin(to_tsvector('english', title)) 
WHERE start_time >= NOW() - INTERVAL '30 days'; -- Only recent events for search

CREATE INDEX idx_events_attendees ON events USING gin(attendees) 
WHERE start_time >= NOW(); -- Only upcoming events for attendee lookups

-- Full index for admin queries (if needed)
CREATE INDEX idx_events_user_all ON events(user_id, created_at DESC);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own events
CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON events
    FOR DELETE USING (auth.uid() = user_id);

-- Sample optimized queries:
-- Get upcoming events for user: Uses idx_events_user_upcoming
-- SELECT * FROM events WHERE user_id = $1 AND start_time >= NOW() ORDER BY start_time;

-- Search events by title: Uses idx_events_title_search  
-- SELECT * FROM events WHERE user_id = $1 AND to_tsvector('english', title) @@ to_tsquery('english', $2);

-- Get events for attendee: Uses idx_events_attendees
-- SELECT * FROM events WHERE $1 = ANY(attendees) AND start_time >= NOW();
