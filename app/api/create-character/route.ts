import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // ใช้ Service Role Key เพื่อความปลอดภัย
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { name, age, gender, background } = await req.json();

    if (!name || !age) {
        return NextResponse.json({ error: "Name and age are required" }, { status: 400 });
    }

    // บันทึกข้อมูลลง Supabase
    const { data, error } = await supabase
      .from("players")
      .insert([
        {
          name,
          age,
          gender,
          background,
          skills: {}, // เริ่มต้นด้วยออบเจ็กต์ว่าง
          relationships: {}, // เริ่มต้นด้วยออบเจ็กต์ว่าง
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to create character in database" }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        character: data,
        message: "Character created successfully",
    });

  } catch (error) {
    console.error("Error creating character:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
