"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"

interface Skill {
  name: string
  value: number
  max: number
}

interface Relationship {
  name: string
  value: number
  max: number
}

interface Character {
  id?: string
  name: string
  age: number
  skills: Skill[]
  relationships: Relationship[]
}

interface ChatMessage {
  type: "user" | "ai"
  text: string
}

export default function GamePage() {
  const [character, setCharacter] = useState<Character>({
    name: "ผู้เล่น",
    age: 20,
    skills: [],
    relationships: [],
  })

  const [chatInput, setChatInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      type: "ai",
      text: "แสงแดดยามเช้าสาดส่องเข้ามาทางหน้าต่าง ปลุกคุณให้ตื่นจากนิทรา วันนี้เป็นวันใหม่ที่เต็มไปด้วยความเป็นไปได้ คุณจะเริ่มต้นวันนี้อย่างไร?",
    },
  ])

  const chatLogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // โหลดข้อมูลตัวละครจาก localStorage หรือ API
    const characterId = localStorage.getItem("characterId")
    if (characterId) {
      // ในอนาคตจะโหลดข้อมูลจาก Supabase
      console.log("Loading character:", characterId)
    }
  }, [])

  useEffect(() => {
    // Scroll to bottom of chat log on new message
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight
    }
  }, [chatLog])

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isLoading) return

    const userMessage = chatInput.trim()
    const newUserMessage: ChatMessage = { type: "user", text: userMessage }
    setChatLog((prev) => [...prev, newUserMessage])
    setChatInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userMessage,
          characterState: character,
          chatHistory: chatLog,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const aiResponseText = data.response

      const newAiMessage: ChatMessage = { type: "ai", text: aiResponseText }
      setChatLog((prev) => [...prev, newAiMessage])

      // อัปเดตทักษะและความสัมพันธ์ตามการตอบสนองของ AI
      if (data.skillUpdates) {
        setCharacter((prev) => ({
          ...prev,
          skills: prev.skills.map((skill) => {
            const update = data.skillUpdates.find((u: any) => u.name === skill.name)
            return update ? { ...skill, value: Math.min(skill.max, skill.value + update.change) } : skill
          }),
        }))
      }

      if (data.relationshipUpdates) {
        setCharacter((prev) => ({
          ...prev,
          relationships: prev.relationships.map((rel) => {
            const update = data.relationshipUpdates.find((u: any) => u.name === rel.name)
            return update ? { ...rel, value: Math.min(rel.max, rel.value + update.change) } : rel
          }),
        }))
      }
    } catch (error) {
      console.error("Error fetching AI response:", error)
      setChatLog((prev) => [...prev, { type: "ai", text: "เกิดข้อผิดพลาดในการตอบกลับของ AI โปรดลองอีกครั้ง" }])
    } finally {
      setIsLoading(false)
    }
  }

  const SkillBar = ({ value, max }: { value: number; max: number }) => (
    <div className="skill-bar mt-1">
      <div className="skill-progress" style={{ width: `${(value / max) * 100}%` }}></div>
    </div>
  )

  return (
    <div className="antialiased flex flex-col min-h-screen">
      {/* Header */}
      <header className="w-full py-4">
        <div className="container mx-auto px-6 flex justify-center items-center">
          <h1 className="text-xl font-bold tracking-widest">AI LifeSim</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 flex-grow">
        <div className="main-container">
          {/* Left Panel: Character Status */}
          <aside className="status-panel">
            <h2 className="text-2xl font-medium border-b border-dashed border-gray-300 pb-2 mb-4">บันทึกตัวละคร</h2>

            <div className="mb-4">
              <h3 className="font-semibold">{character.name}</h3>
              <p className="text-sm text-gray-600">อายุ: {character.age}</p>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-2">ทักษะ</h4>
              <div className="space-y-3 text-sm">
                {character.skills.map((skill) => (
                  <div key={skill.name}>
                    <p>
                      {skill.name} ({skill.value}/{skill.max})
                    </p>
                    <SkillBar value={skill.value} max={skill.max} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">ความสัมพันธ์</h4>
              <div className="space-y-3 text-sm">
                {character.relationships.map((rel) => (
                  <div key={rel.name}>
                    <p>
                      {rel.name} ({rel.value}/{rel.max})
                    </p>
                    <SkillBar value={rel.value} max={rel.max} />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Panel: Chat & Story */}
          <main className="chat-panel">
            <div ref={chatLogRef} className="chat-log">
              {chatLog.map((msg, index) => (
                <p key={index} className={msg.type === "user" ? "user-action" : ""}>
                  {msg.text}
                </p>
              ))}
              {isLoading && <p className="text-gray-500 italic">AI กำลังคิด...</p>}
            </div>

            <div className="chat-input-area">
              <form onSubmit={handleChatSubmit} className="flex items-center space-x-2">
                <textarea
                  className="chat-textarea"
                  rows={2}
                  placeholder="คุณจะทำอะไรต่อไป..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isLoading}
                ></textarea>
                <button
                  type="submit"
                  className="send-button font-bold py-2 px-4 rounded-md"
                  disabled={isLoading || !chatInput.trim()}
                >
                  ส่ง
                </button>
              </form>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-gray-500 py-4 text-sm mt-auto">
        <p>&copy; 2024 AI Life Simulation</p>
      </footer>
    </div>
  )
}
