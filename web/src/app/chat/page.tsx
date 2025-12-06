"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatScreen from "@/components/Chat/ChatScreen";
import { storage } from "@/lib/storage";

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    const auth = storage.getAuth();
    if (!auth?.accessToken) {
      router.push("/login");
    }
  }, [router]);

  return <ChatScreen />;
}

