const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export type AlertParcel = {
  id: number;
  trackingNumber: string;
  status: string;
  destination: string | null;
  outboundScannedAt: string | null;
  carrierId: number | null;
  carrier?: {
    id: number;
    name: string;
    slaPendingDays: number;
    slaLostDays: number;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export async function getAlertParcels(): Promise<AlertParcel[]> {
  const res = await fetch(`${apiBase}/api/parcels?limit=100`, {
    cache: "no-store"
  });
  
  const data = await res.json();
  
  if (!data.ok) {
    throw new Error(data.message ?? "Échec du chargement des colis");
  }
  
  return data.parcels;
}

export function calculateDaysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export function getAlertLevel(
  status: string,
  daysSinceScan: number,
  slaPending: number,
  slaLost: number
): "critique" | "avertissement" | "normal" {
  if (status === "LOST" || daysSinceScan >= slaLost) {
    return "critique";
  }
  
  if (status === "PENDING_TOO_LONG" || daysSinceScan >= slaPending) {
    return "avertissement";
  }
  
  return "normal";
}

// 📊 Statistiques par statut
export type StatusStats = {
  CREATED: number;
  OUTBOUND_SCANNED: number;
  IN_TRANSIT: number;
  DELIVERED: number;
  RETURN_IN_TRANSIT: number;
  RETURN_RECEIVED: number;
  PENDING_TOO_LONG: number;
  LOST: number;
  FAILED_DELIVERY: number;
  total: number;
};

export function calculateStatusStats(parcels: AlertParcel[]): StatusStats {
  const stats: StatusStats = {
    CREATED: 0,
    OUTBOUND_SCANNED: 0,
    IN_TRANSIT: 0,
    DELIVERED: 0,
    RETURN_IN_TRANSIT: 0,
    RETURN_RECEIVED: 0,
    PENDING_TOO_LONG: 0,
    LOST: 0,
    FAILED_DELIVERY: 0,
    total: parcels.length
  };

  parcels.forEach((p) => {
    const status = p.status as keyof StatusStats;
    if (status in stats && status !== 'total') {
      stats[status]++;
    }
  });

  return stats;
}

// 🏷️ Traductions des statuts
export const STATUS_LABELS: Record<string, string> = {
  CREATED: "Créé",
  OUTBOUND_SCANNED: "Scanné sortant",
  IN_TRANSIT: "En transit",
  DELIVERED: "Livré",
  RETURN_IN_TRANSIT: "Retour en transit",
  RETURN_RECEIVED: "Retour reçu",
  PENDING_TOO_LONG: "En attente trop longtemps",
  LOST: "Perdu",
  FAILED_DELIVERY: "Échec de livraison"
};