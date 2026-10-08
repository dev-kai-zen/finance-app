// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_initial_schema.sql';
import m0001 from './0001_add_account_types_and_update_accounts.sql';
import m0002 from './0002_add_parent_id_to_categories.sql';
import m0003 from './0003_add_name_to_transactions.sql';
import m0004 from './0004_add_sort_order_to_categories.sql';
import m0005 from './0005_transaction_groups_for_transfers.sql';
import m0006 from './0006_add_note_to_accounts.sql';
import m0007 from './0007_add_icon_key_to_accounts.sql';
import m0008 from './0008_add_account_balance_and_visibility_fields.sql';
import m0009 from './0009_remove_is_archived_from_account_types.sql';
import m0010 from './0010_create_hex_colors_and_update_tables.sql';
import m0011 from './0011_add_deleted_at_to_transactions.sql';
import m0012 from './0012_add_account_pockets.sql';
import m0013 from './0013_replace_pocket_movements_with_transactions.sql';
import m0014 from './0014_add_account_pocket_enabled.sql';
import m0015 from './0015_add_credit_card_details.sql';
import m0016 from './0016_add_credit_card_monitoring.sql';
import m0017 from './0017_add_fund_groups.sql';
import m0018 from './0018_add_transaction_presets.sql';
import m0019 from './0019_remove_transaction_preset_name.sql';
import m0020 from './0020_add_transaction_schedules.sql';
import m0021 from './0021_archive_transaction_schedules.sql';
import m0022 from './0022_add_transaction_attachments_and_sync.sql';
import m0023 from './0023_add_credit_card_bnpl_deferred_months.sql';
import m0024 from './0024_add_category_budgets.sql';
import m0025 from './0025_add_semi_monthly_frequency.sql';
import m0026 from './0026_add_labels_and_transaction_labels.sql';
import m0027 from './0027_add_exact_weekend_policy.sql';
import m0028 from './0028_add_notes_and_note_attachments.sql';
import m0029 from './0029_add_exchange_rates.sql';
import m0030 from './0030_add_goals.sql';
import m0031 from './0031_add_goal_accounts.sql';
import m0032 from './0032_add_goal_pockets.sql';
import m0033 from './0033_add_currencies_and_rename_amount_minor_units.sql';
import m0034 from './0034_add_currency_is_custom.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006,
m0007,
m0008,
m0009,
m0010,
m0011,
m0012,
m0013,
m0014,
m0015,
m0016,
m0017,
m0018,
m0019,
m0020,
m0021,
m0022,
m0023,
m0024,
m0025,
m0026,
m0027,
m0028,
m0029,
m0030,
m0031,
m0032,
m0033,
m0034
    }
  }
  