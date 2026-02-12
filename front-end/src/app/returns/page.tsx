"use client";

import { useEffect, useState } from "react";
import Navigation from "../../components/Navigation"; // ← استيراد الـ component

type Parcel = {
  id: number;
  trackingNumber: string;
  status: string;
  destination: string | null;
  returnReceivedAt: string | null;
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

export default function ReturnsScanPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  const [trackingNumber, setTrackingNumber] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);

  const [recentLoading, setRecentLoading] = useState(false);
  const [recent, setRecent] = useState<Parcel[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);

  async function loadRecent() {
    setRecentLoading(true);
    setRecentError(null);

    try {
      const res = await fetch(`${apiBase}/api/parcels?status=RETURN_RECEIVED&limit=20`, { 
        cache: "no-store" 
      });
      const data = (await res.json()) as ParcelsListResponse;

      if (!data.ok) {
        setRecentError(data.message ?? "Failed to load returns");
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
      const res = await fetch(`${apiBase}/api/scan/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          trackingNumber, 
          receivedBy: receivedBy || undefined,
          location: location || undefined,
          note: note || undefined
        }),
      });

      const data = (await res.json()) as ScanResponse;
      setResult(data);

      if (data.ok) {
        setTrackingNumber("");
        setReceivedBy("");
        setLocation("");
        setNote("");
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
      <div>      {/* ✅ استخدام الـ Navigation Component */}      <Navigation />
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        📦 Returns Scan
      </h1>

      <div style={{ 
        display: "grid", 
        gap: 12, 
        padding: 16, 
        border: "1px solid #eee", 
        borderRadius: 12,
        background: "#fafafa"
      }}>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Tracking Number *</div>
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="AB12345"
            style={{ 
              width: "100%", 
              padding: 10, 
              border: "1px solid #ccc", 
              borderRadius: 8,
              fontSize: 14
            }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Reçu par (optionnel)</div>
          <input
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
            placeholder="Mohammed, Fatma, etc."
            style={{ 
              width: "100%", 
              padding: 10, 
              border: "1px solid #ccc", 
              borderRadius: 8,
              fontSize: 14
            }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Emplacement (optionnel)</div>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Warehouse A, Shelf 12, etc."
            style={{ 
              width: "100%", 
              padding: 10, 
              border: "1px solid #ccc", 
              borderRadius: 8,
              fontSize: 14
            }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Note (optionnel)</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Colis endommagé, ouvert, etc."
            rows={3}
            style={{ 
              width: "100%", 
              padding: 10, 
              border: "1px solid #ccc", 
              borderRadius: 8,
              fontSize: 14,
              resize: "vertical"
            }}
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
            background: loading || trackingNumber.trim().length < 3 ? "#ccc" : "#4CAF50",
            color: "white",
            fontWeight: 600,
            fontSize: 16
          }}
        >
          {loading ? "⏳ Enregistrement..." : "✅ Enregistrer le retour"}
        </button>

        {/* ✅ Success Message */}
        {result && result.ok && (
          <div style={{ 
            padding: 14, 
            borderRadius: 10, 
            border: "2px solid #4CAF50", 
            background: "#f3fbf5" 
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16, color: "#2e7d32" }}>
              ✅ Retour enregistré avec succès
            </div>
            <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
              <div><strong>Tracking:</strong> {successParcel?.trackingNumber}</div>
              <div><strong>Status:</strong> <span style={{ color: "#2e7d32" }}>{successParcel?.status}</span></div>
              <div><strong>Carrier:</strong> {successParcel?.carrier?.name ?? `#${successParcel?.carrierId ?? "-"}`}</div>
              <div><strong>Reçu le:</strong> {successParcel?.returnReceivedAt ? new Date(successParcel.returnReceivedAt).toLocaleString('fr-TN') : "-"}</div>
            </div>
          </div>
        )}

        {/* ❌ Error Message */}
        {result && !result.ok && (
          <div style={{ 
            padding: 14, 
            borderRadius: 10, 
            border: "2px solid #f44336", 
            background: "#fff5f5" 
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: "#c62828" }}>
              ❌ Erreur
            </div>
            <div style={{ fontSize: 14 }}>{result.message ?? "Validation error"}</div>
            {result.errors && (
              <pre style={{ 
                marginTop: 8, 
                whiteSpace: "pre-wrap", 
                fontSize: 12,
                background: "#ffebee",
                padding: 8,
                borderRadius: 6
              }}>
                {JSON.stringify(result.errors, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* 📊 Recent Returns */}
      <div style={{ marginTop: 24 }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          marginBottom: 12 
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            📋 Derniers retours
          </h2>
          <button 
            onClick={loadRecent} 
            style={{ 
              padding: "8px 16px", 
              borderRadius: 8, 
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            {recentLoading ? "⏳ Chargement..." : "🔄 Actualiser"}
          </button>
        </div>

        {recentError && (
          <div style={{ 
            marginTop: 10, 
            padding: 12, 
            borderRadius: 10, 
            border: "1px solid #f5c2c7", 
            background: "#fff5f5" 
          }}>
            {recentError}
          </div>
        )}

        <div style={{ 
          marginTop: 10, 
          border: "1px solid #eee", 
          borderRadius: 12, 
          overflow: "hidden",
          background: "white"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ 
                  textAlign: "left", 
                  padding: 12, 
                  borderBottom: "2px solid #ddd",
                  fontWeight: 700
                }}>
                  Tracking
                </th>
                <th style={{ 
                  textAlign: "left", 
                  padding: 12, 
                  borderBottom: "2px solid #ddd",
                  fontWeight: 700
                }}>
                  Carrier
                </th>
                <th style={{ 
                  textAlign: "left", 
                  padding: 12, 
                  borderBottom: "2px solid #ddd",
                  fontWeight: 700
                }}>
                  Status
                </th>
                <th style={{ 
                  textAlign: "left", 
                  padding: 12, 
                  borderBottom: "2px solid #ddd",
                  fontWeight: 700
                }}>
                  Reçu le
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 12 }}>{p.trackingNumber}</td>
                  <td style={{ padding: 12 }}>
                    {p.carrier?.name ?? (p.carrierId ? `#${p.carrierId}` : "-")}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{ 
                      padding: "4px 10px", 
                      borderRadius: 6, 
                      background: "#e8f5e9",
                      color: "#2e7d32",
                      fontSize: 13,
                      fontWeight: 600
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    {p.returnReceivedAt 
                      ? new Date(p.returnReceivedAt).toLocaleString('fr-TN')
                      : "-"
                    }
                  </td>
                </tr>
              ))}

              {!recentLoading && recent.length === 0 && (
                <tr>
                  <td 
                    colSpan={4} 
                    style={{ 
                      padding: 24, 
                      textAlign: "center", 
                      color: "#999",
                      fontStyle: "italic"
                    }}
                  >
                    Aucun retour pour le moment.
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