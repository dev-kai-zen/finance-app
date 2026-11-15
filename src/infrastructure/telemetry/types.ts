export interface TelemetryPrivacyPreferences {
  usageAnalyticsEnabled: boolean;
  crashReportsEnabled: boolean;
}

/**
 * STRICT PRIVACY REQUIREMENT:
 * NEVER include monetary amounts, account numbers, balances, merchant names,
 * descriptions, personal notes, or user identifiers in event payloads.
 */
export interface TelemetryEventParams {
  app_launched: {
    is_first_launch: boolean;
    app_version: string;
  };
  onboarding_completed: {
    setup_strategy: string;
  };
  transaction_created: {
    type: "expense" | "income" | "transfer";
    has_category: boolean;
    has_labels: boolean;
    has_attachments: boolean;
    is_split: boolean;
  };
  transaction_updated: {
    type: "expense" | "income" | "transfer";
    has_category: boolean;
    has_labels: boolean;
    has_attachments: boolean;
    is_split: boolean;
  };
  transaction_deleted: {
    type: "expense" | "income" | "transfer";
  };
  budget_created: {
    period: "monthly" | "weekly" | "custom";
    has_limit: boolean;
  };
  goal_created: {
    has_target_date: boolean;
  };
  report_viewed: {
    report_type: string;
    period_scope?: string;
  };
  csv_export_generated: {
    format: "csv";
    bracket: "under_100" | "100_to_1000" | "over_1000";
  };
  csv_import_completed: {
    bracket: "under_100" | "100_to_1000" | "over_1000";
    success: boolean;
  };
  backup_performed: {
    destination: "local" | "google_drive";
    success: boolean;
    is_scheduled: boolean;
  };
  pro_feature_viewed: {
    feature_key: string;
  };
  pro_paywall_opened: {
    source: string;
  };
  pro_purchase_completed: {
    product_id: string;
  };
  pro_purchase_restored: {
    success: boolean;
  };
  theme_changed: {
    theme_preset: string;
    mode: "light" | "dark" | "system";
  };
  screen_view: {
    screen_name: string;
  };
}

export type TelemetryEventName = keyof TelemetryEventParams;
