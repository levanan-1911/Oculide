import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Oculide – Code with Clarity, Test with Integrity',
  description: 'Nền tảng thi lập trình trực tuyến với AI proctoring thời gian thực. Viết code, thi cử, giám sát — tất cả trên một nền tảng.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <div className="bg-mesh" />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(15, 15, 42, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f1f5f9',
              backdropFilter: 'blur(20px)',
              borderRadius: '10px',
              fontSize: '13px',
              padding: '12px 16px',
            },
          }}
        />
      </body>
    </html>
  )
}
