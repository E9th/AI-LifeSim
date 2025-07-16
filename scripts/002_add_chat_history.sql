-- เพิ่มตารางสำหรับเก็บประวัติการสนทนา
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai')),
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- สร้าง index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_chat_history_player_id ON chat_history(player_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);

-- เพิ่มคอลัมน์ใหม่ในตาราง players สำหรับเก็บสถานะเกม
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS game_state JSONB DEFAULT '{}'::jsonb;

-- อัปเดต trigger สำหรับ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ลบ trigger เก่าถ้ามี
DROP TRIGGER IF EXISTS update_players_updated_at ON players;

-- สร้าง trigger ใหม่
CREATE TRIGGER update_players_updated_at 
    BEFORE UPDATE ON players
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
