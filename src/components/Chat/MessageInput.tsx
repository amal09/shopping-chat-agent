"use client";

import { useState } from "react";

export default function MessageInput({
  onSend,
  disabled
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  }

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder='Try: "Best camera phone under ₹25k"'
        style={{
          flex: 1,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ddd"
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) submit();
        }}
      />

      <button
        onClick={submit}
        disabled={disabled}
        style={{
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid #ddd",
          background: disabled ? "#eee" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer"
        }}
      >
        Send
      </button>
    </div>
  );
}
