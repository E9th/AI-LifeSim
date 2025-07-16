import type React from "react"
import type { Metadata } from "next"
import { Sarabun } from "next/font/google"
import "./globals.css"

const sarabun = Sarabun({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin", "thai"],
  variable: "--font-sarabun",
})

export const metadata: Metadata = {
  title: "AI Life Simulation",
  description: "บันทึกชีวิตบทใหม่ของคุณ",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} font-sarabun antialiased`}>{children}</body>
    </html>
  )
}
