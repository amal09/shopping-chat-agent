import ChatShell from "@/components/Chat/ChatShell";

export default function Home() {
  return (
    <main style={{ padding: 20, fontFamily: "system-ui", maxWidth: 980, margin: "0 auto" }}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Shopping Chat Agent</h1>
        <p style={{ marginTop: 8, opacity: 0.75 }}>
          Ask for recommendations, comparisons, or feature explanations (grounded to our catalog).
        </p>
      </header>

      <div style={{ border: "1px solid #eee", borderRadius: 14 }}>
        <ChatShell />
      </div>
    </main>
  );
}
