import ChatShell from "@/components/Chat/ChatShell";

export default function Home() {
  return (
    <main className="container">
      <div className="shell">
        <div className="header">
          <h1>Shopping Chat Agent</h1>
          <p>Discover, compare, and understand phones — grounded to a curated catalog.</p>
        </div>

        <div style={{ padding: 16 }}>
          <ChatShell />
        </div>
      </div>
    </main>
  );
}
