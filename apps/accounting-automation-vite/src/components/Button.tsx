import type { ReactNode } from "react";

import clsx from "clsx"

interface ButtonProps {
  children: ReactNode
  variant?: "primary" | "secondary"
  onClick?: () => void
}

export function Button({ children, variant = "primary", onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-4 py-2 rounded-md font-medium shadow-sm transition",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "secondary" && "bg-gray-100 text-gray-800 hover:bg-gray-200"
      )}
    >
      {children}
    </button>
  )
}
