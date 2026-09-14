import journal from './meta/_journal.json';
import m0000 from './0000_uneven_mercury.sql';
import m0001 from './0001_add_account_types_and_update_accounts.sql';
import m0002 from './0002_add_parent_id_to_categories.sql';
import m0003 from './0003_add_name_to_transactions.sql';
import m0004 from './0004_add_sort_order_to_categories.sql';
import m0005 from './0005_transaction_groups_for_transfers.sql';
import m0006 from './0006_add_note_to_accounts.sql';
import m0007 from './0007_add_icon_key_to_accounts.sql';

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
    }
  }
  