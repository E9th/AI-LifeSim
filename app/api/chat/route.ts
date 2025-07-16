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
    const { prompt, characterState, gameState, chatHistory, characterId } = await req.json()

    // ตรวจสอบว่ามี Groq API key หรือไม่
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set")
      return new Response(
        JSON.stringify({
          error: "ระบบ AI ไม่พร้อมใช้งาน กรุณาตั้งค่า API key",
          response: "ขออภัย ระบบ AI ไม่สามารถตอบสนองได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        }),
        {
          status: 200, // ส่ง 200 แทน 500 เพื่อให้ UI แสดงข้อความได้
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // สร้าง prompt ที่มีรายละเอียดสำหรับ Groq
    const systemPrompt = `
คุณคือ AI Life Simulator ที่จะทำหน้าที่เป็นโลกและตัวละคร NPC ทั้งหมด

ข้อมูลตัวละครผู้เล่นปัจจุบัน:
- ชื่อ: ${characterState.name}
- อายุ: ${characterState.age}
- ทักษะ: ${characterState.skills.map((s: any) => `${s.name}: ${s.value}/${s.max}`).join(", ") || "ไม่มี"}
- ความสัมพันธ์: ${characterState.relationships.map((r: any) => `${r.name}: ${r.value}/${r.max}`).join(", ") || "ไม่มี"}

สถานะเกมปัจจุบัน:
- พลังงาน: ${gameState.energy}/100
- ความหิว: ${gameState.hunger}/100
- เงิน: ${gameState.money} บาท
- วันที่: ${gameState.day}
- เวลา: ${gameState.hour}:${gameState.minute.toString().padStart(2, "0")}
- อารมณ์: ${gameState.mood}
- สถานที่: ${gameState.location}

การกระทำของผู้เล่น: "${prompt}"

กรุณาตอบสนองต่อการกระทำของผู้เล่น:
1. ตอบสั้นๆ กระชับ (2-3 ประโยค) สำหรับการกระทำง่ายๆ
2. ตอบยาวและมีรายละเอียดสำหรับการกระทำที่ซับซ้อน
3. บรรยายสิ่งที่เกิดขึ้นอย่างสมจริงตามเวลาและสถานที่
4. พิจารณาพลังงานและความหิวในการตอบสนอง
5. ตอบเป็นภาษาไทยและให้รายละเอียดที่น่าสนใจ

ห้ามทำตัวเป็นแชทบอท ให้เล่าเรื่องเหมือนเป็นโลกจริง
`

    let text = ""

    try {
      const result = await generateText({
        model: groq("llama3-8b-8192"),
        prompt: systemPrompt,
        maxTokens: 500,
      })
      text = result.text
    } catch (aiError) {
      console.error("Groq API Error:", aiError)
      // ถ้า Groq API มีปัญหา ให้ใช้การตอบสนองแบบง่ายๆ
      text = `คุณ${prompt} เวลาผ่านไปเล็กน้อย และคุณรู้สึกว่าการกระทำนี้ทำให้คุณได้เรียนรู้อะไรใหม่ๆ`
    }

    // คำนวณการเปลี่ยนแปลงเวลา (แต่ละการกระทำใช้เวลา 15-60 นาที)
    const timePassage = Math.floor(Math.random() * 45) + 15 // 15-60 นาที
    let newHour = gameState.hour
    let newMinute = gameState.minute + timePassage
    let newDay = gameState.day

    if (newMinute >= 60) {
      newHour += Math.floor(newMinute / 60)
      newMinute = newMinute % 60
    }

    if (newHour >= 24) {
      newDay += Math.floor(newHour / 24)
      newHour = newHour % 24
    }

    // คำนวณการเปลี่ยนแปลงพลังงานและความหิว
    const energyChange = -Math.floor(Math.random() * 10) - 5 // ลดพลังงาน 5-15
    const hungerChange = -Math.floor(Math.random() * 15) - 10 // ลดความหิว 10-25

    // อัปเดตสถานะใหม่
    const newGameState = {
      ...gameState,
      day: newDay,
      hour: newHour,
      minute: newMinute,
      energy: Math.max(0, Math.min(100, gameState.energy + energyChange)),
      hunger: Math.max(0, Math.min(100, gameState.hunger + hungerChange)),
      last_action: prompt,
      last_response: text,
      timestamp: new Date().toISOString(),
    }

    // จำลองการเปลี่ยนแปลงทักษะและความสัมพันธ์
    const skillUpdates = []
    const relationshipUpdates = []

    // ตรวจจับทักษะต่างๆ
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

    // ตรวจจับทักษะการทำอาหาร
    if (prompt.includes("ทำอาหาร") || prompt.includes("ทำข้าว") || prompt.includes("ปรุงอาหาร")) {
      skillUpdates.push({ name: "การทำอาหาร", change: 3 })
      newGameState.hunger = Math.min(100, newGameState.hunger + 30) // เพิ่มความหิว
    }

    // การกินอาหาร
    if (prompt.includes("กิน") || prompt.includes("อาหาร")) {
      newGameState.hunger = Math.min(100, newGameState.hunger + 40)
      newGameState.energy = Math.min(100, newGameState.energy + 20)
      newGameState.money = Math.max(0, newGameState.money - 50)
    }

    // การนอนหลับ
    if (prompt.includes("นอน") || prompt.includes("หลับ")) {
      newGameState.energy = 100
      newGameState.hour = 8
      newGameState.minute = 0
      newGameState.day += 1
    }

    // ตรวจจับทักษะการออกกำลังกาย
    if (prompt.includes("วิ่ง") || prompt.includes("ออกกำลัง") || prompt.includes("เล่นกีฬา")) {
      skillUpdates.push({ name: "สุขภาพ", change: 4 })
      newGameState.energy = Math.max(0, newGameState.energy - 20)
      newGameState.hunger = Math.max(0, newGameState.hunger - 15)
    }

    // สำหรับความสัมพันธ์
    if (prompt.includes("คุยกับ") || prompt.includes("พบ")) {
      const nameMatch = prompt.match(/คุยกับ\s*(\S+)|พบ\s*(\S+)/)
      if (nameMatch) {
        const personName = nameMatch[1] || nameMatch[2]
        relationshipUpdates.push({ name: personName, change: 3 })
      }
    }

    // บันทึกข้อความแชทใน Supabase
    if (characterId) {
      try {
        // บันทึกข้อความของผู้เล่น
        await supabase.from("chat_history").insert([
          {
            player_id: characterId,
            message_type: "user",
            message_text: prompt,
          },
        ])

        // บันทึกข้อความของ AI
        await supabase.from("chat_history").insert([
          {
            player_id: characterId,
            message_type: "ai",
            message_text: text,
          },
        ])

        // อัปเดตข้อมูลตัวละครใน Supabase
        const currentSkills = characterState.skills.reduce((acc: any, skill: any) => {
          acc[skill.name] = skill.value
          return acc
        }, {})

        const currentRelationships = characterState.relationships.reduce((acc: any, rel: any) => {
          acc[rel.name] = rel.value
          return acc
        }, {})

        await supabase
          .from("players")
          .update({
            skills: currentSkills,
            relationships: currentRelationships,
            updated_at: new Date().toISOString(),
          })
          .eq("id", characterId)
      } catch (error) {
        console.error("Error saving to Supabase:", error)
      }
    }

    // บันทึกสถานะเกมใน Redis
    try {
      await redis.set(`game_state_${characterId || "default"}`, newGameState)
    } catch (redisError) {
      console.error("Redis error:", redisError)
    }

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
    return new Response(
      JSON.stringify({
        error: "เกิดข้อผิดพลาดในระบบ AI",
        response: "ขออภัย เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง",
      }),
      {
        status: 200, // ส่ง 200 แทน 500 เพื่อให้ UI แสดงข้อความได้
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
