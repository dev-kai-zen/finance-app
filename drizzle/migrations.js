import journal from './meta/_journal.json';
import m0000 from './0000_uneven_mercury.sql';
import m0001 from './0001_add_account_types_and_update_accounts.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001
    }
  }
  