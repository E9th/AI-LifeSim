// File: app/api/delete-character/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ฟังก์ชันสำหรับลบตัวละคร
export async function DELETE(req: NextRequest) {
  try {
    const { characterId } = await req.json();

    if (!characterId) {
      return NextResponse.json(
        { error: "Character ID is required" },
        { status: 400 }
      );
    }

    // การตั้งค่า ON DELETE CASCADE ใน database จะลบ chat_history ที่เกี่ยวข้องโดยอัตโนมัติ
    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", characterId);

    if (error) {
      console.error("Error deleting character:", error);
      throw error;
    }

    return NextResponse.json({ success: true, message: "Character deleted successfully." });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete character" },
      { status: 500 }
    );
  }
}
