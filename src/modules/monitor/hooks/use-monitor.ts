import { useCallback, useEffect, useState } from "react";
import {
  executeRawQuery,
  getAllTables,
  getTableData,
  vacuumDatabase,
} from "../repositories/monitor.repository";
import type {
  QueryResult,
  TableDataResult,
  TableInfo,
} from "../types/monitor.types";

export function useMonitor() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableDataResult | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTables = useCallback(() => {
    try {
      setLoading(true);
      const list = getAllTables();
      setTables(list);
    } catch (err: any) {
      console.error("Failed to load monitor tables:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTableData = useCallback((tableName: string) => {
    try {
      const data = getTableData(tableName);
      setTableData(data);
    } catch (err: any) {
      console.error(`Failed to load data for ${tableName}:`, err);
    }
  }, []);

  useEffect(() => {
    refreshTables();
  }, [refreshTables]);

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
    } else {
      setTableData(null);
    }
  }, [selectedTable, loadTableData]);

  const runQuery = useCallback((sql: string) => {
    try {
      setQueryError(null);
      const res = executeRawQuery(sql);
      setQueryResult(res);
      refreshTables();
    } catch (err: any) {
      setQueryError(err?.message || "SQL Execution Error");
      setQueryResult(null);
    }
  }, [refreshTables]);

  const vacuum = useCallback(async () => {
    try {
      setQueryError(null);
      await vacuumDatabase();
      refreshTables();
      return { success: true, error: null };
    } catch (err: any) {
      const rawMessage = err?.message || "Failed to vacuum SQLite database.";
      const msg = rawMessage.includes("SQL statements in progress")
        ? "Database is busy with other queries. Wait a moment and try VACUUM again."
        : rawMessage;
      console.error("Failed to vacuum SQLite database:", err);
      setQueryError(msg);
      return { success: false, error: msg };
    }
  }, [refreshTables]);

  return {
    tables,
    selectedTable,
    setSelectedTable,
    tableData,
    queryResult,
    queryError,
    loading,
    runQuery,
    vacuum,
    refreshTables,
  };
}
