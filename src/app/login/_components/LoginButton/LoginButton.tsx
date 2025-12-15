"use client";

import { createSupabaseClient } from "@/utils/supabase/client";
import { useState } from "react";

export default function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    const supabase = createSupabaseClient();
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="btn btn-primary w-full"
    >
      {isLoading ? <span className="loading loading-spinner"></span> : null}
      Googleでログイン
    </button>
  );
}
