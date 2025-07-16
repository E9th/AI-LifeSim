import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const characterId = searchParams.get("characterId");

    if (!characterId) {
      return new Response(JSON.stringify({ error: "Character ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: character, error: characterError } = await supabase
      .from("players")
      .select("*")
      .eq("id", characterId)
      .single();

    if (characterError) {
      console.error("Error loading character:", characterError);
      return new Response(JSON.stringify({ error: "Character not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: chatMessages, error: chatError } = await supabase
      .from("chat_history")
      .select("*")
      .eq("player_id", characterId)
      .order("created_at", { ascending: true });

    if (chatError) {
      console.error("Error loading chat history:", chatError);
    }

    const chatHistory =
      chatMessages?.map((msg) => ({
        type: msg.message_type,
        text: msg.message_text,
        timestamp: msg.created_at,
      })) || [];

    let gameState;
    try {
      const redisGameState = await redis.get(`game_state_${characterId}`);
      if (redisGameState) {
        gameState = redisGameState;
      } else {
        // Default state if not found in Redis
        gameState = {
          energy: 100,
          hunger: 100,
          money: 1000,
          day: 1,
          hour: 8,
          minute: 0,
          mood: "ปกติ",
          location: "บ้าน",
          previousChoices: [], // Add default
          last_action: "",     // Add default
        };
      }
    } catch (redisError) {
      console.error("Redis error:", redisError);
      gameState = {
        energy: 100,
        hunger: 100,
        money: 1000,
        day: 1,
        hour: 8,
        minute: 0,
        mood: "ปกติ",
        location: "บ้าน",
        previousChoices: [],
        last_action: "",
      };
    }

    const skills = Object.entries(character.skills || {})
      .filter(([name, value]) => (value as number) > 0)
      .map(([name, value]) => ({
        name,
        value: value as number,
        max: 100,
      }));

    const relationships = Object.entries(character.relationships || {})
      .filter(([name, value]) => (value as number) > 0)
      .map(([name, value]) => ({
        name,
        value: value as number,
        max: 100,
      }));

    const characterData = {
      id: character.id,
      name: character.name,
      age: character.age,
      skills,
      relationships,
    };

    return new Response(
      JSON.stringify({
        character: characterData,
        chatHistory,
        gameState,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in chat-history API:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
