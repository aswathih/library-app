"use client";

import { useAuth } from "@/components/AuthProvider";
import { useState } from "react";

export default function BorrowButton({ itemId, ownerId, status }: { itemId: string, ownerId: string, status: string }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleRequest = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        body: JSON.stringify({ itemId, ownerId, requesterId: currentUser.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Request Sent! Notification Pushed.");
      } else {
        setMsg(data.error || "Failed");
      }
    } catch (err) {
      setMsg("Error sending request.");
    }
    setLoading(false);
  };

  if (!currentUser) return null;
  if (currentUser.id === ownerId) return <button className="btn" disabled>Your Book</button>;
  if (status !== "AVAILABLE") return <button className="btn" disabled>Unavailable</button>;

  return (
    <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
       <button className="btn btn-primary" onClick={handleRequest} disabled={loading || !!msg}>
         {loading ? "Sending..." : msg ? "Sent!" : "Request to Borrow"}
       </button>
       {msg && <small style={{color: "#10b981", textAlign: "center"}}>{msg}</small>}
    </div>
  );
}
