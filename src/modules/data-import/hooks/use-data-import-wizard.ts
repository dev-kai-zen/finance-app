import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccounts, getAccountTypes } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { useCurrencies, useCurrencyPreferences } from "@/modules/currencies";
import { useLabels } from "@/modules/labels";
import { findSimilarTransaction } from "@/modules/transactions";
import type {
  AccountMatchDecision,
  CategoryMatchDecision,
  ColumnMappingConfig,
  ImportType,
  KaizenFieldKey,
  ParsedCsvFile,
  ParsedDataRow,
} from "../types/data-import.types";
import { suggestColumnMappings, reassignColumnMapping } from "../services/suggest-column-mappings.service";
import { extractAccountCandidates, buildInitialAccountMatches } from "../services/match-accounts.service";
import { extractCategoryCandidates, buildInitialCategoryMatches } from "../services/match-categories.service";
import { buildImportPreview, type BuildPreviewResult } from "../services/build-import-preview.service";
import { executeDataImport, type ExecuteImportResult } from "../services/execute-data-import.service";
import { findExistingSourceIdentities } from "../repositories/data-import.repository";

export function useDataImportWizard() {
  const [step, setStep] = useState<number>(1);
  const [importType, setImportType] = useState<ImportType>("transactions");
  const [parsedFile, setParsedFile] = useState<ParsedCsvFile | null>(null);

  const [config, setConfig] = useState<ColumnMappingConfig>({
    dateFormat: "auto",
    numberFormat: "auto",
    amountLayout: "single",
    transferStyle: "single_row",
    typeMap: {},
    sourceName: "CSV",
  });

  const [accountMatches, setAccountMatches] = useState<Record<string, AccountMatchDecision>>({});
  const [categoryMatches, setCategoryMatches] = useState<Record<string, CategoryMatchDecision>>({});
  const [rowOverrides, setRowOverrides] = useState<Record<number, Partial<ParsedDataRow>>>({});
  const [userExcludedRows, setUserExcludedRows] = useState<Set<number>>(new Set());
  const [userConfirmedSimilarRows, setUserConfirmedSimilarRows] = useState<Set<number>>(new Set());

  const [preview, setPreview] = useState<BuildPreviewResult | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ExecuteImportResult | null>(null);

  const { accounts: existingAccounts } = useAccounts();
  const { categories: existingCategories } = useCategories();
  const { currencies: activeCurrencies } = useCurrencies();
  const { preferences } = useCurrencyPreferences();
  const defaultCurrencyCode = preferences.defaultCurrency || "PHP";

  const availableAccountTypes = useMemo(() => {
    try {
      return getAccountTypes();
    } catch {
      return [];
    }
  }, []);

  // When a file is chosen, initialize suggestions
  const handleFileChosen = useCallback(
    (file: ParsedCsvFile) => {
      setParsedFile(file);
      const suggested = suggestColumnMappings(file.headers, importType);
      suggested.defaultCurrencyCode = defaultCurrencyCode;
      setConfig(suggested);
      setAccountMatches({});
      setCategoryMatches({});
      setRowOverrides({});
      setUserExcludedRows(new Set());
      setUserConfirmedSimilarRows(new Set());
      setStep(2);
      setError(null);
    },
    [defaultCurrencyCode, importType],
  );

  // Clear downstream matches and choices whenever column mapping or format choices change
  const clearDownstreamDecisions = useCallback(() => {
    setAccountMatches({});
    setCategoryMatches({});
    setRowOverrides({});
    setUserExcludedRows(new Set());
    setUserConfirmedSimilarRows(new Set());
  }, []);

  const updateColumnMapping = useCallback(
    (targetField: KaizenFieldKey, selectedColumn: string | undefined) => {
      setConfig((prev) => reassignColumnMapping(prev, targetField, selectedColumn));
      clearDownstreamDecisions();
    },
    [clearDownstreamDecisions],
  );

  const updateConfig = useCallback(
    (partial: Partial<ColumnMappingConfig>) => {
      setConfig((prev) => ({ ...prev, ...partial }));
      // If changing format/layout/type choices, clear downstream
      if (
        partial.dateFormat !== undefined ||
        partial.numberFormat !== undefined ||
        partial.amountLayout !== undefined ||
        partial.transferStyle !== undefined ||
        partial.typeMap !== undefined ||
        partial.defaultAccountName !== undefined ||
        partial.defaultCurrencyCode !== undefined
      ) {
        clearDownstreamDecisions();
      }
    },
    [clearDownstreamDecisions],
  );

  // Initialize account matching when moving to step 3
  const prepareAccountMatching = useCallback(() => {
    if (!parsedFile) return;

    const candidates = extractAccountCandidates(
      parsedFile.headers,
      parsedFile.rawRows,
      config,
      defaultCurrencyCode,
    );

    const initial = buildInitialAccountMatches(
      candidates,
      existingAccounts,
      availableAccountTypes,
      defaultCurrencyCode,
      importType,
    );

    setAccountMatches((prev) => ({ ...initial, ...prev }));
  }, [availableAccountTypes, config, defaultCurrencyCode, existingAccounts, importType, parsedFile]);

  // Initialize category matching when moving to step 4
  const prepareCategoryMatching = useCallback(() => {
    if (!parsedFile || importType === "accounts") return;

    const typeColIdx = config.typeColumn ? parsedFile.headers.indexOf(config.typeColumn) : -1;
    const rowTypes = parsedFile.rawRows.map((r) => {
      const rawType = typeColIdx >= 0 ? r[typeColIdx]?.trim().toLowerCase() : "";
      if (rawType === "income") return "income" as const;
      if (rawType === "expense") return "expense" as const;
      if (rawType === "transfer") return "transfer" as const;
      if (config.typeMap[rawType]) return config.typeMap[rawType];
      return "expense" as const;
    });

    const candidates = extractCategoryCandidates(
      parsedFile.headers,
      parsedFile.rawRows,
      config,
      rowTypes,
    );

    const initial = buildInitialCategoryMatches(candidates, existingCategories);
    setCategoryMatches((prev) => ({ ...initial, ...prev }));
  }, [config, existingCategories, importType, parsedFile]);

  // Rebuild preview
  const refreshPreview = useCallback(() => {
    if (!parsedFile) return;

    const candidateIdentities: string[] = [];
    for (let r = 1; r <= parsedFile.rawRows.length; r++) {
      candidateIdentities.push(
        `${importType}:${config.sourceName || "CSV"}:${parsedFile.fileHash}:${r}`,
      );
    }
    const previouslyImported = findExistingSourceIdentities(candidateIdentities);

    const res = buildImportPreview({
      parsedFile,
      importType,
      config,
      accountMatches,
      categoryMatches,
      existingAccounts,
      existingCategories,
      activeCurrencies,
      availableAccountTypes,
      previouslyImportedIdentities: previouslyImported,
      similarTransactionChecker: (check) => findSimilarTransaction(check),
      rowOverrides,
      userExcludedRows,
      userConfirmedSimilarRows,
    });

    setPreview(res);
  }, [
    accountMatches,
    activeCurrencies,
    availableAccountTypes,
    categoryMatches,
    config,
    existingAccounts,
    existingCategories,
    importType,
    parsedFile,
    rowOverrides,
    userConfirmedSimilarRows,
    userExcludedRows,
  ]);

  // Step transitions
  const goToStep = useCallback(
    (targetStep: number) => {
      setError(null);
      if (targetStep === 3) {
        prepareAccountMatching();
      } else if (targetStep === 4) {
        if (importType === "accounts") {
          // Accounts only skips categories
          targetStep = 5;
        } else {
          prepareCategoryMatching();
        }
      }
      if (targetStep === 5) {
        refreshPreview();
      }
      setStep(targetStep);
    },
    [importType, prepareAccountMatching, prepareCategoryMatching, refreshPreview],
  );

  const goBack = useCallback(() => {
    if (step === 5 && importType === "accounts") {
      setStep(3); // skip categories
    } else {
      setStep((prev) => Math.max(1, prev - 1));
    }
  }, [importType, step]);

  const resetDraft = useCallback(() => {
    setStep(1);
    setParsedFile(null);
    setConfig({
      dateFormat: "auto",
      numberFormat: "auto",
      amountLayout: "single",
      transferStyle: "single_row",
      typeMap: {},
      sourceName: "CSV",
    });
    setAccountMatches({});
    setCategoryMatches({});
    setRowOverrides({});
    setUserExcludedRows(new Set());
    setUserConfirmedSimilarRows(new Set());
    setPreview(null);
    setImportResult(null);
    setError(null);
  }, []);

  const toggleRowExcluded = useCallback((rowNumber: number) => {
    setUserExcludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  }, []);

  const confirmRowSimilar = useCallback((rowNumber: number) => {
    setUserConfirmedSimilarRows((prev) => {
      const next = new Set(prev);
      next.add(rowNumber);
      return next;
    });
  }, []);

  const setRowOverride = useCallback((rowNumber: number, override: Partial<ParsedDataRow>) => {
    setRowOverrides((prev) => ({
      ...prev,
      [rowNumber]: { ...prev[rowNumber], ...override },
    }));
  }, []);

  // Whenever overrides or exclusions change in step 5, update preview
  useEffect(() => {
    if (step === 5) {
      refreshPreview();
    }
  }, [refreshPreview, rowOverrides, step, userConfirmedSimilarRows, userExcludedRows]);

  // Execute import
  const performImport = useCallback(async () => {
    if (!parsedFile || isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
      const result = await executeDataImport({
        parsedFile,
        importType,
        config,
        accountMatches,
        categoryMatches,
        rowOverrides,
        userExcludedRows,
        userConfirmedSimilarRows,
      });

      setImportResult(result);
      setStep(6);
    } catch (err: any) {
      setError(err?.message || "Import failed.");
    } finally {
      setIsSaving(false);
    }
  }, [
    accountMatches,
    categoryMatches,
    config,
    importType,
    isSaving,
    parsedFile,
    rowOverrides,
    userConfirmedSimilarRows,
    userExcludedRows,
  ]);

  return {
    step,
    importType,
    setImportType,
    parsedFile,
    config,
    accountMatches,
    setAccountMatches,
    categoryMatches,
    setCategoryMatches,
    rowOverrides,
    userExcludedRows,
    userConfirmedSimilarRows,
    preview,
    busy,
    isSaving,
    error,
    importResult,
    handleFileChosen,
    updateColumnMapping,
    updateConfig,
    goToStep,
    goBack,
    resetDraft,
    toggleRowExcluded,
    confirmRowSimilar,
    setRowOverride,
    performImport,
    refreshPreview,
    existingAccounts,
    existingCategories,
    activeCurrencies,
    availableAccountTypes,
    defaultCurrencyCode,
  };
}

