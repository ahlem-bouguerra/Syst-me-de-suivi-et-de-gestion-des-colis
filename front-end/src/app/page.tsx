"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "../components/Navigation"; // ← استيراد الـ component

type Parcel = {
  id: number;
  trackingNumber: string;
  status: string;
  destination: string | null;
  outboundScannedAt: string | null;
  createdAt: string;
  updatedAt: string;
  carrierId: number | null;
  carrier?: { id: number; name: string } | null;
};

type ScanResponse =
  | { ok: true; parcel: Parcel }
  | { ok: false; errors?: any; message?: string };

type ParcelsListResponse =
  | { ok: true; parcels: Parcel[] }
  | { ok: false; message?: string };

export default function ScanPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  const [trackingNumber, setTrackingNumber] = useState("");
  const [destination, setDestination] = useState("");
  const [userId, setUserId] = useState("u1");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);

  const [recentLoading, setRecentLoading] = useState(false);
  const [recent, setRecent] = useState<Parcel[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);

  async function loadRecent() {
    setRecentLoading(true);
    setRecentError(null);

    try {
      const res = await fetch(`${apiBase}/api/parcels?limit=20`, { cache: "no-store" });
      const data = (await res.json()) as ParcelsListResponse;

      if (!data.ok) {
        setRecentError(data.message ?? "Failed to load parcels");
        setRecent([]);
      } else {
        setRecent(data.parcels);
      }
    } catch (e: any) {
      setRecentError(e?.message ?? "Network error");
      setRecent([]);
    } finally {
      setRecentLoading(false);
    }
  }

  useEffect(() => {
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${apiBase}/api/scan/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber, destination, userId }),
      });

      const data = (await res.json()) as ScanResponse;
      setResult(data);

      if (data.ok) {
        setTrackingNumber("");
        setDestination("");
        await loadRecent();
      }
    } catch (e: any) {
      setResult({ ok: false, message: e?.message ?? "Network error" });
    } finally {
      setLoading(false);
    }
  }

  const successParcel = result && result.ok ? result.parcel : null;

  return (
    <div>
      {/* ✅ استخدام الـ Navigation Component */}
      <Navigation />

      {/* المحتوى الرئيسي */}
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Outbound Scan</h1>

        <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <label>
            Tracking Number
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="AB12345"
              style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
            />
          </label>

          <label>
            Destination (optional)
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Tunis"
              style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
            />
          </label>

          <label>
            User ID (optional)
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="u1"
              style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
            />
          </label>

          <button
            onClick={submit}
            disabled={loading || trackingNumber.trim().length < 3}
            style={{ 
              padding: 12, 
              borderRadius: 10, 
              border: "none", 
              cursor: loading || trackingNumber.trim().length < 3 ? "not-allowed" : "pointer",
              background: loading || trackingNumber.trim().length < 3 ? "#ccc" : "#667eea",
              color: "white",
              fontWeight: 600
            }}
          >
            {loading ? "Scanning..." : "Scan Outbound"}
          </button>

          {result && result.ok && (
            <div style={{ padding: 12, borderRadius: 10, border: "1px solid #cfe9d4", background: "#f3fbf5" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ Scan enregistré</div>
              <div>Tracking: <b>{successParcel?.trackingNumber}</b></div>
              <div>Status: <b>{successParcel?.status}</b></div>
              <div>Carrier: <b>{successParcel?.carrier?.name ?? `#${successParcel?.carrierId ?? "-"}`}</b></div>
              <div>Destination: <b>{successParcel?.destination ?? "-"}</b></div>
              <div>Outbound time: <b>{successParcel?.outboundScannedAt ?? "-"}</b></div>
              
              <Link
                href={`/parcels/${successParcel?.trackingNumber}`}
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  padding: "6px 12px",
                  background: "#667eea",
                  color: "white",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                📋 Voir les détails
              </Link>
            </div>
          )}

          {result && !result.ok && (
            <div style={{ padding: 12, borderRadius: 10, border: "1px solid #f5c2c7", background: "#fff5f5" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>❌ Erreur</div>
              <div>{result.message ?? "Validation error"}</div>
              {result.errors && (
                <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{JSON.stringify(result.errors, null, 2)}</pre>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Derniers colis scannés</h2>
            <button onClick={loadRecent} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
              {recentLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {recentError && (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 10, border: "1px solid #f5c2c7", background: "#fff5f5" }}>
              {recentError}
            </div>
          )}

          <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Tracking</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Carrier</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Status</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Destination</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Outbound</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{p.trackingNumber}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>
                      {p.carrier?.name ?? (p.carrierId ? `#${p.carrierId}` : "-")}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{p.status}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{p.destination ?? "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{p.outboundScannedAt ?? "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>
                      <Link
                        href={`/parcels/${p.trackingNumber}`}
                        style={{
                          padding: "4px 10px",
                          background: "#e3f2fd",
                          color: "#1976d2",
                          borderRadius: 6,
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Détails
                      </Link>
                    </td>
                  </tr>
                ))}

                {!recentLoading && recent.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 14, color: "#666", textAlign: "center" }}>
                      Aucun colis pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}