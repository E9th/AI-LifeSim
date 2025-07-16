import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: Request) {
  try {
    const { name, age, gender, background } = await req.json()

    // สร้างข้อมูลเริ่มต้นสำหรับทักษะและความสัมพันธ์
    // เอาส่วนนี้ออก
    // const initialSkills = {
    //   การพูด: 15,
    //   ความรู้ประวัติศาสตร์: 5,
    //   กีตาร์: 0,
    // }

    // const initialRelationships = {
    //   เจน: 80,
    //   เจ้าของร้านหนังสือ: 25,
    // }

    // บันทึกข้อมูลลง Supabase
    const { data, error } = await supabase
      .from("players")
      .insert([
        {
          name,
          age,
          gender,
          background,
          skills: {},
          relationships: {},
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return new Response(JSON.stringify({ error: "Failed to create character" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        character: data,
        message: "Character created successfully",
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Error creating character:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
