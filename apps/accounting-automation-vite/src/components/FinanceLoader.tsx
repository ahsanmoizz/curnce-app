"use client";
import React from "react";

export default function FinanceLoader() {
  return (
    <div className="flex items-center justify-center gap-2">
      {/* Spinning Coin */}
      <div className="relative w-6 h-6">
        <div className="absolute inset-0 rounded-full border-2 border-yellow-400 animate-spin border-t-transparent"></div>
        <div className="absolute inset-1 rounded-full bg-yellow-300"></div>
      </div>

      {/* Finance Bars */}
      <div className="flex gap-1">
        <div className="w-1.5 h-4 bg-green-500 animate-bounce"></div>
        <div className="w-1.5 h-6 bg-green-400 animate-bounce delay-150"></div>
        <div className="w-1.5 h-3 bg-green-600 animate-bounce delay-300"></div>
      </div>
    </div>
  );
}
