import journal from './meta/_journal.json';
import m0000 from './0000_uneven_mercury.sql';
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
    }
  }
