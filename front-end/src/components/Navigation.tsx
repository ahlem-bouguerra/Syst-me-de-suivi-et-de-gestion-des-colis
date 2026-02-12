import Link from "next/link";

export default function Navigation() {
  const linkStyle = {
    padding: "8px 16px",
    borderRadius: 8,
    textDecoration: "none",
    color: "#4b5563",
    fontWeight: 500,
    transition: "all 0.2s",
  };

  return (
    <nav
      style={{
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        padding: "12px 24px",
        display: "flex",
        gap: 16,
        alignItems: "center",
      }}
    >
      <Link href="/alerts" style={{ ...linkStyle, fontWeight: 700, color: "#667eea" }}>
        🏠 Accueil
      </Link>

      <Link href="/" style={linkStyle} >
        📦 Scanner
      </Link>
  
      <Link href="/carriers" style={linkStyle}>
        🚚 Transporteurs
      </Link>
      <Link href="/status-update" style={linkStyle}>
        ✏️ Mise à jour
      </Link>
      <Link href="/bulk-import" style={linkStyle}>
        📄 Import en masse
      </Link>
      <Link href="/returns" style={linkStyle}>
        ↩️ Retours
      </Link>
      
    </nav>
  );
}