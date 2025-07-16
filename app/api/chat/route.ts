import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Helper function to extract choices from AI response
function extractChoices(text: string): [string, string] {
  const choiceRegex = /ทางเลือก:\s*1\.\s*(.*?)\s*2\.\s*(.*)/s;
  const match = text.match(choiceRegex);
  if (match && match[1] && match[2]) {
    return [match[1].trim(), match[2].trim()];
  }
  // Default choices if parsing fails
  return ["สำรวจรอบๆ", "พักผ่อนสักครู่"];
}


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

    // --- 💡 1. Sanitize history and determine the real action ---
    const sanitizedHistory = chatHistory.map((m: any) => ({
        ...m,
        text: m.text.replace(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}/g, '').trim()
    }));

    const rawPrompt = prompt.trim();
    let actionText: string;

    if ((rawPrompt === '1' || rawPrompt === '2') && gameState.previousChoices?.length === 2) {
        actionText = gameState.previousChoices[parseInt(rawPrompt) - 1];
    } else {
        actionText = rawPrompt;
    }

    let text = "";
    let newLastAction = actionText;

    // --- 🛡️ 2. Refined fallback logic based on actionText ---
    if (actionText === gameState.last_action) {
      const fallbackResponses = [
        `เอิร์ธพยายามจะ '${actionText}' อีกครั้ง แต่ดูเหมือนว่าไม่มีอะไรเปลี่ยนแปลงหรือเกิดขึ้นเพิ่มเติมในตอนนี้ เขาจึงหยุดและคิดว่าจะทำอะไรต่อไปดี\nความรู้สึก: เอิร์ธรู้สึกว่าควรจะลองทำอะไรใหม่ๆ\nทางเลือก: 1. ออกไปเดินเล่นนอกบ้าน 2. เปิดทีวีดู`,
        `การทำ '${actionText}' ซ้ำอีกรอบไม่ได้ให้ผลลัพธ์ที่แตกต่างไปจากเดิม เอิร์ธจึงมองหาสิ่งอื่นทำ\nความรู้สึก: เอิร์ธเริ่มรู้สึกเบื่อเล็กน้อย\nทางเลือก: 1. จัดห้องให้เป็นระเบียบ 2. หาหนังสือมาอ่าน`
      ];
      text = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      // Reset last_action to prevent getting stuck in a fallback loop
      newLastAction = `__FALLBACK_RESOLVED__`; 
    } else {
      // --- 🖋️ 3. Generative branch using sanitized data ---
      const systemPrompt = `
คุณคือ Game Master เล่าเรื่องราวของ AI LifeSim ในรูปแบบนิยายสั้นภาษาไทย
ห้ามพิมพ์วันที่หรือเวลาใด ๆ ในเนื้อเรื่อง

ข้อมูลตัวละคร: ชื่อ ${characterState.name}, อายุ ${characterState.age}
สถานะ: พลังงาน ${gameState.energy}/100, ความหิว ${gameState.hunger}/100, อารมณ์ ${gameState.mood}, สถานที่: ${gameState.location}

**รูปแบบการตอบ**
1. เล่าเหตุการณ์ใหม่ 1 ช็อต แบบภาพยนตร์สั้น (ย่อเดียวพอ)
2. เติม "ความรู้สึก:" สั้น ๆ หนึ่งประโยค
3. จบด้วย "ทางเลือก:" พร้อมตัวเลือก 2 แบบให้ผู้เล่นตอบ

**ตัวอย่าง**
“แสงแดดยามเช้าส่องลอดม่านเข้ามาในครัว เอิร์ธสูดหายใจลึก ๆ รู้สึกกระปรี้กระเปร่า…
ความรู้สึก: เอิร์ธเต็มไปด้วยพลังสำหรับวันใหม่
ทางเลือก: 1. เตรียมอาหารเช้า 2. ออกไปวิ่งนอกบ้าน”

---
ประวัติสนทนา (4 ข้อสุดท้าย):
${sanitizedHistory.slice(-4).map((m: any)=>`${m.type==='user'?'ผู้เล่น':'AI'}: ${m.text}`).join('\n')}

ผู้เล่นเลือก: "${actionText}"

เล่าเหตุการณ์ต่อ:
`;

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
        text = `คุณทำ '${actionText}' แต่ดูเหมือนว่าโลกยังไม่พร้อมตอบสนองต่อการกระทำนี้ ลองทำอย่างอื่นดูก่อน`;
      }
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

    const newChoices = extractChoices(text);

    const newGameState = {
      ...gameState,
      day: newDay,
      hour: newHour,
      minute: newMinute,
      energy: Math.max(0, Math.min(100, gameState.energy + energyChange)),
      hunger: Math.max(0, Math.min(100, gameState.hunger + hungerChange)),
      last_action: newLastAction,
      last_response: text,
      previousChoices: newChoices,
      timestamp: new Date().toISOString(),
    };

    const skillUpdates = [];
    const relationshipUpdates = [];

    if (actionText.includes("กีตาร์") || actionText.includes("เล่นดนตรี")) {
      skillUpdates.push({ name: "กีตาร์", change: 5 });
      newGameState.mood = "มีความสุข";
    }
    if (actionText.includes("พูด") || actionText.includes("สนทนา") || actionText.includes("สัมภาษณ์")) {
      skillUpdates.push({ name: "การพูด", change: 3 });
    }
    if (actionText.includes("อ่านหนังสือ") || actionText.includes("เรียนรู้")) {
      skillUpdates.push({ name: "ความรู้ทั่วไป", change: 4 });
    }
    if (actionText.includes("ทำอาหาร") || actionText.includes("ทำข้าว") || actionText.includes("ปรุงอาหาร")) {
      skillUpdates.push({ name: "การทำอาหาร", change: 3 });
      newGameState.hunger = Math.min(100, newGameState.hunger + 30);
    }
    if (actionText.includes("กิน") || actionText.includes("อาหาร")) {
      newGameState.hunger = Math.min(100, newGameState.hunger + 40);
      newGameState.energy = Math.min(100, newGameState.energy + 20);
      newGameState.money = Math.max(0, newGameState.money - 50);
    }
    if (actionText.includes("นอน") || actionText.includes("หลับ")) {
      newGameState.energy = 100;
      newGameState.hour = 8;
      newGameState.minute = 0;
      newGameState.day += 1;
    }
    if (actionText.includes("วิ่ง") || actionText.includes("ออกกำลัง") || actionText.includes("เล่นกีฬา")) {
      skillUpdates.push({ name: "สุขภาพ", change: 4 });
      newGameState.energy = Math.max(0, newGameState.energy - 20);
      newGameState.hunger = Math.max(0, newGameState.hunger - 15);
    }
    if (actionText.includes("คุยกับ") || actionText.includes("พบ")) {
      const nameMatch = actionText.match(/คุยกับ\s*(\S+)|พบ\s*(\S+)/);
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
