import Link from "next/link"

export default function HomePage() {
  return (
    <div className="antialiased">
      {/* Header / เหมือนสันปกหนังสือ */}
      <header className="w-full py-6">
        <div className="container mx-auto px-6 flex justify-center items-center">
          <h1 className="text-xl font-bold tracking-widest">AI LifeSim</h1>
        </div>
      </header>

      {/* Main Content / หน้ากระดาษที่ว่างเปล่า */}
      <main className="hero-bg">
        <div className="container mx-auto px-6 text-center min-h-[80vh] flex flex-col justify-center items-center">
          <h1 className="text-4xl md:text-6xl book-title mb-4">เริ่มต้นชีวิตบทใหม่</h1>
          <h2 className="text-2xl md:text-3xl font-light text-gray-600 mb-8">กับโลกที่ตอบสนองต่อทุกการตัดสินใจของคุณ</h2>
          <p className="prose-style text-lg mx-auto mb-12">
            {
              "เคยสงสัยไหม... 'ถ้าหากว่า' ชีวิตคุณเป็นอีกแบบจะเป็นยังไง? ที่นี่คือโลกจำลองที่คุณจะได้ใช้ชีวิตอย่างอิสระ ทุกการกระทำของคุณ ตั้งแต่การตัดสินใจเรียนรู้ทักษะใหม่, การสร้างความสัมพันธ์กับผู้คน, ไปจนถึงการเลือกเส้นทางอาชีพ จะเป็นสิ่งที่กำหนด 'เส้นทางชีวิต' ของคุณ และ 'โลก' ทั้งใบที่ขับเคลื่อนโดย AI จะตอบสนองต่อคุณอย่างสมจริง และสร้างเรื่องราวของคุณที่ไม่ซ้ำใคร จงเป็นในสิ่งที่อยากเป็น และสำรวจทุกความเป็นไปได้ที่ไร้ขีดจำกัด เพราะที่นี่ คุณเป็น 'อิสระ'"
            }
          </p>
          <Link href="/create-character" className="cta-button font-bold py-3 px-10 rounded-sm text-lg tracking-wider">
            เริ่มต้นบทแรก
          </Link>
        </div>
      </main>

      {/* Footer / ปกหลัง */}
      <footer className="bg-transparent text-gray-500 py-8 mt-10">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2024 AI Life Simulation</p>
        </div>
      </footer>
    </div>
  )
}
