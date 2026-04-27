"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApprovalForm({ requestId }: { requestId: string }) {
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    if (!date) return alert("Select a date to handover the book!");
    setLoading(true);
    await fetch("/api/requests/approve", {
      method: "POST",
      body: JSON.stringify({ requestId, reminderDateString: date })
    });
    router.refresh();
  };

  return (
    <div style={{marginTop: "1rem", display: "flex", gap: "1rem", alignItems: "center"}}>
      <input type="date" className="input" style={{width: "auto"}} value={date} onChange={e => setDate(e.target.value)} />
      <button className="btn btn-primary" onClick={handleApprove} disabled={loading}>{loading ? "Approving..." : "Approve & Schedule"}</button>
    </div>
  );
}
