"use client";

import { useEffect, useRef, useState } from "react";

export default function MessageInput({
  onSend,
  disabled
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  function submit() {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  }

  return (
    <div className="row">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder='Try: "Best camera phone under ₹25k"'
        className="textInput"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) submit();
        }}
      />

      <button onClick={submit} disabled={disabled} className="btn">
        Send
      </button>
    </div>
  );
}
