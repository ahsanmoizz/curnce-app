import type { ReactNode } from "react";

interface CardProps {
  title?: string
  children: ReactNode
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      {title && <h2 className="text-sm font-semibold mb-2">{title}</h2>}
      {children}
    </div>
  )
}
