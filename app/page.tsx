"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32">

        <div className="text-blue-500 text-sm mb-4">
          AI POWERED ASSISTANT
        </div>

        <h1 className="text-5xl md:text-7xl font-bold max-w-5xl leading-tight">
          Your Intelligent AI Workspace
        </h1>

        <p className="text-white/60 mt-6 max-w-2xl text-lg">
          Inquire AI helps you think faster,
          create smarter, and work like the future.
        </p>

        <div className="flex gap-4 mt-10">

          <Link
            href="/chat"
            className="bg-blue-600 hover:bg-blue-500 transition px-6 py-3 rounded-lg"
          >
            Start Chatting
          </Link>

          <Link
            href="/sign-up"
            className="border border-white/20 hover:bg-white/10 transition px-6 py-3 rounded-lg"
          >
            Create Account
          </Link>

        </div>

      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-6 px-6 md:px-20 pb-32">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-3">
            Lightning Fast AI
          </h3>

          <p className="text-white/60">
            Stream real-time AI responses instantly
            with modern GPT technology.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-3">
            Persistent Chats
          </h3>

          <p className="text-white/60">
            Save conversations forever with
            cloud-powered storage.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-3">
            Pro Intelligence
          </h3>

          <p className="text-white/60">
            Unlock unlimited AI usage and
            advanced capabilities with Pro.
          </p>
        </div>

      </section>

      {/* PRICING */}
      <section className="px-6 md:px-20 pb-32">

        <div className="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-10 text-center">

          <div className="text-blue-500 mb-3">
            SIMPLE PRICING
          </div>

          <h2 className="text-4xl font-bold">
            Inquire Pro
          </h2>

          <div className="text-6xl font-bold mt-6">
            $20
            <span className="text-lg text-white/50">
              /month
            </span>
          </div>

          <div className="space-y-3 mt-8 text-white/70">

            <div>Unlimited AI Messages</div>
            <div>Priority Responses</div>
            <div>Future Premium Features</div>

          </div>

          <Link
            href="/chat"
            className="inline-block mt-10 bg-blue-600 hover:bg-blue-500 transition px-6 py-3 rounded-lg"
          >
            Get Started
          </Link>

        </div>

      </section>

    </main>
  );
}