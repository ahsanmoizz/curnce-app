// src/pages/LandingPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import Lottie from "lottie-react";
import financeAnim from "../assets/animations/finance.json"; // 👈 put your finance animation here

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex flex-col overflow-hidden">
      {/* === Decorative Right Stripe === */}
      <div className="absolute top-0 right-[-150px] w-[420px] h-full transform -skew-x-12 bg-gradient-to-b from-indigo-700/20 via-blue-600/10 to-indigo-700/20 z-0 overflow-hidden flex items-center justify-center">
        <div className="w-[250px]">
          <Lottie animationData={financeAnim} loop={true} />
        </div>
      </div>

      {/* Hero Section */}
      <header className="relative z-10 flex flex-col items-center justify-center text-center flex-1 px-6 py-20 animate-fadeIn">
        <img
          src="/curn_resized.png"
          alt="Curnce Logo"
          className="h-32 w-32 object-contain mx-auto drop-shadow-2xl rounded-full animate-bounce-slow"
        />
        <h1
  className="mt-6 text-4xl md:text-5xl font-extrabold gradient-text"
  style={{
    backgroundImage:
      "linear-gradient(90deg, #EC368D 0%, #FF8400 25%, #FFD200 50%, #007AFF 75%, #1EE6FF 100%)",
  }}
> curnce</h1>

        <h1 className="mt-6 text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Smarter Finance. Automated.
        </h1>

        <p className="mt-4 text-lg text-gray-400 max-w-2xl">
          Your intelligent finance automation platform. <br />
          Secure, fast, and built for modern businesses.
        </p>

        <div className="mt-8 flex gap-4 flex-wrap justify-center">
          <Link
            to="/docs"
            className="px-6 py-3 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-600 transition shadow-lg hover:scale-105"
          >
            Documentation
          </Link>

          <Link
            to="/auth/register"
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold shadow-lg hover:scale-110 hover:opacity-95 transition-transform"
          >
            Get Started →
          </Link>
        </div>
      </header>

      {/* Showcase Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 w-full max-w-6xl bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700 p-10">
          {/* Left: Video Showcase */}
          <div className="flex flex-col justify-center items-center space-y-6">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-600 transform transition hover:scale-105 hover:shadow-indigo-500/30">
              <video
                src="/demo.mp4"
                controls
                autoPlay
                loop
                muted
                className="w-full h-72 object-cover"
              />
            </div>
            <p className="text-gray-400 text-sm text-center max-w-sm">
              See how Curnce automates your financial workflows with AI-powered
              insights and real-time dashboards.
            </p>
          </div>

          {/* Right: Text */}
          <div className="flex flex-col justify-center animate-slideUp">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Smarter Finance. Better Decisions.
            </h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Automate accounting, streamline reporting, and gain real-time
              insights with Curnce. <br />
              Whether you're running a startup or an enterprise, our platform is
              designed to scale with you.
            </p>
            <ul className="space-y-3 text-gray-300">
              <li>✔ Automated bookkeeping</li>
              <li>✔ Real-time dashboards</li>
              <li>✔ Secure cloud-based access</li>
              <li>✔ AI-powered insights</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-sm text-gray-500 border-t border-gray-800 mt-12">
        © {new Date().getFullYear()} Curnce. All rights reserved.
      </footer>
    </div>
  );
}
