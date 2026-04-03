import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'mrgant — Timeline Builder',
  description: 'A fast, intuitive Gantt chart builder',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
