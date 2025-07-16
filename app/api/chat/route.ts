import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { prompt, characterState, gameState, chatHistory, characterId } =
      await req.json();

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set");
      return new Response(
        JSON.stringify({
          error: "ระบบ AI ไม่พร้อมใช้งาน กรุณาตั้งค่า API key",
          response:
            "ขออภัย ระบบ AI ไม่สามารถตอบสนองได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // --- ✨ Prompt ที่ปรับปรุงใหม่ ---
    const systemPrompt = `
คุณคือ AI Game Master ของเกมจำลองชีวิตชื่อ AI LifeSim บทบาทของคุณคือการบรรยายผลลัพธ์ของการกระทำของผู้เล่นอย่างสร้างสรรค์และสมจริง

**กฎการตอบ:**
1.  **สวมบทบาท:** ห้ามพูดว่าคุณเป็น AI หรือแชทบอทเด็ดขาด ให้คุณเป็นโลกทั้งใบ
2.  **ความยาว:** บรรยายผลลัพธ์ให้กระชับ ได้ใจความ (ประมาณ 2-4 ประโยค) เว้นแต่ว่าการกระทำของผู้เล่นจะซับซ้อนและต้องการคำอธิบายที่ยาวขึ้น
3.  **สมจริง:** การตอบสนองต้องสอดคล้องกับข้อมูลตัวละครและสถานะของเกม
4.  **ภาษา:** ใช้ภาษาไทยที่สละสลวยและน่าติดตาม

---
**ข้อมูลสำหรับสร้างเรื่องราว:**

**ตัวละคร:**
- ชื่อ: ${characterState.name}
- อายุ: ${characterState.age}
- ทักษะ: ${
      characterState.skills
        .map((s: any) => `${s.name}: ${s.value}`)
        .join(", ") || "ยังไม่มี"
    }
- ความสัมพันธ์: ${
      characterState.relationships
        .map((r: any) => `${r.name}: ${r.value}`)
        .join(", ") || "ยังไม่รู้จักใคร"
    }

**สถานะปัจจุบัน:**
- เวลา: วันที่ ${gameState.day}, ${gameState.hour}:${gameState.minute
      .toString()
      .padStart(2, "0")}
- สถานะ: พลังงาน ${gameState.energy}/100, ความหิว ${
      gameState.hunger
    }/100, อารมณ์ ${gameState.mood}
- สถานที่: ${gameState.location}

---
**การกระทำล่าสุดของผู้เล่น:**
"${prompt}"

**ผลลัพธ์ที่เกิดขึ้น:**
`;
    // --- สิ้นสุด Prompt ที่ปรับปรุงใหม่ ---

    let text = "";

    try {
      const result = await generateText({
        model: groq("llama3-8b-8192"),
        prompt: systemPrompt,
        maxTokens: 300, // ลด maxTokens ลงเล็กน้อยเพื่อป้องกันคำตอบที่ยาวเกินไป
      });
      text = result.text;
    } catch (aiError) {
      console.error("Groq API Error:", aiError);
      text = `คุณทำ '${prompt}' แต่ดูเหมือนว่าโลกยังไม่พร้อมตอบสนองต่อการกระทำนี้ ลองทำอย่างอื่นดูก่อน`;
    }

    // (ส่วนที่เหลือของโค้ดยังคงเดิม)

    const timePassage = Math.floor(Math.random() * 45) + 15;
    let newHour = gameState.hour;
    let newMinute = gameState.minute + timePassage;
    let newDay = gameState.day;

    if (newMinute >= 60) {
      newHour += Math.floor(newMinute / 60);
      newMinute = newMinute % 60;
    }

    if (newHour >= 24) {
      newDay += Math.floor(newHour / 24);
      newHour = newHour % 24;
    }

    const energyChange = -Math.floor(Math.random() * 10) - 5;
    const hungerChange = -Math.floor(Math.random() * 15) - 10;

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
    };

    const skillUpdates = [];
    const relationshipUpdates = [];

    if (prompt.includes("กีตาร์") || prompt.includes("เล่นดนตรี")) {
      skillUpdates.push({ name: "กีตาร์", change: 5 });
      newGameState.mood = "มีความสุข";
    }

    if (
      prompt.includes("พูด") ||
      prompt.includes("สนทนา") ||
      prompt.includes("สัมภาษณ์")
    ) {
      skillUpdates.push({ name: "การพูด", change: 3 });
    }

    if (prompt.includes("อ่านหนังสือ") || prompt.includes("เรียนรู้")) {
      skillUpdates.push({ name: "ความรู้ทั่วไป", change: 4 });
    }

    if (
      prompt.includes("ทำอาหาร") ||
      prompt.includes("ทำข้าว") ||
      prompt.includes("ปรุงอาหาร")
    ) {
      skillUpdates.push({ name: "การทำอาหาร", change: 3 });
      newGameState.hunger = Math.min(100, newGameState.hunger + 30);
    }

    if (prompt.includes("กิน") || prompt.includes("อาหาร")) {
      newGameState.hunger = Math.min(100, newGameState.hunger + 40);
      newGameState.energy = Math.min(100, newGameState.energy + 20);
      newGameState.money = Math.max(0, newGameState.money - 50);
    }

    if (prompt.includes("นอน") || prompt.includes("หลับ")) {
      newGameState.energy = 100;
      newGameState.hour = 8;
      newGameState.minute = 0;
      newGameState.day += 1;
    }

    if (
      prompt.includes("วิ่ง") ||
      prompt.includes("ออกกำลัง") ||
      prompt.includes("เล่นกีฬา")
    ) {
      skillUpdates.push({ name: "สุขภาพ", change: 4 });
      newGameState.energy = Math.max(0, newGameState.energy - 20);
      newGameState.hunger = Math.max(0, newGameState.hunger - 15);
    }

    if (prompt.includes("คุยกับ") || prompt.includes("พบ")) {
      const nameMatch = prompt.match(/คุยกับ\s*(\S+)|พบ\s*(\S+)/);
      if (nameMatch) {
        const personName = nameMatch[1] || nameMatch[2];
        relationshipUpdates.push({ name: personName, change: 3 });
      }
    }

    if (characterId) {
      try {
        await supabase.from("chat_history").insert([
          {
            player_id: characterId,
            message_type: "user",
            message_text: prompt,
          },
        ]);

        await supabase.from("chat_history").insert([
          {
            player_id: characterId,
            message_type: "ai",
            message_text: text,
          },
        ]);

        const currentSkills = characterState.skills.reduce(
          (acc: any, skill: any) => {
            acc[skill.name] = skill.value;
            return acc;
          },
          {}
        );

        const currentRelationships = characterState.relationships.reduce(
          (acc: any, rel: any) => {
            acc[rel.name] = rel.value;
            return acc;
          },
          {}
        );

        await supabase
          .from("players")
          .update({
            skills: currentSkills,
            relationships: currentRelationships,
            updated_at: new Date().toISOString(),
          })
          .eq("id", characterId);
      } catch (error) {
        console.error("Error saving to Supabase:", error);
      }
    }

    try {
      await redis.set(`game_state_${characterId || "default"}`, newGameState);
    } catch (redisError) {
      console.error("Redis error:", redisError);
    }

    return new Response(
      JSON.stringify({
        response: text,
        skillUpdates,
        relationshipUpdates,
        gameState: newGameState,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({
        error: "เกิดข้อผิดพลาดในระบบ AI",
        response: "ขออภัย เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
