import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { DeviceEventEmitter } from "react-native";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import { useCurrencyPreferences } from "@/modules/currencies";
import { PRO_LIMITS, useProStatus } from "@/modules/pro";
import { getImportCatalog } from "../services/import-catalog.service";
import { prepareImportPreviewAsync } from "../services/prepare-import-preview.service";
import { commitImport } from "../services/commit-import.service";
import { downloadImportTemplate, pickImportFile, shareImportTemplate } from "../services/import-files.service";
import { listImportHistory } from "../repositories/imports.repository";
import type { AccountMapping, ImportCatalog, ImportKind, ImportOptions, ImportStep, ImportTransactionType } from "../types/import.types";
import { ImportValidationError, parseImportDate, suggestColumns } from "../utils/csv";
import { analyzeImportAsync } from "../utils/import-analysis";
import { ImportWorkCancelled } from "../utils/import-work";

import { prepareImportMappingsAsync } from "../utils/prepare-import-mappings";

const defaults = (kind: ImportKind, defaultCurrency: string): ImportOptions => ({ kind, source: "", columns: {}, dateFormat: "ymd", decimal: ".", defaultCurrency, defaultAccount: "", transferMode: "single", accounts: {}, categories: {}, decisions: {} });
let nextImportHookId = 1;
export function useDataImport(
  initialKind: ImportKind = "transactions",
  hookOptions?: { allowOnboarding?: boolean; defaultCurrency?: string },
) {
  const { preferences } = useCurrencyPreferences();
  const { isPro } = useProStatus();
  const defaultCurrency =
    hookOptions?.defaultCurrency && hookOptions.defaultCurrency.trim().length === 3
      ? hookOptions.defaultCurrency.trim().toUpperCase()
      : preferences.defaultCurrency;
  const allowOnboarding = Boolean(hookOptions?.allowOnboarding);
  const [catalog, setCatalog] = useState<ImportCatalog | null>(null);
  const [history, setHistory] = useState<ReturnType<typeof listImportHistory>>([]);
  const [file, setFile] = useState<Awaited<ReturnType<typeof pickImportFile>>>(null);
  const [options, setOptions] = useState<ImportOptions>(() => defaults(initialKind, defaultCurrency));

  useEffect(() => {
    setOptions((prev) => {
      if (prev.defaultCurrency === defaultCurrency) return prev;
      return { ...prev, defaultCurrency };
    });
  }, [defaultCurrency]);
  const [step, setStep] = useState<ImportStep>("file");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedTemplate, setSavedTemplate] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const locked = useRef(false);
  const sourceId = useRef<string | null>(null);
  if (sourceId.current === null) sourceId.current = `data-import-${nextImportHookId++}`;
  const refresh = () => {
    setCatalog(getImportCatalog());
    setHistory(listImportHistory());
  };
  useEffect(() => {
    let cancel = () => {};
    const load = () => {
      cancel();
      setLoading(true);
      cancel = scheduleAfterPaint(() => {
        try {
          refresh();
        } catch {
          setError("load");
        } finally {
          setLoading(false);
        }
      });
    };
    load();
    const unsubscribe = subscribeToDatabaseReplacement(() => {
      setFile(null);
      setStep("file");
      setResult(null);
      load();
    });
    return () => { cancel(); unsubscribe(); };
  }, []);
  const run = async (operation: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null); setSavedTemplate(null);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      await operation();
    }
    catch (e) { if (!(e instanceof ImportWorkCancelled)) setError(e instanceof ImportValidationError ? e.code : "failed"); }
    finally { locked.current = false; setBusy(false); }
  };
  const patch = (value: Partial<ImportOptions>) => { if (!locked.current) setOptions((previous) => ({ ...previous, ...value })); };
  const [resolved, setResolved] = useState<{
    file: NonNullable<typeof file>; options: ImportOptions; catalog: ImportCatalog; isPro: boolean;
    preview: Awaited<ReturnType<typeof prepareImportPreviewAsync>>;
    analysis: Awaited<ReturnType<typeof analyzeImportAsync>>;
  } | null>(null);
  useEffect(() => { setResolved((previous) => previous?.file === file ? previous : null); }, [file]);
  const requestId = useRef(0);
  const latestInputs = useRef({ file, options, catalog, isPro });
  latestInputs.current = { file, options, catalog, isPro };
  const current = resolved?.file === file && resolved?.options === options && resolved?.catalog === catalog && resolved?.isPro === isPro;
  const preview = current ? resolved.preview : null;
  const [previewError, setPreviewError] = useState<typeof latestInputs.current | null>(null);
  const failed = previewError?.file === file && previewError?.options === options && previewError?.catalog === catalog && previewError?.isPro === isPro;
  const previewPending = Boolean(file && catalog && !current && !failed);
  const latestResolved = useRef(resolved);
  latestResolved.current = resolved;
  useFocusEffect(useCallback(() => {
    const id = ++requestId.current;
    if (!file || !catalog) return;
    const previous = latestResolved.current;
    if (previous?.file === file && previous.options === options && previous.catalog === catalog && previous.isPro === isPro) return;
    let cancelScheduled = () => {};
    const isCancelled = () => {
      const latest = latestInputs.current;
      return id !== requestId.current || latest.file !== file || latest.options !== options || latest.catalog !== catalog || latest.isPro !== isPro;
    };
    // Mapping text stays responsive; clear stale review data in the input's own render.
    const timer = setTimeout(() => {
      cancelScheduled = scheduleAfterPaint(() => {
        void prepareImportPreviewAsync(file.document, options, catalog, file.hash, {
          isPro, maxActiveAccounts: PRO_LIMITS.FREE_MAX_ACCOUNTS,
        }, { isCancelled }).then(async (next) => {
          const analysis = await analyzeImportAsync(file.document, options, { isCancelled });
          if (isCancelled()) return;
          setResolved({ file, options, catalog, isPro, preview: next, analysis });
          setPreviewError(null);
        }).catch((e) => {
          if (isCancelled() || e instanceof ImportWorkCancelled) return;
          setPreviewError({ file, options, catalog, isPro }); setError("load");
        });
      });
    }, 150);
    return () => { requestId.current++; clearTimeout(timer); cancelScheduled(); };
  }, [file, options, catalog, isPro]));
  const matching = () => run(async () => {
    if (!file || !catalog) return;
    const prepared = await prepareImportMappingsAsync(file.document, options, catalog, {
      isCancelled: () => latestInputs.current.file !== file || latestInputs.current.options !== options,
    });
    setOptions(prepared); setStep("matching");
  });
  return {
    catalog, history, file, options, step, setStep, busy, loading, error, savedTemplate, result, preview, previewPending,
    analysis: current ? resolved.analysis : null, patch, isPro,
    reload: () =>
      run(async () => {
        refresh();
      }),
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
      void run(async () => {
        const previous = options;
        const decisions = { ...previous.decisions };
        const row = preview?.rows.find((r) => r.number === number);
        delete decisions[number];
        if (row?.companion) delete decisions[row.companion];
        const prepared = await prepareImportMappingsAsync(file.document, {
          ...previous, decisions, rowEdits: { ...previous.rowEdits, [number]: cells },
          accounts: { ...previous.accounts, ...corrections?.accounts },
          categories: { ...previous.categories, ...corrections?.categories },
          defaultAccount: corrections?.defaultAccount ?? previous.defaultAccount,
          rowTypes: corrections?.type ? { ...previous.rowTypes, [number]: corrections.type } : previous.rowTypes,
        }, catalog, { isCancelled: () => latestInputs.current.file !== file || latestInputs.current.options !== previous });
        setOptions(prepared);
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
      const saved = await commitImport(
        file.document,
        options,
        file.hash,
        file.name,
        preview.signature,
        { allowOnboarding },
      );
      DeviceEventEmitter.emit("FINANCE_APP_TRANSACTION_MUTATED", { sourceId: sourceId.current });
      setResult(saved); setStep("done"); setFile(null);
      // Saving succeeded even if refreshing a presentation query subsequently fails.
      try {
        refresh();
      } catch {
        setError("load");
      }
    }),
    restart: () => { if (!busy) { setFile(null); setResult(null); setOptions(defaults(options.kind, defaultCurrency)); setStep("file"); setError(null); } },
    accountNames: resolved?.file === file ? resolved.analysis.accountNames : [],
    categoryNames: resolved?.file === file ? resolved.analysis.categoryNames : [],
  };
}
