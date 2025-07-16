import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
// ใช้ Service Role Key เพื่อความปลอดภัยในการดำเนินการฝั่ง Server
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { prompt, characterState, gameState, chatHistory, characterId } =
      await req.json();

    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      console.error("GROQ_API_KEY is not set in environment variables.");
      return new Response(
        JSON.stringify({
          error: "ระบบ AI ไม่พร้อมใช้งาน: ไม่พบ API key",
          response:
            "ขออภัย ระบบ AI ไม่สามารถตอบสนองได้ในขณะนี้ กรุณาติดต่อผู้ดูแล",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // --- 🖋️ Prompt ที่ปรับปรุงใหม่ตามข้อเสนอแนะ V4 ---
    const systemPrompt = `
คุณคือ Game Master เล่าเรื่องราวของ AI LifeSim ในรูปแบบนิยายสั้นภาษาไทย
ข้อมูลตัวละคร: ชื่อ ${characterState.name}, อายุ ${characterState.age}
สถานะปัจจุบัน: วัน ${gameState.day} เวลา ${gameState.hour}:${gameState.minute.toString().padStart(2,'0')}, พลังงาน ${gameState.energy}/100, ความหิว ${gameState.hunger}/100, อารมณ์ ${gameState.mood}, สถานที่: ${gameState.location}

**รูปแบบการตอบ**
1. เล่าเหตุการณ์ที่เกิดขึ้นแบบภาพยนตร์สั้น (ไม่ต้องขึ้นบรรทัดหัวข้อ)
2. เติม "ความรู้สึก:" สั้น ๆ หนึ่งประโยค
3. จบด้วยคำถามปลายเปิดเพื่อให้ผู้เล่นเลือก

**ตัวอย่าง**
"เสียงนาฬิกาปลุกดังขึ้นในครัวเช้าของบ้านเอิร์ธ…
ความรู้สึก: เอิร์ธรู้สึกกระปรี้กระเปร่าเต็มที่
ทางเลือก: คุณจะทำอะไรต่อไป? 1. กินข้าวเช้า 2. ออกไปวิ่งรอบหมู่บ้าน"

---
ประวัติการสนทนา (ล่าสุด 4 ข้อ):
${chatHistory.slice(-4).map((m: any)=>`${m.type==='user'?'ผู้เล่น':'เรื่องราว'}: ${m.text}`).join('\n')}

ผู้เล่นเลือก: "${prompt}"

เล่าเหตุการณ์ต่อไป:
`;

    let text = "";

    try {
      const groqModel = groq("llama3-8b-8192", {
        apiKey: groqApiKey,
      });

      const result = await generateText({
        model: groqModel,
        prompt: systemPrompt,
        maxTokens: 300,
      });
      text = result.text;
    } catch (aiError) {
      console.error("Groq API Call Failed:", aiError);
      text = `คุณทำ '${prompt}' แต่ดูเหมือนว่าโลกยังไม่พร้อมตอบสนองต่อการกระทำนี้ ลองทำอย่างอื่นดูก่อน`;
    }

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

    if (prompt.includes("พูด") || prompt.includes("สนทนา") || prompt.includes("สัมภาษณ์")) {
      skillUpdates.push({ name: "การพูด", change: 3 });
    }

    if (prompt.includes("อ่านหนังสือ") || prompt.includes("เรียนรู้")) {
      skillUpdates.push({ name: "ความรู้ทั่วไป", change: 4 });
    }

    if (prompt.includes("ทำอาหาร") || prompt.includes("ทำข้าว") || prompt.includes("ปรุงอาหาร")) {
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

    if (prompt.includes("วิ่ง") || prompt.includes("ออกกำลัง") || prompt.includes("เล่นกีฬา")) {
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
          { player_id: characterId, message_type: "user", message_text: prompt },
          { player_id: characterId, message_type: "ai", message_text: text },
        ]);

        const skillsToUpdate = characterState.skills.reduce((acc: any, skill: any) => {
          acc[skill.name] = skill.value;
          return acc;
        }, {});

        skillUpdates.forEach(update => {
          skillsToUpdate[update.name] = (skillsToUpdate[update.name] || 0) + update.change;
          skillsToUpdate[update.name] = Math.max(0, Math.min(100, skillsToUpdate[update.name]));
        });

        const relationshipsToUpdate = characterState.relationships.reduce((acc: any, rel: any) => {
          acc[rel.name] = rel.value;
          return acc;
        }, {});

        relationshipUpdates.forEach(update => {
          relationshipsToUpdate[update.name] = (relationshipsToUpdate[update.name] || 50) + update.change;
          relationshipsToUpdate[update.name] = Math.max(0, Math.min(100, relationshipsToUpdate[update.name]));
        });

        await supabase
          .from("players")
          .update({
            skills: skillsToUpdate,
            relationships: relationshipsToUpdate,
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
