"use client";

import { useState } from "react";
import Navigation from "../../components/Navigation"; // ← استيراد الـ component

type BulkResult = {
  trackingNumber: string;
  reason?: string;
};

type BulkResponseOk = {
  ok: true;
  summary: { total: number; success: number; failed: number };
  results: { success: string[]; failed: BulkResult[] };
};

type BulkResponseKo = { ok: false; message?: string; errors?: any };

type BulkResponse = BulkResponseOk | BulkResponseKo;

export default function BulkImportPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  const [file, setFile] = useState<File | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResponse | null>(null);
  

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());

      // تخطي السطر الأول (headers)
      const dataLines = lines.slice(1);

      const updates = dataLines
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",");

        const trackingNumber = (parts[0] ?? "")
          .trim()
          .replace(/\r/g, "");

        const status = (parts[1] ?? "")
          .trim()
          .replace(/\r/g, "")
          .toUpperCase()
          .replace(/-/g, "_"); // ✅ يصلّح FAILED-DELIVERY

        const note =
          parts.slice(2).join(",").trim().replace(/\r/g, "") || undefined;

        return { trackingNumber, status, note };
      });
       
      console.log("UPDATES:", updates);


      const res = await fetch(`${apiBase}/api/parcels/bulk-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates,
          userId: userId || undefined,
        }),
      });

      const data = (await res.json()) as BulkResponse;
      console.log("ERRORS:", JSON.stringify((data as any).errors, null, 2));

      setResult(data);
    } catch (e: any) {
      alert(`Erreur: ${e?.message ?? "Erreur inconnue"}`);
    } finally {
      setLoading(false);
    }
  }



  return (
    <div>      {/* ✅ استخدام الـ Navigation Component */}
          <Navigation />
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        📂 Import en masse (Bulk Update)
      </h1>

 
     

      {/* Upload form */}
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
            Fichier CSV *
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ccc",
              borderRadius: 8,
              fontSize: 14,
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
          onClick={handleUpload}
          disabled={loading || !file}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: loading || !file ? "#ccc" : "#4CAF50",
            color: "white",
            fontWeight: 600,
            fontSize: 16,
            cursor: loading || !file ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳ Import en cours..." : "📤 Importer et mettre à jour"}
        </button>
      </div>

      {/* Results */}
      {result?.ok && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            border: "2px solid #4CAF50",
            borderRadius: 12,
            background: "#f3fbf5",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 18,
              marginBottom: 12,
              color: "#2e7d32",
            }}
          >
            ✅ Import terminé
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "white",
                border: "1px solid #ddd",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {result.summary.total}
              </div>
              <div style={{ fontSize: 13, color: "#666" }}>Total</div>
            </div>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "white",
                border: "1px solid #4CAF50",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: "#4CAF50" }}>
                {result.summary.success}
              </div>
              <div style={{ fontSize: 13, color: "#666" }}>Réussis</div>
            </div>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "white",
                border: "1px solid #f44336",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: "#f44336" }}>
                {result.summary.failed}
              </div>
              <div style={{ fontSize: 13, color: "#666" }}>Échoués</div>
            </div>
          </div>

          {/* Failed list */}
          {result.results.failed.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                ❌ Colis échoués:
              </div>
              <div
                style={{
                  maxHeight: 200,
                  overflow: "auto",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  background: "white",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 10,
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        Tracking
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 10,
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        Raison
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.failed.map((f, i) => (
                      <tr key={i}>
                        <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>
                          {f.trackingNumber}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>
                          {f.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {result && !result.ok && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f44336" }}>
          ❌ {result.message ?? "Erreur de validation"}
          {result.errors && <pre>{JSON.stringify(result.errors, null, 2)}</pre>}
        </div>
      )}

    </div>
    </div>
  );
}