"use client";

import { useEffect, useState } from "react";
import Navigation from "../../components/Navigation"; // ← استيراد الـ component

type Carrier = {
  id: number;
  name: string;
  ruleType: string;
  ruleValue: string;
  slaPendingDays: number;
  slaLostDays: number;
  _count?: { parcels: number };
};

export default function CarriersPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<"PREFIX" | "REGEX">("PREFIX");
  const [ruleValue, setRuleValue] = useState("");
  const [slaPendingDays, setSlaPendingDays] = useState(10);
  const [slaLostDays, setSlaLostDays] = useState(20);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadCarriers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/carriers`);
      const data = await res.json();
      if (data.ok) {
        setCarriers(data.carriers);
      } else {
        setError(data.message || "Failed to load carriers");
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCarriers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setName("");
    setRuleType("PREFIX");
    setRuleValue("");
    setSlaPendingDays(10);
    setSlaLostDays(20);
    setFormError(null);
    setEditingId(null);
    setShowForm(false);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(carrier: Carrier) {
    setEditingId(carrier.id);
    setName(carrier.name);
    setRuleType(carrier.ruleType as "PREFIX" | "REGEX");
    setRuleValue(carrier.ruleValue);
    setSlaPendingDays(carrier.slaPendingDays);
    setSlaLostDays(carrier.slaLostDays);
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit() {
    setFormError(null);
    setSubmitting(true);

    const body = {
      name: name.trim(),
      ruleType,
      ruleValue: ruleValue.trim(),
      slaPendingDays,
      slaLostDays
    };

    try {
      const url = editingId 
        ? `${apiBase}/api/carriers/${editingId}` 
        : `${apiBase}/api/carriers`;
      
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.ok) {
        await loadCarriers();
        resetForm();
      } else {
        setFormError(data.message || JSON.stringify(data.errors));
      }
    } catch (e: any) {
      setFormError(e.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${name}" ?`)) return;

    try {
      const res = await fetch(`${apiBase}/api/carriers/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (data.ok) {
        await loadCarriers();
      } else {
        alert(data.message || "Failed to delete");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    }
  }

  return (
      <div>      {/* ✅ استخدام الـ Navigation Component */}      <Navigation />   
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Gestion des Transporteurs</h1>
        <button
          onClick={openAddForm}
          style={{
            padding: "10px 20px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          + Ajouter Transporteur
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fee", border: "1px solid #fcc", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => resetForm()}
        >
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 12,
              width: "90%",
              maxWidth: 500,
              maxHeight: "90vh",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              {editingId ? "Modifier Transporteur" : "Nouveau Transporteur"}
            </h2>

            {formError && (
              <div style={{ padding: 12, background: "#fee", border: "1px solid #fcc", borderRadius: 8, marginBottom: 12 }}>
                {formError}
              </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              <label>
                Nom <span style={{ color: "red" }}>*</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="DHL Express"
                  style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginTop: 4 }}
                />
              </label>

              <label>
                Type de Règle <span style={{ color: "red" }}>*</span>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as "PREFIX" | "REGEX")}
                  style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginTop: 4 }}
                >
                  <option value="PREFIX">PREFIX (commence par)</option>
                  <option value="REGEX">REGEX (expression régulière)</option>
                </select>
              </label>

              <label>
                Valeur de Règle <span style={{ color: "red" }}>*</span>
                <input
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  placeholder={ruleType === "PREFIX" ? "DHL" : "^DHL\\d+$"}
                  style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginTop: 4 }}
                />
                <small style={{ color: "#666", fontSize: 12 }}>
                  {ruleType === "PREFIX" 
                    ? "Ex: DHL (tous les colis commençant par DHL)" 
                    : "Ex: ^DHL\\d+$ (DHL suivi de chiffres)"}
                </small>
              </label>

              <label>
                SLA Pending (jours) <span style={{ color: "red" }}>*</span>
                <input
                  type="number"
                  value={slaPendingDays}
                  onChange={(e) => setSlaPendingDays(Number(e.target.value))}
                  min={1}
                  max={365}
                  style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginTop: 4 }}
                />
                <small style={{ color: "#666", fontSize: 12 }}>
                  Nombre de jours avant alerte "En attente trop longtemps"
                </small>
              </label>

              <label>
                SLA Lost (jours) <span style={{ color: "red" }}>*</span>
                <input
                  type="number"
                  value={slaLostDays}
                  onChange={(e) => setSlaLostDays(Number(e.target.value))}
                  min={1}
                  max={365}
                  style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginTop: 4 }}
                />
                <small style={{ color: "#666", fontSize: 12 }}>
                  Nombre de jours avant considérer le colis "Perdu"
                </small>
              </label>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => resetForm()}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: "#e5e7eb",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !name.trim() || !ruleValue.trim() || slaLostDays <= slaPendingDays}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                    opacity: submitting || !name.trim() || !ruleValue.trim() || slaLostDays <= slaPendingDays ? 0.5 : 1
                  }}
                >
                  {submitting ? "Enregistrement..." : editingId ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Carriers Table */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Nom</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Type</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Règle</th>
              <th style={{ textAlign: "center", padding: 12, borderBottom: "1px solid #e5e7eb" }}>SLA Pending</th>
              <th style={{ textAlign: "center", padding: 12, borderBottom: "1px solid #e5e7eb" }}>SLA Lost</th>
              <th style={{ textAlign: "center", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Colis</th>
              <th style={{ textAlign: "center", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#666" }}>
                  Chargement...
                </td>
              </tr>
            ) : carriers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#666" }}>
                  Aucun transporteur. Cliquez sur "Ajouter Transporteur" pour commencer.
                </td>
              </tr>
            ) : (
              carriers.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>
                    {c.name}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        background: c.ruleType === "PREFIX" ? "#dbeafe" : "#fef3c7",
                        color: c.ruleType === "PREFIX" ? "#1e40af" : "#92400e",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      {c.ruleType}
                    </span>
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6", fontFamily: "monospace" }}>
                    {c.ruleValue}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6", textAlign: "center" }}>
                    {c.slaPendingDays} j
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6", textAlign: "center" }}>
                    {c.slaLostDays} j
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6", textAlign: "center" }}>
                    {c._count?.parcels ?? 0}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6", textAlign: "center" }}>
                    <button
                      onClick={() => openEditForm(c)}
                      style={{
                        padding: "6px 12px",
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        cursor: "pointer",
                        marginRight: 8
                      }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={(c._count?.parcels ?? 0) > 0}
                      style={{
                        padding: "6px 12px",
                        background: (c._count?.parcels ?? 0) > 0 ? "#f3f4f6" : "#fee",
                        border: "1px solid #fcc",
                        borderRadius: 6,
                        cursor: (c._count?.parcels ?? 0) > 0 ? "not-allowed" : "pointer",
                        opacity: (c._count?.parcels ?? 0) > 0 ? 0.5 : 1
                      }}
                    >
                      🗑️ Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
     </div>
  );
}