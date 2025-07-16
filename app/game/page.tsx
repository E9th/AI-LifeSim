"use client";

import type React from "react";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Interfaces
interface Skill {
  name: string;
  value: number;
  max: number;
}

interface Relationship {
  name: string;
  value: number;
  max: number;
}

interface Character {
  id?: string;
  name: string;
  age: number;
  skills: Skill[];
  relationships: Relationship[];
}

interface ChatMessage {
  type: "user" | "ai";
  text: string;
  timestamp?: string;
}

interface GameState {
  energy: number;
  hunger: number;
  money: number;
  day: number;
  hour: number;
  minute: number;
  mood: string;
  location: string;
}

// The actual game content that uses search params
function GamePageContent() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true); // สถานะโหลดหน้าครั้งแรก
  const [isChatLoading, setIsChatLoading] = useState(false); // สถานะรอ AI ตอบ
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const characterId = searchParams.get('characterId');
  const chatLogRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null); // Ref สำหรับจุดท้ายสุดของแชท

  useEffect(() => {
    if (!characterId) {
      router.push('/');
      return;
    }

    const loadGameData = async () => {
      setIsPageLoading(true);
      try {
        const response = await fetch(`/api/chat-history?characterId=${characterId}`);
        if (!response.ok) {
            throw new Error('Failed to load game data');
        }
        const data = await response.json();
        
        if (data.character) setCharacter(data.character);
        if (data.gameState) setGameState(data.gameState);

        if (data.chatHistory && data.chatHistory.length > 0) {
          setChatLog(data.chatHistory);
        } else {
          setChatLog([
            {
              type: "ai",
              text: "แสงแดดยามเช้าสาดส่องเข้ามาทางหน้าต่าง ปลุกคุณให้ตื่นจากนิทรา วันนี้เป็นวันใหม่ที่เต็มไปด้วยความเป็นไปได้ คุณจะเริ่มต้นวันนี้อย่างไร?",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch (error) {
        console.error("Error loading game data:", error);
        router.push('/');
      } finally {
        setIsPageLoading(false);
      }
    };

    loadGameData();
  }, [characterId, router]);

  // --- ✨ FIX: ปรับปรุงการ Scroll ---
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]); // ทำงานทุกครั้งที่ chatLog เปลี่ยน

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading || !character || !gameState) return;

    const userMessage = chatInput.trim();
    const newUserMessage: ChatMessage = {
      type: "user",
      text: userMessage,
      timestamp: new Date().toISOString(),
    };
    setChatLog((prev) => [...prev, newUserMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage,
          characterState: character,
          gameState: gameState,
          chatHistory: chatLog,
          characterId: characterId,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const newAiMessage: ChatMessage = {
        type: "ai",
        text: data.response,
        timestamp: new Date().toISOString(),
      };
      setChatLog((prev) => [...prev, newAiMessage]);

      if (data.skillUpdates && data.skillUpdates.length > 0) {
        setCharacter((prev) => {
            if (!prev) return null;
            const updatedSkills = [...prev.skills];
            data.skillUpdates.forEach((update: any) => {
                const existingSkillIndex = updatedSkills.findIndex((s) => s.name === update.name);
                if (existingSkillIndex >= 0) {
                    updatedSkills[existingSkillIndex].value = Math.min(100, updatedSkills[existingSkillIndex].value + update.change);
                } else {
                    updatedSkills.push({ name: update.name, value: Math.min(100, update.change), max: 100 });
                }
            });
            return { ...prev, skills: updatedSkills };
        });
      }

      if (data.relationshipUpdates && data.relationshipUpdates.length > 0) {
        setCharacter((prev) => {
            if (!prev) return null;
            const updatedRelationships = [...prev.relationships];
            data.relationshipUpdates.forEach((update: any) => {
                const existingRelIndex = updatedRelationships.findIndex((r) => r.name === update.name);
                if (existingRelIndex >= 0) {
                    updatedRelationships[existingRelIndex].value = Math.min(100, Math.max(0, updatedRelationships[existingRelIndex].value + update.change));
                } else {
                    updatedRelationships.push({ name: update.name, value: Math.max(0, Math.min(100, 50 + update.change)), max: 100 });
                }
            });
            return { ...prev, relationships: updatedRelationships };
        });
      }

      if (data.gameState) {
        setGameState(data.gameState);
      }
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setChatLog((prev) => [
        ...prev,
        {
          type: "ai",
          text: "เกิดข้อผิดพลาดในการตอบกลับของ AI โปรดลองอีกครั้ง",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const StatusBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium min-w-[60px]">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }}></div>
      </div>
      <span className="text-sm min-w-[40px] text-right">
        {value}/{max}
      </span>
    </div>
  );

  const SkillBar = ({ value, max }: { value: number; max: number }) => (
    <div className="skill-bar mt-1">
      <div className="skill-progress" style={{ width: `${(value / max) * 100}%` }}></div>
    </div>
  );

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  };

  const getTimeOfDay = (hour: number) => {
    if (hour >= 6 && hour < 12) return "เช้า";
    if (hour >= 12 && hour < 18) return "บ่าย";
    if (hour >= 18 && hour < 22) return "เย็น";
    return "กลางคืน";
  };

  // --- ✨ FIX: แสดงหน้าโหลดเฉพาะครั้งแรกที่เข้าหน้า ---
  if (isPageLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <p>กำลังโหลดข้อมูลเกม...</p>
        </div>
    )
  }
  
  if (!character || !gameState) {
    // กรณีที่โหลดข้อมูลไม่สำเร็จ
    return (
        <div className="flex flex-col justify-center items-center min-h-screen">
            <p className="mb-4">ไม่สามารถโหลดข้อมูลตัวละครได้</p>
            <Link href="/" className="cta-button py-2 px-4 rounded-md">
                กลับหน้าหลัก
            </Link>
        </div>
    )
  }

  return (
    <div className="antialiased flex flex-col min-h-screen">
      <header className="w-full py-4">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="text-sm hover:underline">
            &larr; กลับไปหน้าเลือกตัวละคร
          </Link>
          <h1 className="text-xl font-bold tracking-widest">AI LifeSim</h1>
          <div className="w-36 md:w-48"></div> {/* Spacer */}
        </div>
      </header>

      <div className="w-full bg-white bg-opacity-60 border-b border-gray-200 py-3">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
            <div className="text-center">
              <div className="text-sm text-gray-600">วันที่ {gameState.day}</div>
              <div className="font-semibold">
                {formatTime(gameState.hour, gameState.minute)} ({getTimeOfDay(gameState.hour)})
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">เงิน</div>
              <div className="font-semibold">{gameState.money} บาท</div>
            </div>
            <div>
              <StatusBar label="พลังงาน" value={gameState.energy} max={100} color="bg-green-500" />
            </div>
            <div>
              <StatusBar label="ความหิว" value={gameState.hunger} max={100} color="bg-orange-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 flex-grow">
        <div className="main-container">
          <aside className="status-panel">
            <h2 className="text-2xl font-medium border-b border-dashed border-gray-300 pb-2 mb-4">บันทึกตัวละคร</h2>
            <div className="mb-6">
              <h3 className="font-semibold text-lg">{character.name}</h3>
              <p className="text-sm text-gray-600">อายุ: {character.age}</p>
              <p className="text-sm text-gray-600">สถานที่: {gameState.location}</p>
              <p className="text-sm text-gray-600">อารมณ์: {gameState.mood}</p>
            </div>
            <div className="mb-6">
              <h4 className="font-semibold mb-3">ทักษะ</h4>
              <div className="space-y-3 text-sm">
                {character.skills.length === 0 ? (
                  <p className="text-gray-500 italic">ยังไม่มีทักษะ</p>
                ) : (
                  character.skills.map((skill) => (
                    <div key={skill.name}>
                      <p>{skill.name} ({skill.value}/{skill.max})</p>
                      <SkillBar value={skill.value} max={skill.max} />
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">ความสัมพันธ์</h4>
              <div className="space-y-3 text-sm">
                {character.relationships.length === 0 ? (
                  <p className="text-gray-500 italic">ยังไม่รู้จักใคร</p>
                ) : (
                  character.relationships.map((rel) => (
                    <div key={rel.name}>
                      <p>{rel.name} ({rel.value}/{rel.max})</p>
                      <SkillBar value={rel.value} max={rel.max} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          <main className="chat-panel">
            <div ref={chatLogRef} className="chat-log">
              {chatLog.map((msg, index) => (
                <div key={index} className="mb-4">
                  <p className={msg.type === "user" ? "user-action" : ""}>{msg.text}</p>
                  {msg.timestamp && (
                    <p className="text-xs text-gray-400 mt-1">{new Date(msg.timestamp).toLocaleString("th-TH")}</p>
                  )}
                </div>
              ))}
              {isChatLoading && <p className="text-gray-500 italic">AI กำลังคิด...</p>}
              <div ref={endOfMessagesRef} /> {/* Element สำหรับ Scroll ไปหา */}
            </div>

            <div className="chat-input-area">
              <form onSubmit={handleChatSubmit} className="flex items-center space-x-2">
                <textarea
                  className="chat-textarea"
                  rows={2}
                  placeholder="คุณจะทำอะไรต่อไป..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isChatLoading}
                ></textarea>
                <button
                  type="submit"
                  className="send-button font-bold py-2 px-4 rounded-md"
                  disabled={isChatLoading || !chatInput.trim()}
                >
                  ส่ง
                </button>
              </form>
            </div>
          </main>
        </div>
      </div>

      <footer className="w-full text-center text-gray-500 py-4 text-sm mt-auto">
        <p>&copy; 2024 AI Life Simulation</p>
      </footer>
    </div>
  );
}

// Main page component that wraps the content in Suspense
export default function GamePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><p>กำลังโหลด...</p></div>}>
      <GamePageContent />
    </Suspense>
  );
}
