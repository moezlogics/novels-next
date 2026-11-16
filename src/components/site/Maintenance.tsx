export default function Maintenance({ message }: { message?: string }) {
  return (
    <div style={{ textAlign: "center", marginTop: "15%", fontFamily: "sans-serif", color: "#333", padding: "0 16px" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: 10 }}>We&apos;ll be back soon!</h1>
      <p style={{ fontSize: "1.2rem", color: "#666" }}>{message || "Sorry for the inconvenience but we're performing some maintenance at the moment. We'll be back online shortly!"}</p>
    </div>
  );
}
