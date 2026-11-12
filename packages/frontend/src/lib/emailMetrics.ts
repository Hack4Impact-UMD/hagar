import type { EmailCampaignMetric } from "@repo/common";

// TEMPORARY: the Add/Customize modal work (issue #84) owns this file. Delete
// this copy and take that one when it is merged.
export const EMAIL_CAMPAIGN_METRIC_LABELS: Record<EmailCampaignMetric, string> =
  {
    bounced: "Bounced",
    uniqOpens: "Unique opens",
    uniqClicks: "Unique clicks",
    unsubscribers: "Unsubscribers",
    complaints: "Complaints",
  };
