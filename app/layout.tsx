import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pendle YT Pricing Accuracy Dashboard',
  description: 'Analyze how accurate Pendle YT pricing was for expired markets',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
