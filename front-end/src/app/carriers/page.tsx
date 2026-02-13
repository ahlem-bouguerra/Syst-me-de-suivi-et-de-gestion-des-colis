"use client";

import { useEffect, useState } from "react";
import Navigation from "../../components/Navigation";

// ==================== TYPES ====================
type Carrier = {
  id: number;
  name: string;
  ruleType: string;
  ruleValue: string;
  slaPendingDays: number;
  slaLostDays: number;
  _count?: { parcels: number };
};

type CarrierAccount = {
  id: number;
  carrierId: number;
  accountName: string;
  externalId: string;
  apiKey: string;
  baseUrl: string;
  isEnabled: boolean;
};

type NewAccount = {
  accountName: string;
  externalId: string;
  apiKey: string;
  baseUrl: string;
  isEnabled: boolean;
};

// ==================== STYLES ====================
const styles = {
  container: {
    padding: 24,
    maxWidth: 1400,
    margin: "0 auto",
    background: "#f9fafb",
    minHeight: "100vh"
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 28,
    marginBottom: 24,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  button: {
    primary: {
      padding: "12px 24px",
      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      color: "white",
      border: "none",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
      boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
      transition: "all 0.2s"
    },
    success: {
      padding: "12px 24px",
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      color: "white",
      border: "none",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
      boxShadow: "0 2px 8px rgba(16,185,129,0.3)"
    },
    secondary: {
      padding: "10px 18px",
      background: "#f3f4f6",
      border: "1px solid #d1d5db",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 500,
      transition: "all 0.2s"
    },
    danger: {
      padding: "10px 18px",
      background: "#fee2e2",
      border: "1px solid #fca5a5",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 500,
      color: "#991b1b"
    }
  },
  input: {
    width: "100%",
    padding: 12,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    marginTop: 6,
    transition: "border 0.2s"
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6
  },
  errorBox: {
    padding: 14,
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    borderRadius: 10,
    marginBottom: 20,
    color: "#991b1b",
    fontSize: 14
  },
  badge: {
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    display: "inline-block"
  },
  stepIndicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
    padding: "20px 0"
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 16
  }
};

