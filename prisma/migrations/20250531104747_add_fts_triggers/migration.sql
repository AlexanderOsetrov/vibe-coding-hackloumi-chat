-- This is an empty migration.

-- Add function to update FTS vector
CREATE OR REPLACE FUNCTION update_message_fts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fts := to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update FTS on INSERT and UPDATE
CREATE TRIGGER messages_fts_update_trigger
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_fts();

-- Update existing messages to populate FTS column
UPDATE messages SET fts = to_tsvector('english', content) WHERE fts IS NULL;