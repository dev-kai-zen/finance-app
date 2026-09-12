const initialSchema = `
CREATE TABLE \`accounts\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`name\` text NOT NULL,
  \`type\` text NOT NULL,
  \`currency\` text NOT NULL,
  \`opening_balance_cents\` integer DEFAULT 0 NOT NULL,
  \`created_at\` integer NOT NULL,
  \`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX \`accounts_name_index\` ON \`accounts\` (\`name\`);
--> statement-breakpoint
CREATE TABLE \`categories\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`name\` text NOT NULL,
  \`type\` text NOT NULL,
  \`color\` text,
  \`icon\` text,
  \`is_system\` integer DEFAULT false NOT NULL,
  \`created_at\` integer NOT NULL,
  \`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`categories_type_name_unique\` ON \`categories\` (\`type\`,\`name\`);
--> statement-breakpoint
CREATE INDEX \`categories_type_index\` ON \`categories\` (\`type\`);
--> statement-breakpoint
CREATE TABLE \`settings\` (
  \`key\` text PRIMARY KEY NOT NULL,
  \`value\` text NOT NULL,
  \`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`transactions\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`account_id\` text NOT NULL REFERENCES \`accounts\`(\`id\`),
  \`category_id\` text REFERENCES \`categories\`(\`id\`),
  \`transfer_account_id\` text REFERENCES \`accounts\`(\`id\`),
  \`type\` text NOT NULL,
  \`amount_cents\` integer NOT NULL,
  \`note\` text,
  \`occurred_at\` integer NOT NULL,
  \`created_at\` integer NOT NULL,
  \`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX \`transactions_account_occurred_at_index\` ON \`transactions\` (\`account_id\`,\`occurred_at\`);
--> statement-breakpoint
CREATE INDEX \`transactions_category_occurred_at_index\` ON \`transactions\` (\`category_id\`,\`occurred_at\`);
`;
export default {
  journal: { entries: [{ idx: 0, when: 1770000000000, tag: '0000_initial_schema', breakpoints: true }] },
  migrations: { m0000: initialSchema },
};
