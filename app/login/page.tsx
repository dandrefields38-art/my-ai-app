"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        email,
      });

      if (error) {
        alert(error.message);
      } else {
        alert("Check your email for login link!");
      }
    } catch (err) {
      console.log(err);
      alert("Login failed");
    }

    setLoading(false);
  };

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center">

      <div className="w-96 bg-white/5 p-6 rounded-xl space-y-4">

        <h1 className="text-2xl font-bold">
          Login to Inquire
        </h1>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg bg-black border border-white/10"
        />

        <button
          onClick={signIn}
          disabled={loading}
          className="w-full bg-blue-600 py-3 rounded-lg"
        >
          {loading ? "Sending..." : "Send Login Link"}
        </button>

      </div>

    </div>
  );
}