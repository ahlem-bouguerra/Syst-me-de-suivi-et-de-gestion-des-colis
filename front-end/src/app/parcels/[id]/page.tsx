"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navigation from "../../../components/Navigation"; // ← استيراد الـ component  

type ParcelEvent = {
  id: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  source: string;
  userId: string | null;
  payload: any;
  createdAt: string;
};

type ReturnIntake = {
  id: number;
  receivedBy: string | null;
  location: string | null;
  note: string | null;
  createdAt: string;
};

type Parcel = {
  id: number;
  trackingNumber: string;
  status: string;
  destination: string | null;
  outboundScannedAt: string | null;
  returnReceivedAt: string | null;
  deliveredAt: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
  carrierId: number | null;
  carrier?: { id: number; name: string; prefix: string } | null;
  events?: ParcelEvent[];
  returnIntake?: ReturnIntake | null;
};

type ParcelDetailsResponse =
  | { ok: true; parcel: Parcel }
  | { ok: false; message?: string };

export default function ParcelDetailsPage() {
  const params = useParams();
  const trackingNumber = params?.id as string;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  const [loading, setLoading] = useState(true);
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingNumber) return;

    async function loadParcel() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${apiBase}/api/parcels/${trackingNumber}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as ParcelDetailsResponse;

        if (!data.ok) {
          setError(data.message ?? "Colis introuvable");
        } else {
          setParcel(data.parcel);
        }
      } catch (e: any) {
        setError(e?.message ?? "Erreur réseau");
      } finally {
        setLoading(false);
      }
    }

    loadParcel();
  }, [trackingNumber, apiBase]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 18 }}>⏳ Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: "2px solid #f44336",
            background: "#fff5f5",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18, color: "#c62828" }}>
            ❌ Erreur
          </div>
          <div style={{ marginTop: 8 }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!parcel) return null;

  const statusColor = {
    OUTBOUND_SCANNED: "#2196F3",
    IN_TRANSIT: "#FF9800",
    OUT_FOR_DELIVERY: "#9C27B0",
    DELIVERED: "#4CAF50",
    FAILED_DELIVERY: "#F44336",
    RETURN_RECEIVED: "#00BCD4",
    PENDING_TOO_LONG: "#FF5722",
    LOST: "#795548",
  }[parcel.status] || "#666";

  return (
      <div>      {/* ✅ استخدام الـ Navigation Component */}    <Navigation />
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
        📦 Détails du colis
      </h1>

      {/* Main Info */}
      <div
        style={{
          padding: 20,
          border: "2px solid #eee",
          borderRadius: 12,
          background: "white",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
              Tracking Number
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {parcel.trackingNumber}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
              Statut actuel
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: 8,
                background: statusColor,
                color: "white",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              {parcel.status}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
              Transporteur
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {parcel.carrier?.name ?? "-"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
              accountDetected
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {parcel.carrierAccount?.accountName ?? "-"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
              Destination
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {parcel.destination ?? "-"}
            </div>
          </div>

          {parcel.outboundScannedAt && (
            <div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
                Scanné (Outbound)
              </div>
              <div style={{ fontSize: 14 }}>
                {new Date(parcel.outboundScannedAt).toLocaleString("fr-TN")}
              </div>
            </div>
          )}

          {parcel.deliveredAt && (
            <div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
                Livré le
              </div>
              <div style={{ fontSize: 14, color: "#4CAF50", fontWeight: 600 }}>
                {new Date(parcel.deliveredAt).toLocaleString("fr-TN")}
              </div>
            </div>
          )}

          {parcel.returnReceivedAt && (
            <div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
                Retour reçu le
              </div>
              <div style={{ fontSize: 14, color: "#00BCD4", fontWeight: 600 }}>
                {new Date(parcel.returnReceivedAt).toLocaleString("fr-TN")}
              </div>
            </div>
          )}

          {parcel.lostAt && (
            <div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
                Perdu le
              </div>
              <div style={{ fontSize: 14, color: "#F44336", fontWeight: 600 }}>
                {new Date(parcel.lostAt).toLocaleString("fr-TN")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return Intake Info */}
      {parcel.returnIntake && (
        <div
          style={{
            padding: 16,
            border: "2px solid #00BCD4",
            borderRadius: 12,
            background: "#e0f7fa",
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
            ↩️ Informations de retour
          </div>
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            {parcel.returnIntake.receivedBy && (
              <div>
                <strong>Reçu par:</strong> {parcel.returnIntake.receivedBy}
              </div>
            )}
            {parcel.returnIntake.location && (
              <div>
                <strong>Emplacement:</strong> {parcel.returnIntake.location}
              </div>
            )}
            {parcel.returnIntake.note && (
              <div>
                <strong>Note:</strong> {parcel.returnIntake.note}
              </div>
            )}
            <div>
              <strong>Date:</strong>{" "}
              {new Date(parcel.returnIntake.createdAt).toLocaleString("fr-TN")}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          📅 Timeline des événements
        </h2>

        {(!parcel.events || parcel.events.length === 0) && (
          <div
            style={{
              padding: 16,
              border: "1px solid #eee",
              borderRadius: 12,
              textAlign: "center",
              color: "#999",
            }}
          >
            Aucun événement pour le moment.
          </div>
        )}

        {parcel.events && parcel.events.length > 0 && (
          <div style={{ position: "relative" }}>
            {/* Vertical line */}
            <div
              style={{
                position: "absolute",
                left: 20,
                top: 20,
                bottom: 20,
                width: 2,
                background: "#e0e0e0",
              }}
            />

            {parcel.events.map((event, index) => {
              const eventIcon = {
                SCAN_OUTBOUND: "📤",
                SCAN_RETURN: "↩️",
                STATUS_UPDATE: "🔄",
                SLA_CHECK: "⏰",
              }[event.eventType] || "📌";

              const sourceColor = {
                SCAN: "#2196F3",
                MANUAL: "#FF9800",
                BULK_IMPORT: "#9C27B0",
                CRON: "#795548",
              }[event.source] || "#666";

              return (
                <div
                  key={event.id}
                  style={{
                    position: "relative",
                    paddingLeft: 50,
                    marginBottom: 20,
                  }}
                >
                  {/* Dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 4,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: sourceColor,
                      border: "3px solid white",
                      boxShadow: "0 0 0 2px " + sourceColor,
                    }}
                  />

                  <div
                    style={{
                      padding: 14,
                      border: "1px solid #eee",
                      borderRadius: 10,
                      background: "white",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{eventIcon}</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>
                        {event.eventType.replace(/_/g, " ")}
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 12,
                          color: "#666",
                        }}
                      >
                        {new Date(event.createdAt).toLocaleString("fr-TN")}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
                      {event.fromStatus && (
                        <span>
                          <strong>{event.fromStatus}</strong> →{" "}
                        </span>
                      )}
                      <strong style={{ color: statusColor }}>
                        {event.toStatus}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        fontSize: 12,
                        marginTop: 6,
                      }}
                    >
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: sourceColor,
                          color: "white",
                          fontWeight: 600,
                        }}
                      >
                        {event.source}
                      </span>
                      {event.userId && (
                        <span style={{ color: "#666" }}>
                          Par: <strong>{event.userId}</strong>
                        </span>
                      )}
                    </div>

                    {event.payload && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 8,
                          borderRadius: 6,
                          background: "#f9f9f9",
                          fontSize: 12,
                          color: "#555",
                        }}
                      >
                        {typeof event.payload === "string"
                          ? event.payload
                          : JSON.stringify(event.payload, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
     </div>
  );
}