"use client";

import { useState } from "react";
import Navigation from "../../components/Navigation"; // ← استيراد الـ component

type Parcel = {
  id: number;
  trackingNumber: string;
  status: string;
  carrier?: { name: string } | null;
  destination: string | null;
};

type UpdateResponse =
  | { ok: true; parcel: Parcel }
  | { ok: false; errors?: any; message?: string };

const STATUS_OPTIONS = [
  { value: "OUTBOUND_SCANNED", label: "📦 Scanné (Outbound)" },
  { value: "IN_TRANSIT", label: "🚚 En transit" },
  { value: "DELIVERED", label: "✅ Livré" },
  { value: "FAILED_DELIVERY", label: "❌ Échec de livraison" },
  { value: "RETURN_RECEIVED", label: "↩️ Retour reçu" },
  { value: "PENDING_TOO_LONG", label: "⏳ En attente trop longue" },
  { value: "LOST", label: "🔍 Perdu" },
];

export default function StatusUpdatePage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState("");

  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundParcel, setFoundParcel] = useState<Parcel | null>(null);
  const [result, setResult] = useState<UpdateResponse | null>(null);

  async function searchParcel() {
    if (trackingNumber.trim().length < 3) return;

    setSearchLoading(true);
    setFoundParcel(null);
    setResult(null);

    try {
      const res = await fetch(
        `${apiBase}/api/parcels?trackingNumber=${encodeURIComponent(trackingNumber)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.ok && data.parcels && data.parcels.length > 0) {
        const parcel = data.parcels[0];
        setFoundParcel(parcel);
        setSelectedStatus(parcel.status);
      } else {
        setResult({ ok: false, message: "Colis introuvable" });
      }
    } catch (e: any) {
      setResult({ ok: false, message: e?.message ?? "Erreur réseau" });
    } finally {
      setSearchLoading(false);
    }
  }

  async function updateStatus() {
    if (!foundParcel || !selectedStatus) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${apiBase}/api/parcels/${foundParcel.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          note: note || undefined,
          userId: userId || undefined,
        }),
      });

      const data = (await res.json()) as UpdateResponse;
      setResult(data);

      if (data.ok) {
        setFoundParcel(data.parcel);
        setNote("");
      }
    } catch (e: any) {
      setResult({ ok: false, message: e?.message ?? "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div><Navigation />
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        🔄 Mise à jour manuelle du statut
      </h1>

      {/* 🔍 Recherche de colis */}
      <div
        style={{
          padding: 16,
          border: "1px solid #eee",
          borderRadius: 12,
          background: "#fafafa",
          marginBottom: 20,
        }}
      >
        <label>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Numéro de suivi (Tracking Number)
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchParcel()}
              placeholder="AB12345"
              style={{
                flex: 1,
                padding: 10,
                border: "1px solid #ccc",
                borderRadius: 8,
                fontSize: 14,
              }}
            />
            <button
              onClick={searchParcel}
              disabled={searchLoading || trackingNumber.trim().length < 3}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background:
                  searchLoading || trackingNumber.trim().length < 3
                    ? "#ccc"
                    : "#2196F3",
                color: "white",
                fontWeight: 600,
                cursor:
                  searchLoading || trackingNumber.trim().length < 3
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {searchLoading ? "⏳" : "🔍 Rechercher"}
            </button>
          </div>
        </label>
      </div>

      {/* ✅ Colis trouvé */}
      {foundParcel && (
        <div
          style={{
            padding: 16,
            border: "2px solid #4CAF50",
            borderRadius: 12,
            background: "#f3fbf5",
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            📦 Colis trouvé
          </div>
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <div>
              <strong>Tracking:</strong> {foundParcel.trackingNumber}
            </div>
            <div>
              <strong>Status actuel:</strong>{" "}
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "#e3f2fd",
                  fontWeight: 600,
                }}
              >
                {foundParcel.status}
              </span>
            </div>
            <div>
              <strong>Transporteur:</strong>{" "}
              {foundParcel.carrier?.name ?? "-"}
            </div>
            <div>
              <strong>Destination:</strong> {foundParcel.destination ?? "-"}
            </div>
          </div>
        </div>
      )}

      {/* 🔄 Formulaire de mise à jour */}
      {foundParcel && (
        <div
          style={{
            padding: 16,
            border: "1px solid #eee",
            borderRadius: 12,
            background: "#fafafa",
            display: "grid",
            gap: 12,
          }}
        >
          <label>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Nouveau statut *
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ccc",
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Note (optionnel)
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Client absent, nouvelle tentative demain"
              rows={3}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ccc",
                borderRadius: 8,
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </label>

          <label>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Utilisateur (optionnel)
            </div>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Mohammed, Fatma, etc."
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ccc",
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </label>

          <button
            onClick={updateStatus}
            disabled={loading || !selectedStatus}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "none",
              background: loading || !selectedStatus ? "#ccc" : "#FF9800",
              color: "white",
              fontWeight: 600,
              fontSize: 16,
              cursor: loading || !selectedStatus ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "⏳ Mise à jour..." : "✅ Mettre à jour le statut"}
          </button>
        </div>
      )}

      {/* ✅ Success */}
      {result && result.ok && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 10,
            border: "2px solid #4CAF50",
            background: "#f3fbf5",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 8,
              fontSize: 16,
              color: "#2e7d32",
            }}
          >
            ✅ Statut mis à jour avec succès
          </div>
          <div style={{ fontSize: 14 }}>
            Nouveau statut: <strong>{result.parcel.status}</strong>
          </div>
        </div>
      )}

      {/* ❌ Error */}
      {result && !result.ok && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 10,
            border: "2px solid #f44336",
            background: "#fff5f5",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#c62828" }}>
            ❌ Erreur
          </div>
          <div style={{ fontSize: 14 }}>
            {result.message ?? "Erreur inconnue"}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}