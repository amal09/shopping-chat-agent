"use client";

import { useState } from "react";

export default function ApiTester() {
  const [message, setMessage] = useState("Best camera phone under ₹30,000");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function send() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      const json = await res.json();
      setResult(json);
    } catch (e: any) {
      setResult({ error: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h2>API Tester (Commit 5)</h2>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
      />

      <button
        onClick={send}
        disabled={loading}
        style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc" }}
      >
        {loading ? "Sending..." : "Send to /api/chat"}
      </button>

      <pre style={{ marginTop: 16, background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
        {result ? JSON.stringify(result, null, 2) : "No response yet"}
      </pre>
    </div>
  );
}
