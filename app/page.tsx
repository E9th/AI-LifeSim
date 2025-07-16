"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CharacterSummary {
  id: string;
  name: string;
  age: number;
  created_at: string;
}

export default function HomePage() {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCharacters = async () => {
      const characterIds = JSON.parse(localStorage.getItem('characterIds') || '[]');
      if (characterIds.length > 0) {
        try {
          const response = await fetch('/api/characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterIds }),
          });
          if (response.ok) {
            const data = await response.json();
            setCharacters(data);
          }
        } catch (error) {
          console.error("Failed to fetch characters", error);
        }
      }
      setIsLoading(false);
    };

    fetchCharacters();
  }, []);

  const handleDelete = async (characterId: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบตัวละครนี้? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }

    try {
      const response = await fetch('/api/delete-character', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      });

      if (response.ok) {
        // ลบ ID ออกจาก localStorage
        const existingIds = JSON.parse(localStorage.getItem("characterIds") || "[]");
        const newIds = existingIds.filter((id: string) => id !== characterId);
        localStorage.setItem("characterIds", JSON.stringify(newIds));

        // อัปเดต State เพื่อให้ UI แสดงผลใหม่
        setCharacters(prev => prev.filter(char => char.id !== characterId));
        alert("ลบตัวละครสำเร็จ");
      } else {
        throw new Error('Failed to delete character');
      }
    } catch (error) {
      console.error("Error deleting character:", error);
      alert("เกิดข้อผิดพลาดในการลบตัวละคร");
    }
  };

  return (
    <div className="antialiased">
      <header className="w-full py-6">
        <div className="container mx-auto px-6 flex justify-center items-center">
          <h1 className="text-xl font-bold tracking-widest">AI LifeSim</h1>
        </div>
      </header>

      <main className="hero-bg">
        <div className="container mx-auto px-6 text-center min-h-[80vh] flex flex-col justify-center items-center">
          <h1 className="text-4xl md:text-6xl book-title mb-4">เลือกเส้นทางชีวิตของคุณ</h1>
          <p className="text-lg text-gray-600 mb-12">สร้างเรื่องราวบทใหม่ หรือสานต่อการเดินทางที่ผ่านมา</p>

          <div className="w-full max-w-2xl">
            <Link href="/create-character" className="block w-full cta-button font-bold py-4 px-10 rounded-sm text-xl tracking-wider mb-8">
              + สร้างตัวละครใหม่
            </Link>

            <h2 className="text-2xl font-medium mb-4">ตัวละครของคุณ</h2>
            {isLoading ? (
              <p>กำลังโหลดตัวละคร...</p>
            ) : characters.length > 0 ? (
              <div className="space-y-4">
                {characters.map(char => (
                  <div key={char.id} className="character-card flex items-center justify-between p-4 border rounded-lg bg-white bg-opacity-70">
                    <div>
                      <h3 className="text-xl font-semibold text-left">{char.name}</h3>
                      <p className="text-sm text-gray-500 text-left">อายุ: {char.age}, สร้างเมื่อ: {new Date(char.created_at).toLocaleDateString('th-TH')}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => router.push(`/game?characterId=${char.id}`)}
                        className="cta-button-secondary py-2 px-4 rounded-md">
                        เล่นต่อ
                      </button>
                      <button 
                        onClick={() => handleDelete(char.id)}
                        className="delete-button py-2 px-4 rounded-md">
                        ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">ยังไม่มีตัวละครที่สร้างไว้ เริ่มต้นสร้างตัวละครแรกของคุณได้เลย!</p>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-transparent text-gray-500 py-8 mt-10">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2024 AI Life Simulation</p>
        </div>
      </footer>
    </div>
  );
}