// ==================== MULTI-STEP CARRIER FORM ====================
function MultiStepCarrierForm({
  show,
  editingCarrier,
  onClose,
  onSave,
  apiBase
}: {
  show: boolean;
  editingCarrier: Carrier | null;
  onClose: () => void;
  onSave: () => void;
  apiBase: string;
}) {
  const [step, setStep] = useState(1);
  
  // Step 1: Carrier Info
  const [name, setName] = useState("");
  const [ruleType] = useState<"LENGTH">("LENGTH"); // ✅ FIXÉ: LENGTH uniquement
  const [ruleValue, setRuleValue] = useState("");
  const [slaPendingDays, setSlaPendingDays] = useState(10);
  const [slaLostDays, setSlaLostDays] = useState(20);
  
  // Step 2: API Accounts
  const [accounts, setAccounts] = useState<NewAccount[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      if (editingCarrier) {
        setName(editingCarrier.name);
        // ruleType est toujours "LENGTH" maintenant
        setRuleValue(editingCarrier.ruleValue);
        setSlaPendingDays(editingCarrier.slaPendingDays);
        setSlaLostDays(editingCarrier.slaLostDays);
        setStep(1);
      } else {
        resetForm();
      }
    }
  }, [editingCarrier, show]);

  function resetForm() {
    setStep(1);
    setName("");
    setRuleValue("");
    setSlaPendingDays(10);
    setSlaLostDays(20);
    setAccounts([]);
    setError(null);
  }

  function addAccount() {
    setAccounts([
      ...accounts,
      {
        accountName: "",
        externalId: "",
        apiKey: "",
        baseUrl: "https://api.coliexpres.com",
        isEnabled: true
      }
    ]);
  }

  function removeAccount(index: number) {
    setAccounts(accounts.filter((_, i) => i !== index));
  }

  function updateAccount(index: number, field: keyof NewAccount, value: any) {
    const updated = [...accounts];
    updated[index] = { ...updated[index], [field]: value };
    setAccounts(updated);
  }

  // ✅ Validation: ruleValue doit être des chiffres uniquement
  function isRuleValueValid(value: string): boolean {
    return /^\d+$/.test(value.trim());
  }

  async function handleSubmit() {
    setError(null);
    
    // ✅ Validation côté client
    if (!isRuleValueValid(ruleValue)) {
      setError("La longueur doit être un nombre entier (ex: 9, 14)");
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create/Update Carrier
      const carrierBody = {
        name: name.trim(),
        ruleType: "LENGTH", // ✅ Toujours LENGTH
        ruleValue: ruleValue.trim(),
        slaPendingDays,
        slaLostDays
      };

      const carrierUrl = editingCarrier 
        ? `${apiBase}/api/carriers/${editingCarrier.id}` 
        : `${apiBase}/api/carriers`;
      
      const carrierMethod = editingCarrier ? "PUT" : "POST";

      const carrierRes = await fetch(carrierUrl, {
        method: carrierMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(carrierBody)
      });

      const carrierData = await carrierRes.json();

      if (!carrierData.ok) {
        setError(carrierData.message || JSON.stringify(carrierData.errors));
        setSubmitting(false);
        return;
      }

      const carrierId = carrierData.carrier.id;

      // Step 2: Create API Accounts (only for valid accounts)
      const validAccounts = accounts.filter(
        acc => acc.accountName.trim() && acc.externalId.trim() && acc.apiKey.trim()
      );

      for (const account of validAccounts) {
        const accountBody = {
          carrierId,
          ...account
        };

        await fetch(`${apiBase}/api/carrier-accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(accountBody)
        });
      }

      onSave();
      onClose();
    } catch (e: any) {
      setError(e.message || "Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  if (!show) return null;

  const isStep1Valid = 
    name.trim() && 
    isRuleValueValid(ruleValue) && 
    slaLostDays > slaPendingDays;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          width: "95%",
          maxWidth: 900,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: "24px 32px", 
          borderBottom: "2px solid #e5e7eb",
          background: "linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>
              {editingCarrier ? "✏️ Modifier le Transporteur" : "➕ Nouveau Transporteur"}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 32,
                cursor: "pointer",
                color: "#6b7280",
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          {/* Step Indicator - Only for new carriers */}
          {!editingCarrier && (
            <div style={styles.stepIndicator}>
              <div style={styles.step}>
                <div style={{
                  ...styles.stepCircle,
                  background: step >= 1 ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#e5e7eb",
                  color: step >= 1 ? "white" : "#9ca3af"
                }}>
                  1
                </div>
                <span style={{ fontWeight: 600, color: step >= 1 ? "#111827" : "#9ca3af" }}>
                  Infos Transporteur
                </span>
              </div>

              <div style={{ width: 40, height: 2, background: step >= 2 ? "#2563eb" : "#e5e7eb" }} />

              <div style={styles.step}>
                <div style={{
                  ...styles.stepCircle,
                  background: step >= 2 ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#e5e7eb",
                  color: step >= 2 ? "white" : "#9ca3af"
                }}>
                  2
                </div>
                <span style={{ fontWeight: 600, color: step >= 2 ? "#111827" : "#9ca3af" }}>
                  Comptes API (optionnel)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: 32 }}>
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* STEP 1: Carrier Info */}
          {step === 1 && (
            <div style={{ display: "grid", gap: 20 }}>
              <div>
                <label style={styles.label}>
                  Nom du Transporteur <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: ColisExpress, DHL, Aramex..."
                  style={styles.input}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
                <div>
                  <label style={styles.label}>
                    Type de Règle
                  </label>
                  <input
                    value="LENGTH (Nombre de chiffres)"
                    disabled
                    style={{
                      ...styles.input,
                      background: "#f9fafb",
                      color: "#6b7280",
                      cursor: "not-allowed"
                    }}
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Longueur du Numéro <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    placeholder="Ex: 9 ou 14"
                    min="1"
                    max="20"
                    style={{
                      ...styles.input,
                      borderColor: ruleValue && !isRuleValueValid(ruleValue) ? "#dc2626" : "#d1d5db"
                    }}
                  />
                  {ruleValue && !isRuleValueValid(ruleValue) && (
                    <small style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                      La longueur doit être un nombre entier
                    </small>
                  )}
                </div>
              </div>

              <div style={{ 
                padding: 14, 
                background: "#f0f9ff", 
                borderRadius: 10,
                fontSize: 13,
                color: "#0369a1",
                border: "1px solid #bae6fd"
              }}>
                💡 <strong>Détection par longueur:</strong> Le système détectera automatiquement le transporteur 
                en fonction du nombre de chiffres dans le numéro de suivi.
                <br />
                <strong>Exemple:</strong> Si vous entrez "9", tous les numéros de suivi à 9 chiffres 
                (ex: 123456789) seront attribués à ce transporteur.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={styles.label}>
                    SLA Pending (jours) <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={slaPendingDays}
                    onChange={(e) => setSlaPendingDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    style={styles.input}
                  />
                  <small style={{ color: "#6b7280", fontSize: 12 }}>
                    Jours avant alerte "En attente"
                  </small>
                </div>

                <div>
                  <label style={styles.label}>
                    SLA Lost (jours) <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={slaLostDays}
                    onChange={(e) => setSlaLostDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    style={styles.input}
                  />
                  <small style={{ color: "#6b7280", fontSize: 12 }}>
                    Jours avant considérer "Perdu"
                  </small>
                </div>
              </div>

              {slaLostDays <= slaPendingDays && (
                <div style={{
                  padding: 12,
                  background: "#fef3c7",
                  border: "1px solid #fcd34d",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#92400e"
                }}>
                  ⚠️ Le SLA Lost doit être supérieur au SLA Pending
                </div>
              )}
            </div>
          )}

          {/* STEP 2: API Accounts */}
          {step === 2 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                    🔑 Comptes API
                  </h3>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                    Ajoutez un ou plusieurs comptes API (Bayt Said, Cocoprix...) - Cette étape est optionnelle
                  </p>
                </div>
                <button
                  onClick={addAccount}
                  style={styles.button.success}
                >
                  ➕ Ajouter un Compte
                </button>
              </div>

              {accounts.length === 0 ? (
                <div style={{ 
                  textAlign: "center", 
                  padding: 60,
                  background: "#f9fafb",
                  borderRadius: 12,
                  border: "2px dashed #d1d5db"
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
                  <p style={{ color: "#6b7280", fontSize: 15, margin: 0 }}>
                    Aucun compte API pour le moment
                  </p>
                  <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                    Vous pouvez en ajouter maintenant ou plus tard
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {accounts.map((account, index) => (
                    <div
                      key={index}
                      style={{
                        padding: 20,
                        background: "#f9fafb",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: 0 }}>
                          Compte #{index + 1}
                        </h4>
                        <button
                          onClick={() => removeAccount(index)}
                          style={{
                            ...styles.button.danger,
                            padding: "6px 12px",
                            fontSize: 12
                          }}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ ...styles.label, fontSize: 13 }}>Nom du Compte</label>
                          <input
                            value={account.accountName}
                            onChange={(e) => updateAccount(index, "accountName", e.target.value)}
                            placeholder="Bayt Said, Cocoprix..."
                            style={{ ...styles.input, padding: 10 }}
                          />
                        </div>

                        <div>
                          <label style={{ ...styles.label, fontSize: 13 }}>External ID</label>
                          <input
                            value={account.externalId}
                            onChange={(e) => updateAccount(index, "externalId", e.target.value)}
                            placeholder="819"
                            style={{ ...styles.input, padding: 10 }}
                          />
                        </div>

                        <div>
                          <label style={{ ...styles.label, fontSize: 13 }}>API Key</label>
                          <input
                            type="password"
                            value={account.apiKey}
                            onChange={(e) => updateAccount(index, "apiKey", e.target.value)}
                            placeholder="••••••••"
                            style={{ ...styles.input, padding: 10 }}
                          />
                        </div>

                        <div>
                          <label style={{ ...styles.label, fontSize: 13 }}>Base URL</label>
                          <input
                            value={account.baseUrl}
                            onChange={(e) => updateAccount(index, "baseUrl", e.target.value)}
                            placeholder="https://api.coliexpres.com"
                            style={{ ...styles.input, padding: 10 }}
                          />
                        </div>

                        <div style={{ gridColumn: "span 2" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={account.isEnabled}
                              onChange={(e) => updateAccount(index, "isEnabled", e.target.checked)}
                              style={{ width: 16, height: 16, cursor: "pointer" }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Compte activé</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 24, borderTop: "2px solid #e5e7eb" }}>
            <button
              onClick={onClose}
              style={{
                ...styles.button.secondary,
                flex: 1,
                padding: 14
              }}
            >
              Annuler
            </button>

            {!editingCarrier && step === 2 && (
              <button
                onClick={() => setStep(1)}
                style={{
                  ...styles.button.secondary,
                  flex: 1,
                  padding: 14
                }}
              >
                ← Retour
              </button>
            )}

            {editingCarrier || step === 2 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting || !isStep1Valid}
                style={{
                  ...styles.button.primary,
                  flex: 1,
                  padding: 14,
                  opacity: submitting || !isStep1Valid ? 0.5 : 1,
                  cursor: submitting || !isStep1Valid ? "not-allowed" : "pointer"
                }}
              >
                {submitting ? "⏳ Enregistrement..." : editingCarrier ? "✅ Modifier" : "✅ Créer le Transporteur"}
              </button>
            ) : (
              <button
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                style={{
                  ...styles.button.primary,
                  flex: 1,
                  padding: 14,
                  opacity: !isStep1Valid ? 0.5 : 1,
                  cursor: !isStep1Valid ? "not-allowed" : "pointer"
                }}
              >
                Suivant: Comptes API →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== CARRIER DETAIL VIEW ====================
function CarrierDetailView({
  carrier,
  accounts,
  onClose,
  onRefresh,
  apiBase
}: {
  carrier: Carrier;
  accounts: CarrierAccount[];
  onClose: () => void;
  onRefresh: () => void;
  apiBase: string;
}) {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CarrierAccount | null>(null);
  
  // Account form state
  const [accountName, setAccountName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.coliexpres.com");
  const [isEnabled, setIsEnabled] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    if (editingAccount) {
      setAccountName(editingAccount.accountName);
      setExternalId(editingAccount.externalId);
      setApiKey(editingAccount.apiKey);
      setBaseUrl(editingAccount.baseUrl);
      setIsEnabled(editingAccount.isEnabled);
    } else {
      resetAccountForm();
    }
  }, [editingAccount]);

  function resetAccountForm() {
    setAccountName("");
    setExternalId("");
    setApiKey("");
    setBaseUrl("https://api.coliexpres.com");
    setIsEnabled(true);
    setAccountError(null);
  }

  async function handleSaveAccount() {
    setAccountError(null);
    
    const body = {
      carrierId: carrier.id,
      accountName: accountName.trim(),
      externalId: externalId.trim(),
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      isEnabled
    };

    try {
      const url = editingAccount
        ? `${apiBase}/api/carrier-accounts/${editingAccount.id}`
        : `${apiBase}/api/carrier-accounts`;

      const method = editingAccount ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (data.ok) {
        onRefresh();
        setShowAccountForm(false);
        setEditingAccount(null);
        resetAccountForm();
      } else {
        setAccountError(data.message || JSON.stringify(data.errors));
      }
    } catch (e: any) {
      setAccountError(e.message || "Erreur réseau");
    }
  }

  async function handleToggleAccount(id: number) {
    await fetch(`${apiBase}/api/carrier-accounts/${id}/toggle`, { method: "PATCH" });
    onRefresh();
  }

  async function handleDeleteAccount(id: number, name: string) {
    if (!confirm(`Supprimer le compte "${name}" ?`)) return;
    await fetch(`${apiBase}/api/carrier-accounts/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          width: "95%",
          maxWidth: 900,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: "24px 28px", 
          borderBottom: "2px solid #e5e7eb",
          background: "linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
                🚚 {carrier.name}
              </h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{
                  ...styles.badge,
                  background: "#dbeafe",
                  color: "#1e40af"
                }}>
                  LENGTH: {carrier.ruleValue} chiffres
                </span>
                <span style={{...styles.badge, background: "#f3f4f6", color: "#6b7280"}}>
                  SLA Pending: {carrier.slaPendingDays}j
                </span>
                <span style={{...styles.badge, background: "#f3f4f6", color: "#6b7280"}}>
                  SLA Lost: {carrier.slaLostDays}j
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 28,
                cursor: "pointer",
                color: "#6b7280",
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#374151" }}>
              🔑 Comptes API ({accounts.length})
            </h3>
            <button
              onClick={() => {
                setEditingAccount(null);
                setShowAccountForm(true);
              }}
              style={styles.button.success}
            >
              ➕ Ajouter un Compte
            </button>
          </div>

          {accountError && <div style={styles.errorBox}>{accountError}</div>}

          {/* Account Form */}
          {showAccountForm && (
            <div style={{ 
              background: "#f9fafb", 
              padding: 20, 
              borderRadius: 12, 
              marginBottom: 20,
              border: "2px dashed #d1d5db"
            }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#374151" }}>
                {editingAccount ? "✏️ Modifier le Compte" : "➕ Nouveau Compte"}
              </h4>
              
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div>
                  <label style={styles.label}>Nom du Compte *</label>
                  <input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Bayt Said, Cocoprix..."
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>External ID *</label>
                  <input
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    placeholder="819"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>API Key *</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="••••••••"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>Base URL *</label>
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.coliexpres.com"
                    style={styles.input}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Compte activé</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button
                  onClick={handleSaveAccount}
                  disabled={!accountName.trim() || !externalId.trim() || !apiKey.trim()}
                  style={{
                    ...styles.button.primary,
                    opacity: !accountName.trim() || !externalId.trim() || !apiKey.trim() ? 0.5 : 1
                  }}
                >
                  {editingAccount ? "✅ Modifier" : "✅ Enregistrer"}
                </button>
                <button
                  onClick={() => {
                    setShowAccountForm(false);
                    setEditingAccount(null);
                    resetAccountForm();
                  }}
                  style={styles.button.secondary}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Accounts List */}
          {accounts.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: 50, 
              background: "#f9fafb",
              borderRadius: 12,
              border: "2px dashed #d1d5db"
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
              <p style={{ color: "#6b7280", fontSize: 15 }}>
                Aucun compte API configuré pour ce transporteur
              </p>
              <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                Cliquez sur "Ajouter un Compte" pour commencer
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {accounts.map((account) => (
                <div
                  key={account.id}
                  style={{
                    padding: 16,
                    background: "#f9fafb",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: "#111827" }}>
                      {account.accountName}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#6b7280" }}>
                      <span>ID: <code style={{ background: "#fff", padding: "2px 6px", borderRadius: 4 }}>{account.externalId}</code></span>
                      <span>•</span>
                      <span>{account.baseUrl}</span>
                      <span>•</span>
                      <span style={{
                        ...styles.badge,
                        background: account.isEnabled ? "#dcfce7" : "#fee2e2",
                        color: account.isEnabled ? "#166534" : "#991b1b",
                        padding: "2px 8px"
                      }}>
                        {account.isEnabled ? "✅ Activé" : "❌ Désactivé"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        setEditingAccount(account);
                        setShowAccountForm(true);
                      }}
                      style={styles.button.secondary}
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleToggleAccount(account.id)}
                      style={styles.button.secondary}
                      title={account.isEnabled ? "Désactiver" : "Activer"}
                    >
                      🔁
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id, account.accountName)}
                      style={styles.button.danger}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function CarriersPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [accounts, setAccounts] = useState<CarrierAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCarrierForm, setShowCarrierForm] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);

  async function loadCarriers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/carriers`);
      const data = await res.json();
      if (data.ok) {
        setCarriers(data.carriers);
      } else {
        setError(data.message || "Échec du chargement");
      }
    } catch (e: any) {
      setError(e.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function loadAccounts() {
    try {
      const res = await fetch(`${apiBase}/api/carrier-accounts`);
      const data = await res.json();
      if (data.ok) {
        setAccounts(data.accounts);
      }
    } catch (e: any) {
      console.error("Failed to load accounts:", e);
    }
  }

  useEffect(() => {
    loadCarriers();
    loadAccounts();
  }, []);

  async function handleDeleteCarrier(id: number, name: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${name}" ?`)) return;

    try {
      const res = await fetch(`${apiBase}/api/carriers/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.ok) {
        await loadCarriers();
        await loadAccounts();
      } else {
        alert(data.message || "Échec de la suppression");
      }
    } catch (e: any) {
      alert(e.message || "Erreur réseau");
    }
  }

  function getCarrierAccounts(carrierId: number) {
    return accounts.filter(a => a.carrierId === carrierId);
  }

  return (
    <div>
      <Navigation />

      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>
              <span>🚚</span>
              <span>Gestion des Transporteurs</span>
            </h1>
            <button
              onClick={() => {
                setEditingCarrier(null);
                setShowCarrierForm(true);
              }}
              style={styles.button.primary}
            >
              ➕ Nouveau Transporteur
            </button>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          {loading ? (
            <div style={{ textAlign: "center", padding: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div style={{ color: "#6b7280", fontSize: 16 }}>Chargement...</div>
            </div>
          ) : carriers.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: 80,
              background: "#f9fafb",
              borderRadius: 12,
              border: "2px dashed #d1d5db"
            }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📦</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Aucun transporteur configuré
              </div>
              <div style={{ color: "#6b7280", fontSize: 14 }}>
                Cliquez sur "Nouveau Transporteur" pour commencer
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {carriers.map((carrier) => {
                const carrierAccounts = getCarrierAccounts(carrier.id);
                return (
                  <div
                    key={carrier.id}
                    style={{
                      padding: 20,
                      background: "#f9fafb",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      transition: "all 0.2s",
                      cursor: "pointer"
                    }}
                    onClick={() => setSelectedCarrier(carrier)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
                            {carrier.name}
                          </h3>
                          <span style={{
                            ...styles.badge,
                            background: "#dbeafe",
                            color: "#1e40af"
                          }}>
                            {carrier.ruleValue} chiffres
                          </span>
                        </div>
                        
                        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                          <span>📊 SLA Pending: <strong>{carrier.slaPendingDays}j</strong></span>
                          <span>•</span>
                          <span>⏱️ SLA Lost: <strong>{carrier.slaLostDays}j</strong></span>
                          <span>•</span>
                          <span>📦 Colis: <strong>{carrier._count?.parcels ?? 0}</strong></span>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {carrierAccounts.length > 0 ? (
                            <>
                              <span style={{ fontSize: 13, color: "#6b7280" }}>🔑 Comptes API:</span>
                              {carrierAccounts.map(acc => (
                                <span
                                  key={acc.id}
                                  style={{
                                    ...styles.badge,
                                    background: acc.isEnabled ? "#dcfce7" : "#fee2e2",
                                    color: acc.isEnabled ? "#166534" : "#991b1b"
                                  }}
                                >
                                  {acc.accountName}
                                </span>
                              ))}
                            </>
                          ) : (
                            <span style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
                              🔓 Aucun compte API configuré
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingCarrier(carrier);
                            setShowCarrierForm(true);
                          }}
                          style={styles.button.secondary}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCarrier(carrier.id, carrier.name)}
                          disabled={(carrier._count?.parcels ?? 0) > 0}
                          style={{
                            ...styles.button.danger,
                            opacity: (carrier._count?.parcels ?? 0) > 0 ? 0.5 : 1,
                            cursor: (carrier._count?.parcels ?? 0) > 0 ? "not-allowed" : "pointer"
                          }}
                          title={(carrier._count?.parcels ?? 0) > 0 ? "Impossible (colis associés)" : "Supprimer"}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MultiStepCarrierForm
        show={showCarrierForm}
        editingCarrier={editingCarrier}
        onClose={() => {
          setShowCarrierForm(false);
          setEditingCarrier(null);
        }}
        onSave={() => {
          loadCarriers();
          loadAccounts();
        }}
        apiBase={apiBase}
      />

      {selectedCarrier && (
        <CarrierDetailView
          carrier={selectedCarrier}
          accounts={getCarrierAccounts(selectedCarrier.id)}
          onClose={() => setSelectedCarrier(null)}
          onRefresh={() => {
            loadCarriers();
            loadAccounts();
          }}
          apiBase={apiBase}
        />
      )}
    </div>
  );
}