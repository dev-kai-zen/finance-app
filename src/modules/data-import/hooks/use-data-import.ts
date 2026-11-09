import { useEffect, useMemo, useRef, useState } from "react";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database";
import { useCurrencyPreferences } from "@/modules/currencies";
import { getImportCatalog } from "../services/import-catalog.service";
import { commitImport } from "../services/commit-import.service";
import { downloadImportTemplate, pickImportFile, shareImportTemplate } from "../services/import-files.service";
import { listImportHistory } from "../repositories/imports.repository";
import type { AccountMapping, ImportCatalog, ImportKind, ImportOptions, ImportStep, ImportTransactionType } from "../types/import.types";
import { ImportValidationError, parseImportDate, suggestColumns } from "../utils/csv";
import { buildImportPreview, sourceAccountNames, sourceCategories } from "../utils/import-preview";

import { prepareImportMappings } from "../utils/prepare-import-mappings";

const defaults = (kind: ImportKind, defaultCurrency: string): ImportOptions => ({ kind, source: "", columns: {}, dateFormat: "ymd", decimal: ".", defaultCurrency, defaultAccount: "", transferMode: "single", accounts: {}, categories: {}, decisions: {} });
export function useDataImport() {
  const { preferences } = useCurrencyPreferences();
  const defaultCurrency = preferences.defaultCurrency;
  const [catalog, setCatalog] = useState<ImportCatalog | null>(null);
  const [history, setHistory] = useState<ReturnType<typeof listImportHistory>>([]);
  const [file, setFile] = useState<Awaited<ReturnType<typeof pickImportFile>>>(null);
  const [options, setOptions] = useState<ImportOptions>(() => defaults("transactions", defaultCurrency));
  const [step, setStep] = useState<ImportStep>("file");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedTemplate, setSavedTemplate] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const locked = useRef(false);
  const refresh = () => { setCatalog(getImportCatalog()); setHistory(listImportHistory()); };
  useEffect(() => {
    try { refresh(); } catch { setError("load"); } finally { setLoading(false); }
    return subscribeToDatabaseReplacement(() => {
      setFile(null); setStep("file"); setResult(null);
      try { refresh(); } catch { setError("load"); }
    });
  }, []);
  const run = async (operation: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null); setSavedTemplate(null);
    try { await operation(); }
    catch (e) { setError(e instanceof ImportValidationError ? e.code : "failed"); }
    finally { locked.current = false; setBusy(false); }
  };
  const patch = (value: Partial<ImportOptions>) => { if (!locked.current) setOptions((previous) => ({ ...previous, ...value })); };
  const preview = useMemo(() => file && catalog ? buildImportPreview(file.document, options, catalog, file.hash) : null, [file, options, catalog]);
  const matching = () => {
    if (!file || !catalog) return;
    patch(prepareImportMappings(file.document, options, catalog)); setStep("matching");
  };
  return {
    catalog, history, file, options, step, setStep, busy, loading, error, savedTemplate, result, preview, patch,
    reload: () => run(async () => { refresh(); }),
    chooseKind: (kind: ImportKind) => { if (!busy) { setOptions(defaults(kind, defaultCurrency)); setFile(null); } },
    pick: () => run(async () => {
      const picked = await pickImportFile();
      if (picked) {
        refresh();
        setFile(picked);
        const columns = suggestColumns(picked.document.headers);
        let dateFormat: "ymd" | "dmy" | "mdy" = "ymd";
        const dateCol = options.kind === "accounts" ? columns.balanceDate : columns.date;
        if (dateCol !== undefined) {
          const sample = picked.document.rows.find((r) => r.cells[dateCol]?.trim())?.cells[dateCol]?.trim();
          if (sample) {
            const matched = (["ymd", "dmy", "mdy"] as const).find((fmt) => {
              try { parseImportDate(sample, fmt); return true; } catch { return false; }
            });
            if (matched) dateFormat = matched;
          }
        }
        setOptions({ ...defaults(options.kind, defaultCurrency), columns, dateFormat });
        setStep("columns");
      }
    }),
    template: () => run(() => shareImportTemplate(options.kind)),
    downloadTemplate: () => run(async () => { setSavedTemplate(await downloadImportTemplate(options.kind)); }),
    matching,
    updateRow: (number: number, cells: string[], corrections?: { accounts?: Record<string, AccountMapping>; categories?: Record<string, string>; defaultAccount?: string; type?: ImportTransactionType }) => {
      if (locked.current || !file || !catalog) return;
      setOptions((previous) => {
        const decisions = { ...previous.decisions };
        const row = preview?.rows.find((r) => r.number === number);
        delete decisions[number];
        if (row?.companion) delete decisions[row.companion];
        return prepareImportMappings(file.document, {
          ...previous, decisions, rowEdits: { ...previous.rowEdits, [number]: cells },
          accounts: { ...previous.accounts, ...corrections?.accounts },
          categories: { ...previous.categories, ...corrections?.categories },
          defaultAccount: corrections?.defaultAccount ?? previous.defaultAccount,
          rowTypes: corrections?.type ? { ...previous.rowTypes, [number]: corrections.type } : previous.rowTypes,
        }, catalog);
      });
    },
    account: (key: string, value: Partial<AccountMapping>) => patch({ accounts: { ...options.accounts, [key]: { ...options.accounts[key], ...value } } }),
    category: (key: string, id: string) => patch({ categories: { ...options.categories, [key]: id } }),
    decision: (row: number, value: "skip" | "import" | undefined) => {
      const decisions = { ...options.decisions };
      const target = preview?.rows.find((r) => r.number === row);
      const numbers = target?.companion ? [row, target.companion] : [row];
      for (const number of numbers) { if (value) decisions[number] = value; else delete decisions[number]; }
      patch({ decisions });
    },
    commit: () => run(async () => {
      if (!file || !preview?.ready) return;
      const saved = await commitImport(file.document, options, file.hash, file.name, preview.signature);
      setResult(saved); setStep("done"); setFile(null);
      // Saving succeeded even if refreshing a presentation query subsequently fails.
      try { refresh(); } catch { setError("load"); }
    }),
    restart: () => { if (!busy) { setFile(null); setResult(null); setOptions(defaults(options.kind, defaultCurrency)); setStep("file"); setError(null); } },
    accountNames: file ? sourceAccountNames(file.document, options) : [],
    categoryNames: file ? sourceCategories(file.document, options) : [],
  };
}
