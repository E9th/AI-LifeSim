"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateCharacterPage() {
  const [name, setName] = useState("");
  const [age, setAge] = useState(20);
  const [gender, setGender] = useState("");
  const [background, setBackground] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const maxLength = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("กรุณากรอกชื่อตัวละคร");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/create-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          age,
          gender: gender || null,
          background: background.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create character");
      }

      const result = await response.json();
      
      if (result.character?.id) {
        // เพิ่ม ID ของตัวละครใหม่เข้าไปในรายการที่เก็บใน localStorage
        const existingIds = JSON.parse(localStorage.getItem("characterIds") || "[]");
        // ป้องกันการเพิ่ม ID ซ้ำ
        if (!existingIds.includes(result.character.id)) {
            const newIds = [...existingIds, result.character.id];
            localStorage.setItem("characterIds", JSON.stringify(newIds));
        }
        
        // **การแก้ไขที่สำคัญ: นำทางกลับไปหน้าหลักเสมอ**
        router.push(`/`);
      } else {
         throw new Error("Character ID not found in API response");
      }

    } catch (error) {
      console.error("Error creating character:", error);
      alert("เกิดข้อผิดพลาดในการสร้างตัวละคร กรุณาลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="antialiased hero-bg min-h-screen">
      <header className="w-full py-6">
        <div className="container mx-auto px-6 flex justify-center items-center">
          <h1 className="text-xl font-bold tracking-widest">AI LifeSim</h1>
        </div>
      </header>

      <main className="w-full flex justify-center items-center py-10 px-4">
        <div className="form-container">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-medium mb-2">สร้างตัวละครของคุณ</h1>
            <p className="text-gray-600">กำหนดรายละเอียดเบื้องต้นเพื่อเริ่มต้นการเดินทาง</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="name" className="form-label block mb-1">
                ชื่อ
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                placeholder="ชื่อตัวละคร"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="mb-6">
              <label htmlFor="age" className="form-label block mb-1">
                อายุ
              </label>
              <input
                type="number"
                id="age"
                name="age"
                className="form-input"
                placeholder="20"
                value={age}
                onChange={(e) => setAge(Number.parseInt(e.target.value) || 20)}
                min="1"
                max="100"
                disabled={isSubmitting}
              />
            </div>

            <div className="mb-6">
              <label htmlFor="gender" className="form-label block mb-1">
                เพศ <span className="optional-text">(ไม่บังคับ)</span>
              </label>
              <select
                id="gender"
                name="gender"
                className="form-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">เลือกเพศ</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>

            <div className="mb-8">
              <label htmlFor="background" className="form-label block mb-1">
                ภูมิหลัง <span className="optional-text">(ไม่บังคับ)</span>
              </label>
              <textarea
                id="background"
                name="background"
                rows={4}
                className="form-textarea"
                placeholder="บอกเล่าเรื่องราวเบื้องหลังของตัวละครสั้นๆ"
                value={background}
                onChange={(e) => {
                  if (e.target.value.length <= maxLength) {
                    setBackground(e.target.value);
                  }
                }}
                disabled={isSubmitting}
              ></textarea>
              <p className="text-right text-xs text-gray-500 mt-1">
                {background.length}/{maxLength}
              </p>
            </div>

            <div className="flex items-center justify-center space-x-4">
                <Link href="/" className="text-sm text-gray-600 hover:underline">
                    กลับหน้าหลัก
                </Link>
                <button
                    type="submit"
                    className="cta-button font-bold py-3 px-10 rounded-sm text-lg tracking-wider"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "กำลังสร้าง..." : "สร้างตัวละคร"}
                </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
