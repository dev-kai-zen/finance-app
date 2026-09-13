export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export interface TableInfo {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
  sql: string;
}

export interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTimeMs: number;
}

export interface TableDataResult {
  rows: any[];
  columns: string[];
  totalCount: number;
}

export type MonitorTab = "tables" | "console" | "schema";
