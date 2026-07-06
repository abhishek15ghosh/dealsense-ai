export interface TrackingStats {
  alertsChecked: number;
  alertsTriggered: number;
  emailsSent: number;
  errors: string[];
}

export async function trackProductPrices(): Promise<TrackingStats> {
  const stats: TrackingStats = {
    alertsChecked: 0,
    alertsTriggered: 0,
    emailsSent: 0,
    errors: []
  };
  return stats;
}
