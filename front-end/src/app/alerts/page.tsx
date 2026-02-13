"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import { 
  getAlertParcels, 
  calculateDaysSince, 
  getAlertLevel, 
  calculateStatusStats,
  STATUS_LABELS,
  type AlertParcel 
} from "./api";

type FilterType = "all" | "critique" | "avertissement" | "normal";
type StatusFilterType = "all" | "actifs" | "livres" | "retours" | "problemes";

export default function AlertsPage() {
  const [parcels, setParcels] = useState<AlertParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  
  // 📄 États de pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const data = await getAlertParcels();
      setParcels(data);
    } catch (e: any) {
      setError(e?.message ?? "Échec du chargement des données");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, statusFilter]);

  // 📊 Calcul des statistiques complètes
  const statusStats = calculateStatusStats(parcels);
  
  // 📊 Calcul des niveaux d'alerte
  const alertStats = parcels.reduce(
    (acc, p) => {
      const daysSince = calculateDaysSince(p.outboundScannedAt);
      const slaPending = p.carrier?.slaPendingDays ?? 10;
      const slaLost = p.carrier?.slaLostDays ?? 20;
      const level = getAlertLevel(p.status, daysSince, slaPending, slaLost);

      if (level === "critique") acc.critique++;
      else if (level === "avertissement") acc.avertissement++;
      else acc.normal++;

      return acc;
    },
    { critique: 0, avertissement: 0, normal: 0 }
  );

  // 🔍 Filtrage
  const filteredParcels = parcels.filter((p) => {
    // Filtre par niveau d'alerte
    if (filter !== "all") {
      const daysSince = calculateDaysSince(p.outboundScannedAt);
      const slaPending = p.carrier?.slaPendingDays ?? 10;
      const slaLost = p.carrier?.slaLostDays ?? 20;
      const level = getAlertLevel(p.status, daysSince, slaPending, slaLost);

      if (level !== filter) return false;
    }

    // Filtre par catégorie de statut
    if (statusFilter !== "all") {
      const activeStatuses = ["CREATED", "OUTBOUND_SCANNED", "IN_TRANSIT"];
      const deliveredStatuses = ["DELIVERED"];
      const returnStatuses = ["RETURN_IN_TRANSIT", "RETURN_RECEIVED"];
      const issueStatuses = ["PENDING_TOO_LONG", "LOST", "FAILED_DELIVERY"];

      switch (statusFilter) {
        case "actifs":
          return activeStatuses.includes(p.status);
        case "livres":
          return deliveredStatuses.includes(p.status);
        case "retours":
          return returnStatuses.includes(p.status);
        case "problemes":
          return issueStatuses.includes(p.status);
      }
    }

    return true;
  });

  // 📄 Calculs de pagination
  const totalItems = filteredParcels.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParcels = filteredParcels.slice(startIndex, endIndex);

  // Fonction pour changer de page
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Afficher toutes les pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Afficher avec ellipses
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div>
      <Navigation />

      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>🚨 Tableau de bord des alertes SLA</h1>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600
            }}
          >
            {loading ? "Chargement..." : "🔄 Actualiser"}
          </button>
        </div>

        {/* 📊 Cartes de statistiques - Vue d'ensemble */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#374151" }}>
            📊 Vue d'ensemble
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <StatCard title="Total" value={statusStats.total} color="#667eea" icon="📦" />
            <StatCard title="Créés" value={statusStats.CREATED} color="#8b5cf6" icon="🆕" />
            <StatCard title="Scannés sortants" value={statusStats.OUTBOUND_SCANNED} color="#3b82f6" icon="📤" />
            <StatCard title="En transit" value={statusStats.IN_TRANSIT} color="#06b6d4" icon="🚚" />
            <StatCard title="Livrés" value={statusStats.DELIVERED} color="#10b981" icon="✅" />
          </div>
        </div>

        {/* 🔄 Retours et problèmes */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#374151" }}>
            ↩️ Retours & Problèmes
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <StatCard title="Retour en transit" value={statusStats.RETURN_IN_TRANSIT} color="#f59e0b" icon="🔄" />
            <StatCard title="Retour reçu" value={statusStats.RETURN_RECEIVED} color="#84cc16" icon="📥" />
            <StatCard title="Attente prolongée" value={statusStats.PENDING_TOO_LONG} color="#f97316" icon="⏳" />
            <StatCard title="Perdus" value={statusStats.LOST} color="#ef4444" icon="❌" />
            <StatCard title="Échec livraison" value={statusStats.FAILED_DELIVERY} color="#dc2626" icon="⚠️" />
          </div>
        </div>

        {/* 🚨 Niveaux d'alerte */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#374151" }}>
            🚨 Niveaux d'alerte
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <StatCard title="🔴 Critique" value={alertStats.critique} color="#ef4444" />
            <StatCard title="🟡 Avertissement" value={alertStats.avertissement} color="#f59e0b" />
            <StatCard title="🟢 Normal" value={alertStats.normal} color="#10b981" />
          </div>
        </div>

        {/* 🔍 Filtres */}
        <div style={{ marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
              📋 Catégorie de statut
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label="Tous" />
              <FilterButton active={statusFilter === "actifs"} onClick={() => setStatusFilter("actifs")} label="🚚 Actifs" />
              <FilterButton active={statusFilter === "livres"} onClick={() => setStatusFilter("livres")} label="✅ Livrés" />
              <FilterButton active={statusFilter === "retours"} onClick={() => setStatusFilter("retours")} label="↩️ Retours" />
              <FilterButton active={statusFilter === "problemes"} onClick={() => setStatusFilter("problemes")} label="⚠️ Problèmes" />
            </div>
          </div>
        </div>

        {/* ⚠️ Erreur */}
        {error && (
          <div style={{ padding: 16, borderRadius: 12, border: "1px solid #f5c2c7", background: "#fff5f5", marginBottom: 16 }}>
            <strong>❌ Erreur :</strong> {error}
          </div>
        )}

        {/* 📄 Info pagination et sélecteur */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 16,
          padding: "12px 16px",
          background: "#f9fafb",
          borderRadius: 8,
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            Affichage de <strong>{startIndex + 1}</strong> à <strong>{Math.min(endIndex, totalItems)}</strong> sur <strong>{totalItems}</strong> colis
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 14, color: "#6b7280" }}>Éléments par page :</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "white",
                fontSize: 14,
                cursor: "pointer"
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* 📋 Tableau */}
        <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>Alerte</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>N° de suivi</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>Transporteur</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>Statut</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>Jours depuis scan</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>SLA</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedParcels.map((p) => {
                const daysSince = calculateDaysSince(p.outboundScannedAt);
                const slaPending = p.carrier?.slaPendingDays ?? 10;
                const slaLost = p.carrier?.slaLostDays ?? 20;
                const level = getAlertLevel(p.status, daysSince, slaPending, slaLost);

                return (
                  <tr key={p.id} style={{ background: level === "critique" ? "#fef2f2" : level === "avertissement" ? "#fffbeb" : "white" }}>
                    <td style={{ padding: 12, borderBottom: "1px solid #f2f2f2" }}>
                      {level === "critique" && "🔴"}
                      {level === "avertissement" && "🟡"}
                      {level === "normal" && "🟢"}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f2f2f2", fontWeight: 600 }}>
                      {p.trackingNumber}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f2f2f2" }}>
                      {p.carrier?.name ?? "-"}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f2f2f2" }}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f2f2f2" }}>
                      <strong>{daysSince}</strong> jour{daysSince > 1 ? "s" : ""}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f2f2f2", fontSize: 13, color: "#666" }}>
                      Attente : {slaPending}j / Perdu : {slaLost}j
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #f2f2f2" }}>
                      <Link
                        href={`/parcels/${p.trackingNumber}`}
                        style={{
                          padding: "6px 12px",
                          background: "#e3f2fd",
                          color: "#1976d2",
                          borderRadius: 6,
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 600
                        }}
                      >
                        Détails
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {!loading && paginatedParcels.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#666" }}>
                    {filter === "all" && statusFilter === "all" 
                      ? "Aucun colis trouvé" 
                      : "Aucun colis pour ces filtres"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 📄 Contrôles de pagination */}
        {totalPages > 1 && (
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            gap: 8, 
            marginTop: 24,
            paddingBottom: 24
          }}>
            {/* Bouton Première page */}
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: currentPage === 1 ? "#f9fafb" : "white",
                color: currentPage === 1 ? "#9ca3af" : "#374151",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14
              }}
              title="Première page"
            >
              «
            </button>

            {/* Bouton Précédent */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: currentPage === 1 ? "#f9fafb" : "white",
                color: currentPage === 1 ? "#9ca3af" : "#374151",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14
              }}
              title="Page précédente"
            >
              ‹
            </button>

            {/* Numéros de page */}
            {getPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span 
                    key={`ellipsis-${index}`} 
                    style={{ 
                      padding: "8px 12px",
                      color: "#9ca3af",
                      fontSize: 14
                    }}
                  >
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  style={{
                    padding: "8px 12px",
                    minWidth: 40,
                    borderRadius: 6,
                    border: isActive ? "2px solid #667eea" : "1px solid #d1d5db",
                    background: isActive ? "#667eea" : "white",
                    color: isActive ? "white" : "#374151",
                    cursor: "pointer",
                    fontWeight: isActive ? 700 : 600,
                    fontSize: 14,
                    transition: "all 0.2s"
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Bouton Suivant */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: currentPage === totalPages ? "#f9fafb" : "white",
                color: currentPage === totalPages ? "#9ca3af" : "#374151",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14
              }}
              title="Page suivante"
            >
              ›
            </button>

            {/* Bouton Dernière page */}
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: currentPage === totalPages ? "#f9fafb" : "white",
                color: currentPage === totalPages ? "#9ca3af" : "#374151",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14
              }}
              title="Dernière page"
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 🎨 Composants

function StatCard({ title, value, color, icon }: { title: string; value: number; color: string; icon?: string }) {
  return (
    <div style={{ 
      padding: 18, 
      borderRadius: 12, 
      border: "1px solid #e5e7eb", 
      background: "white",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      transition: "transform 0.2s, box-shadow 0.2s"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
    }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
        <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{title}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: active ? "2px solid #667eea" : "1px solid #ddd",
        background: active ? "#eef2ff" : "white",
        color: active ? "#667eea" : "#666",
        fontWeight: active ? 600 : 400,
        cursor: "pointer"
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    LOST: { bg: "#fef2f2", text: "#dc2626" },
    PENDING_TOO_LONG: { bg: "#fffbeb", text: "#f59e0b" },
    IN_TRANSIT: { bg: "#eff6ff", text: "#3b82f6" },
    DELIVERED: { bg: "#f0fdf4", text: "#16a34a" },
    OUTBOUND_SCANNED: { bg: "#f5f3ff", text: "#8b5cf6" },
    RETURN_IN_TRANSIT: { bg: "#fef3c7", text: "#d97706" },
    RETURN_RECEIVED: { bg: "#ecfccb", text: "#65a30d" },
    FAILED_DELIVERY: { bg: "#fee2e2", text: "#b91c1c" },
    CREATED: { bg: "#f3f4f6", text: "#4b5563" }
  };

  const style = colors[status] ?? { bg: "#f9fafb", text: "#6b7280" };
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        background: style.bg,
        color: style.text,
        fontSize: 12,
        fontWeight: 600
      }}
    >
      {label}
    </span>
  );
}