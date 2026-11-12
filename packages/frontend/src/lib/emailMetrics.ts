import type { EmailCampaignMetric } from "@repo/common";

export const EMAIL_CAMPAIGN_METRIC_LABELS: Record<EmailCampaignMetric, string> =
  {
    bounced: "Bounces",
    uniqOpens: "Unique opens",
    uniqClicks: "Unique clicks",
    unsubscribers: "Unsubscribes",
    complaints: "Complaints",
  };
