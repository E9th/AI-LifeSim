// File: app/api/characters/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ฟังก์ชันสำหรับดึงข้อมูลตัวละครทั้งหมดตาม IDs ที่ระบุ
export async function POST(req: NextRequest) {
  try {
    const { characterIds } = await req.json();

    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabase
      .from("players")
      .select("id, name, age, background, created_at")
      .in("id", characterIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching characters:", error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch characters" },
      { status: 500 }
    );
  }
}
