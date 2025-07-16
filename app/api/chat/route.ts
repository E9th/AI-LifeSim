import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { Redis } from "@upstash/redis"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function POST(req: Request) {
  try {
    const { prompt, characterState, chatHistory } = await req.json()

    // ดึงสถานะปัจจุบันจาก Upstash Redis
    const gameState = (await redis.get("current_game_state")) || {
      mood: "ปกติ",
      money: 1000,
      location: "บ้าน",
    }

    // สร้าง prompt ที่มีรายละเอียดสำหรับ Groq
    const systemPrompt = `
คุณคือ AI Life Simulator ที่จะทำหน้าที่เป็นโลกและตัวละคร NPC ทั้งหมด

ข้อมูลตัวละครผู้เล่นปัจจุบัน:
- ชื่อ: ${characterState.name}
- อายุ: ${characterState.age}
- ทักษะ: ${characterState.skills.map((s: any) => `${s.name}: ${s.value}/${s.max}`).join(", ")}
- ความสัมพันธ์: ${characterState.relationships.map((r: any) => `${r.name}: ${r.value}/${r.max}`).join(", ")}
- อารมณ์ปัจจุบัน: ${(gameState as any).mood}
- เงิน: ${(gameState as any).money} บาท
- สถานที่: ${(gameState as any).location}

ประวัติการสนทนาล่าสุด:
${chatHistory
  .slice(-5)
  .map((msg: any) => `${msg.type === "user" ? "ผู้เล่น" : "โลก"}: ${msg.text}`)
  .join("\n")}

การกระทำของผู้เล่น: "${prompt}"

กรุณาตอบสนองต่อการกระทำของผู้เล่นในรูปแบบการเล่าเรื่อง:
1. บรรยายสิ่งที่เกิดขึ้นอย่างสมจริงและน่าสนใจ
2. หากผู้เล่นพยายามเรียนรู้ทักษะใหม่ ให้พิจารณาระดับทักษะปัจจุบัน
3. หากผู้เล่นโต้ตอบกับใครบางคน ให้พิจารณาระดับความสัมพันธ์
4. สร้างบทสนทนาและสถานการณ์ที่เหมาะสม
5. ตอบเป็นภาษาไทยและให้รายละเอียดที่น่าสนใจ

ห้ามทำตัวเป็นแชทบอท ให้เล่าเรื่องเหมือนเป็นโลกจริง
`

    const { text } = await generateText({
      model: groq("llama3-8b-8192"),
      prompt: systemPrompt,
      maxTokens: 500,
    })

    // อัปเดตสถานะใน Upstash Redis
    const newGameState = {
      ...(gameState as any),
      last_action: prompt,
      last_response: text,
      timestamp: new Date().toISOString(),
    }

    // จำลองการเปลี่ยนแปลงทักษะและความสัมพันธ์
    const skillUpdates = []
    const relationshipUpdates = []

    // ฟังก์ชันสำหรับเพิ่มทักษะใหม่
    const addOrUpdateSkill = (skills: any[], skillName: string, change: number) => {
      const existingSkill = skills.find((s) => s.name === skillName)
      if (existingSkill) {
        return skills.map((s) => (s.name === skillName ? { ...s, value: Math.min(s.max, s.value + change) } : s))
      } else {
        return [...skills, { name: skillName, value: Math.min(100, change), max: 100 }]
      }
    }

    // ฟังก์ชันสำหรับเพิ่มความสัมพันธ์ใหม่
    const addOrUpdateRelationship = (relationships: any[], personName: string, change: number) => {
      const existingRel = relationships.find((r) => r.name === personName)
      if (existingRel) {
        return relationships.map((r) =>
          r.name === personName ? { ...r, value: Math.min(r.max, Math.max(0, r.value + change)) } : r,
        )
      } else {
        return [...relationships, { name: personName, value: Math.max(0, Math.min(100, 50 + change)), max: 100 }]
      }
    }

    // ใช้ฟังก์ชันเหล่านี้แทนการ hardcode:
    if (prompt.includes("กีตาร์") || prompt.includes("เล่นดนตรี")) {
      skillUpdates.push({ name: "กีตาร์", change: 5 })
      newGameState.mood = "มีความสุข"
    }

    if (prompt.includes("พูด") || prompt.includes("สนทนา") || prompt.includes("สัมภาษณ์")) {
      skillUpdates.push({ name: "การพูด", change: 3 })
    }

    if (prompt.includes("อ่านหนังสือ") || prompt.includes("เรียนรู้")) {
      skillUpdates.push({ name: "ความรู้ทั่วไป", change: 4 })
    }

    // สำหรับความสัมพันธ์ - สร้างตัวละครใหม่เมื่อผู้เล่นโต้ตอบ
    if (prompt.includes("คุยกับ") || prompt.includes("พบ")) {
      // ดึงชื่อคนจาก prompt (ตัวอย่างง่ายๆ)
      const nameMatch = prompt.match(/คุยกับ\s*(\S+)|พบ\s*(\S+)/)
      if (nameMatch) {
        const personName = nameMatch[1] || nameMatch[2]
        relationshipUpdates.push({ name: personName, change: 2 })
      }
    }

    await redis.set("current_game_state", newGameState)

    return new Response(
      JSON.stringify({
        response: text,
        skillUpdates,
        relationshipUpdates,
        gameState: newGameState,
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Error in chat API:", error)
    return new Response(JSON.stringify({ error: "เกิดข้อผิดพลาดในระบบ AI" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
