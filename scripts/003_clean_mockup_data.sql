-- ลบข้อมูล mockup ที่อาจจะมีอยู่ในฐานข้อมูล
UPDATE players 
SET 
  skills = '{}'::jsonb,
  relationships = '{}'::jsonb,
  updated_at = NOW()
WHERE 
  skills ? 'การพูด' OR 
  skills ? 'กีตาร์' OR 
  skills ? 'ความรู้ประวัติศาสตร์' OR
  relationships ? 'เจน' OR 
  relationships ? 'เจ้าของร้านหนังสือ';

-- ลบประวัติแชทเก่าที่อาจจะมี mockup data
-- (ถ้าต้องการเริ่มใหม่หมด)
-- DELETE FROM chat_history;
