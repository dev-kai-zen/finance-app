import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { usePreventRemove } from "expo-router/react-navigation";
import { useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareForm } from "@/components/keyboard-aware-form";
import { FullScreenFormModal } from "@/components/full-screen-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { ModalScreenHeader } from "@/components/modal-screen-header";
import { HelpIconButton } from "@/components/screen-title-with-help";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useWorkspace } from "@/modules/onboarding";
import type { TranslationKey } from "@/infrastructure/localization/translations/en";
import { ImportAction, ImportChip, ImportChoice, ImportInput, ImportSelect } from "../components/import-controls";
import { ImportAccountCard, ImportCategoryCard } from "../components/import-matching-cards";
import { ImportReviewEntry } from "../components/import-review-entry";
import { ImportHelpModal } from "../components/import-help-modal";
import { useDataImport } from "../hooks/use-data-import";
import type { ImportField, ImportReviewGroup, ImportTransactionType } from "../types/import.types";
import { parseImportDate, suggestColumns } from "../utils/csv";
import { validateColumnSample } from "../utils/validate-column-sample";
import { cellValue } from "../utils/import-preview";
import { filterReviewRows, importDateValidation, importFieldRequired, reviewGroupCounts } from "../utils/import-review";
import { importTypeValues, importSteps, previousImportStep, requiredImportColumns, transferFileSummary } from "../utils/import-wizard";
import { getCurrencyMinorUnitExponent } from "@/utils/currency";

type Item = { key: string; kind: "account" | "category" | "row" | "history" | "type"; index: number };
export function DataImportScreen() {
  const state = useDataImport(), theme = useAppTheme(), styles = useThemeStyles(createStyles);
  const { t, activeLanguage } = useLocalization(), router = useRouter(), navigation = useNavigation(), insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 1000;
  const personalWorkspace = useWorkspace().state.mode === "personal";
  const [confirm, setConfirm] = useState(false), [discard, setDiscard] = useState(false);
  const [help, setHelp] = useState<"overview" | "source" | "transfer" | "step" | "mapping" | "amount" | "account" | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ImportReviewGroup | null>(null);
  const [search, setSearch] = useState("");
  const [balancesOpen, setBalancesOpen] = useState(false);
  useEffect(() => { if (state.step !== "review") { setReviewFilter(null); setSearch(""); } }, [state.step]);
  const counts = reviewGroupCounts(state.preview?.rows ?? []);
  const activeGroup = reviewFilter ?? (counts.attention ? "attention" : "ready");
  const types = state.file && state.options.kind === "transactions" ? importTypeValues(state.file.document, state.options) : [];
  const unknownTypes = types.filter((entry) => !["expense", "income", "transfer", "exclude"].includes(entry.mapped));
  const dates = state.file ? importDateValidation(state.file.document, state.options) : null;
  const dateField = state.options.kind === "accounts" ? "balanceDate" : "date";
  const dateIndex = state.options.columns[dateField];
  const firstDate = dateIndex === undefined ? "" : state.file?.document.rows[0]?.cells[dateIndex] ?? "";
  const [dateWarning, setDateWarning] = useState<{ value: string; format: string; matched: boolean } | null>(null);
  useEffect(() => {
    if (state.step !== "columns" || !firstDate.trim()) return;
    try { parseImportDate(firstDate, state.options.dateFormat); return; } catch { /* Try other supported formats. */ }
    const inferred = (["ymd", "dmy", "mdy"] as const).find((format) => {
      try { parseImportDate(firstDate, format); return true; } catch { return false; }
    });
    setDateWarning({ value: firstDate, format: inferred ?? state.options.dateFormat, matched: !!inferred });
    if (inferred) state.patch({ dateFormat: inferred, accounts: {}, categories: {}, decisions: {} });
  }, [firstDate, state.options.dateFormat, state.step]);
  const [showOptional, setShowOptional] = useState(false);
  const [pendingBack, setPendingBack] = useState<(() => void) | null>(null);
  const dirty = !!state.file && state.step !== "done";
  const steps = importSteps(state.options.kind), stepIndex = steps.indexOf(state.step);
  const previous = previousImportStep(state.step, state.options.kind);
  const stage = state.step === "columns" ? "columns" : state.step === "matching" ? "accounts" : state.step === "categories" ? "categories" : "review";
  usePreventRemove(dirty || state.busy || state.step === "history", ({ data }) => {
    if (state.busy) return;
    if (previous) { state.setStep(previous); return; }
    setPendingBack(() => () => navigation.dispatch(data.action)); setDiscard(true);
  });
  const goBack = () => {
    if (state.busy) return;
    if (previous) state.setStep(previous); else router.back();
  };
  const money = (amount: number, currency: string) => `${currency} ${(amount / 10 ** getCurrencyMinorUnitExponent(currency)).toFixed(getCurrencyMinorUnitExponent(currency))}`;
  const select = (label: string, value: string, items: { value: string; label: string }[], onChange: (value: string) => void) =>
    <ImportSelect label={label} value={value} items={items} onChange={onChange} disabled={state.busy} />;
  const bullet = (text: string, danger = false) => <Text style={[styles.body, danger && styles.error]}>{"\u2022 "}{text}</Text>;
  const missingColumns = requiredImportColumns(state.options);
  const pairedAmounts = state.options.amountLayout === "separate" || (state.options.amountLayout !== "single" && state.options.columns.amount === undefined && (state.options.columns.debit !== undefined || state.options.columns.credit !== undefined));
  const transfer = state.file ? transferFileSummary(state.file.document, state.options) : { count: 0, outgoing: 0, incoming: 0 };
  const basicFields: ImportField[] = state.options.kind === "accounts"
    ? ["account", "accountType", "currency", "openingBalance", "balanceDate"]
    : ["date", "name", "type", ...(pairedAmounts ? ["debit", "credit"] as const : ["amount"] as const), "account", "category", "currency", ...(transfer.count ? ["toAccount"] as const : [])];
  const optionalFields: ImportField[] = state.options.kind === "accounts" ? ["note", "sourceId"] : ["time", "note", "labels", "subcategory", "sourceId"];
  const mapColumn = (field: ImportField, value: string) => {
    const columns = { ...state.options.columns };
    // A column can represent one field. Move it instead of creating a hidden conflict.
    for (const existing of Object.keys(columns) as ImportField[]) if (columns[existing] === Number(value)) delete columns[existing];
    if (value === "-1") delete columns[field]; else columns[field] = Number(value);
    state.patch({ columns, accounts: {}, categories: {}, decisions: {} });
  };
  const columnRow = (field: ImportField) => {
    const index = state.options.columns[field];
    const sample = index === undefined ? "" : state.file?.document.rows.find((r) => r.cells[index]?.trim())?.cells[index]?.trim() ?? "";
    const validation = index !== undefined && sample ? validateColumnSample(field, sample, state.options, state.catalog) : null;
    const formatLabel = (field === "date" || field === "balanceDate")
      ? t("dataImport.wizard.formatExpectedDate", { format: t(`dataImport.formats.${state.options.dateFormat}`) })
      : (field === "amount" || field === "debit" || field === "credit")
      ? t("dataImport.wizard.formatExpectedNumber")
      : field === "time"
      ? t("dataImport.wizard.formatExpectedTime")
      : field === "currency"
      ? t("dataImport.wizard.formatExpectedCurrency")
      : null;

    return <View key={field} style={styles.mappingRow}>
      <View style={[styles.mappingName, { gap: theme.spacing.xs }]}>
        <Text style={styles.label}>{t(`dataImport.fields.${field}`)}</Text>
        {!!formatLabel && <Text style={styles.example}>{formatLabel}</Text>}
        <ImportChip label={t(importFieldRequired(field, state.options) ? "dataImport.ui.required" : "dataImport.ui.optional")} tone={importFieldRequired(field, state.options) ? "required" : "optional"} />
      </View>
      <View style={styles.mappingValue}>
        <ImportSelect hideLabel label={t(`dataImport.fields.${field}`)} value={String(index ?? -1)} disabled={state.busy} tone={index === undefined ? "optional" : "ready"}
          items={[{ value: "-1", label: t("dataImport.unmapped") }, ...(state.file?.document.headers.map((name, i) => ({ value: String(i), label: name })) ?? [])]}
          onChange={(value) => mapColumn(field, value)} />
        {validation && (
          <Text accessibilityLiveRegion="polite" style={[styles.example, { color: "#B45309" }]}>
            {"\u26A0 "}{t(validation.warningKey, validation.warningParams)}
          </Text>
        )}
        {validation?.suggestedFormat && (
          <ImportAction
            size="small"
            variant="secondary"
            label={`${t("dataImport.wizard.switchTo")} ${t(`dataImport.formats.${validation.suggestedFormat}`)}`}
            onPress={() => state.patch({ dateFormat: validation.suggestedFormat, accounts: {}, categories: {}, decisions: {} })}
            disabled={state.busy}
          />
        )}
        {validation?.suggestedDecimal && (
          <ImportAction
            size="small"
            variant="secondary"
            label={`${t("dataImport.wizard.switchTo")} ${validation.suggestedDecimal === "." ? "1,234.56" : "1.234,56"}`}
            onPress={() => state.patch({ decimal: validation.suggestedDecimal, accounts: {}, categories: {}, decisions: {} })}
            disabled={state.busy}
          />
        )}
        {field === dateField && !validation && dateWarning?.value === firstDate && dateWarning.format === state.options.dateFormat && <Text accessibilityLiveRegion="polite" style={[styles.example, { color: "#B45309" }]}>{"\u26A0 "}{t(dateWarning.matched ? "dataImport.wizard.dateFormatMismatch" : "dataImport.errors.date")}</Text>}
        {!!sample && <Text selectable style={styles.example}>{t("dataImport.wizard.example", { value: sample.slice(0, 80) })}</Text>}
      </View>
    </View>;
  };
  const rowIndices = new Map(state.preview?.rows.map((row, index) => [row.number, index]) ?? []);
  const filteredRows = filterReviewRows(state.preview?.rows ?? [], activeGroup, search, state.options, state.catalog ?? undefined);
  const items: Item[] = state.step === "matching"
    ? state.accountNames.map((name, index) => ({ key: `a:${name}`, kind: "account", index }))
    : state.step === "categories" ? state.categoryNames.map((category, index) => ({ key: category.key, kind: "category", index }))
    : state.step === "columns" ? types.map((type, index) => ({ key: type.key, kind: "type", index }))
    : state.step === "review" ? filteredRows.map((row) => ({ key: `r:${row.number}`, kind: "row", index: rowIndices.get(row.number)! }))
    : state.step === "history" ? state.history.map((batch, index) => ({ key: batch.id, kind: "history", index })) : [];
  const renderItem = ({ item }: { item: Item }) => {
    if (item.kind === "type") {
      const entry = types[item.index];
      return <View style={styles.card}>
        <Text style={styles.label}>{entry.value} ({entry.count})</Text>
        {select(t("dataImport.ui.treatAs"), ["expense", "income", "transfer", "exclude"].includes(entry.mapped) ? entry.mapped : "", [
          { value: "", label: t("dataImport.choose") },
          ...(["expense", "income", "transfer"] as const).map((type) => ({ value: type, label: t(`dataImport.types.${type}`) })),
          { value: "exclude", label: t("dataImport.exclude") },
        ], (value) => {
          const typeMappings: Record<string, ImportTransactionType | "exclude"> = Object.assign(Object.create(null), state.options.typeMappings);
          if (!value) delete typeMappings[entry.key]; else typeMappings[entry.key] = value as "expense" | "income" | "transfer" | "exclude";
          state.patch({ typeMappings, categories: {}, decisions: {} });
        })}
      </View>;
    }
    if (item.kind === "account") return <ImportAccountCard name={state.accountNames[item.index]} state={state} />;
    if (item.kind === "category") return <ImportCategoryCard category={state.categoryNames[item.index]} state={state} />;
    if (item.kind === "row") return <ImportReviewEntry row={state.preview!.rows[item.index]} state={state} wide={wide} />;
    const batch = state.history[item.index];
    let summary: { accounts?: { name: string; currency: string; balance: number }[]; excluded?: { row: number; reason: string }[] } = {};
    try { summary = JSON.parse(batch.summaryJson); } catch { /* Older batches still show their counts. */ }
    return <View style={styles.card}>
      <Text style={styles.label}>{batch.fileName}</Text>
      <Text style={styles.body}>{batch.createdAt.toLocaleString()} | {batch.source}</Text>
      {bullet(t("dataImport.counts", { imported: batch.importedCount, skipped: batch.skippedCount }))}
      {summary.accounts?.map((account, i) => <Text key={i} style={styles.body}>{account.name}: {money(account.balance, account.currency)}</Text>)}
      {summary.excluded?.map((entry) => <Text key={entry.row} style={styles.body}>{"\u2022 "}{t("dataImport.row", { number: entry.row })}: {entry.reason === "repeated" ? t("dataImport.repeated") : entry.reason === "excluded" ? t("dataImport.excluded") : t(`dataImport.errors.${entry.reason}` as TranslationKey)}</Text>)}
    </View>;
  };
  const header = <View style={styles.section}>
    {state.error && <View accessibilityLiveRegion="polite" style={styles.card}><Text style={styles.error}>{t(`dataImport.errors.${state.error}` as TranslationKey)}</Text><ImportAction variant="secondary" label={t("dataImport.reload")} onPress={state.reload} disabled={state.busy} /></View>}
    {state.loading && <ActivityIndicator color={theme.colors.primary} />}
    {state.busy && <Text accessibilityLiveRegion="polite" style={styles.body}>{t("dataImport.working")}</Text>}
    {stepIndex >= 0 && <View style={styles.section}>
      <Text style={styles.stepLabel}>{t("dataImport.wizard.step", { current: stepIndex + 1, total: steps.length })}</Text>
      <View style={styles.progress}>{steps.map((step, index) => <View key={step} style={[styles.progressSegment, { backgroundColor: index <= stepIndex ? theme.colors.primary : theme.colors.border }]} />)}</View>
      <View style={styles.titleRow}><Text accessibilityRole="header" style={styles.heading}>{t(`dataImport.wizard.${stage}Title`)}</Text>
        <HelpIconButton accessibilityLabel={t(`dataImport.wizard.${stage}Title`)} onPress={() => setHelp("step")} /></View>
      {state.file && <View>
        <Text style={styles.body}>{t("dataImport.ui.fileName", { name: state.file.name })}</Text>
        <Text style={styles.body}>{t("dataImport.ui.rowCount", { count: state.file.document.rows.length })}</Text>
      </View>}
    </View>}
    {state.step === "file" && <>
      <Text style={styles.body}>{t("dataImport.wizard.startHelp")}</Text>
      {state.file && <View style={styles.card}>
        <Text style={styles.label}>{state.file.name}</Text>
        <ImportAction label={t("dataImport.wizard.resume")} onPress={() => state.setStep("columns")} disabled={state.busy} />
      </View>}
      {select(t("dataImport.kind"), state.options.kind, [{ value: "transactions", label: t("dataImport.transactions") }, { value: "accounts", label: t("dataImport.accounts") }], (kind) => state.chooseKind(kind as "accounts" | "transactions"))}
      {!personalWorkspace && <Text style={styles.body}>{t("dataImport.personalOnly")}</Text>}
      <ImportAction label={t("dataImport.pickFile")} onPress={state.pick} disabled={state.busy || state.loading || !state.catalog || Platform.OS === "web" || !personalWorkspace} />
      {Platform.OS === "web" && <Text style={styles.body}>{t("dataImport.nativeOnly")}</Text>}
      <Text style={styles.label}>{t("dataImport.wizard.needTemplate")}</Text>
      <ImportAction variant="secondary" label={t("dataImport.downloadTemplate")} onPress={state.downloadTemplate} disabled={state.busy || Platform.OS === "web"} />
      <ImportAction variant="secondary" label={t("dataImport.template")} onPress={state.template} disabled={state.busy || Platform.OS === "web"} />
      {state.savedTemplate && <Text accessibilityLiveRegion="polite" style={styles.body}>{t("dataImport.templateSaved", { fileName: state.savedTemplate })}</Text>}
      <ImportAction variant="secondary" label={t("dataImport.history")} onPress={() => state.setStep("history")} disabled={state.busy} />
    </>}
    {state.step === "columns" && <>
      <View style={styles.card}>
        <Text style={styles.label}>{t("dataImport.wizard.formatsTitle")}</Text>
        {select(t("dataImport.dateFormat"), state.options.dateFormat, (["ymd", "dmy", "mdy"] as const).map((value) => ({ value, label: t(`dataImport.formats.${value}`) })), (value) => state.patch({ dateFormat: value as "ymd" | "dmy" | "mdy", accounts: {}, categories: {}, decisions: {} }))}
        {dates && !!dates.checked && <View style={styles.section}>
          <Text selectable style={styles.example}>{t("dataImport.wizard.example", { value: dates.original })}</Text>
          <Text style={styles.label}>{t("dataImport.ui.interpretedDate", { date: dates.interpreted?.toLocaleDateString(activeLanguage.code, { month: "long", day: "numeric", year: "numeric" }) ?? "-" })}</Text>
          <ImportChip label={t(dates.invalid ? "dataImport.ui.invalidFormat" : "dataImport.ui.validFormat")} tone={dates.invalid ? "required" : "ready"} />
          {!!dates.invalid && <Text style={styles.error}>{t("dataImport.ui.invalidDates", { count: dates.invalid })}</Text>}
        </View>}
        {select(t("dataImport.decimal"), state.options.decimal, [{ value: ".", label: "1,234.56" }, { value: ",", label: "1.234,56" }], (value) => state.patch({ decimal: value as "." | ",", accounts: {}, categories: {}, decisions: {} }))}
        {state.options.kind === "transactions" && <>
          <View style={styles.titleRow}><Text style={styles.label}>{t("dataImport.wizard.amountLayout")}</Text><HelpIconButton accessibilityLabel={t("dataImport.wizard.amountLayout")} onPress={() => setHelp("amount")} /></View>
          <ImportChoice title={t("dataImport.wizard.oneAmount")} selected={!pairedAmounts} disabled={state.busy} onPress={() => {
            const columns = { ...state.options.columns }; delete columns.debit; delete columns.credit;
            const amount = suggestColumns(state.file!.document.headers).amount;
            if (amount !== undefined) columns.amount = amount; else delete columns.amount;
            state.patch({ columns, amountLayout: "single", categories: {}, decisions: {} });
          }} />
          <ImportChoice title={t("dataImport.wizard.twoAmounts")} selected={pairedAmounts} disabled={state.busy} onPress={() => {
            const columns = { ...state.options.columns }, suggested = suggestColumns(state.file!.document.headers); delete columns.amount;
            if (suggested.debit !== undefined) columns.debit = suggested.debit;
            if (suggested.credit !== undefined) columns.credit = suggested.credit;
            // Keep the choice visible even when the user still needs to map both columns.
            state.patch({ columns, amountLayout: "separate", categories: {}, decisions: {} });
          }} />
        </>}
      </View>
      <View style={styles.card}>
        <View style={styles.titleRow}><Text style={styles.label}>{t("dataImport.wizard.mappingTitle")}</Text><HelpIconButton accessibilityLabel={t("dataImport.wizard.mappingTitle")} onPress={() => setHelp("mapping")} /></View>
        <View style={styles.mappingRow}>
          <Text style={[styles.label, styles.mappingName]}>{t("dataImport.wizard.appColumn")}</Text>
          <Text style={[styles.label, styles.mappingValue]}>{t("dataImport.wizard.fileColumn")}</Text>
        </View>
        {basicFields.map(columnRow)}
        {state.options.columns.account === undefined && <>
          <ImportInput label={t("dataImport.wizard.fallbackAccount")} value={state.options.defaultAccount} onChange={(value) => state.patch({ defaultAccount: value, accounts: {} })} disabled={state.busy} placeholder={t("dataImport.wizard.accountExample")} onHelp={() => setHelp("account")} />
        </>}
        {state.options.columns.currency === undefined && select(t("dataImport.defaultCurrency"), state.options.defaultCurrency, state.catalog?.currencies.map((code) => ({ value: code, label: code })) ?? [], (value) => state.patch({ defaultCurrency: value, accounts: {} }))}
      </View>
      {state.options.kind === "transactions" && transfer.count > 0 && <View style={styles.card}>
        <View style={styles.titleRow}><Text style={styles.label}>{t("dataImport.wizard.transfersTitle")}</Text><HelpIconButton accessibilityLabel={t("dataImport.wizard.transfersTitle")} onPress={() => setHelp("transfer")} /></View>
        <Text style={styles.body}>{t("dataImport.wizard.transferDetected", { count: transfer.count })}</Text>
        <ImportChoice title={t("dataImport.wizard.transferOnce")} selected={state.options.transferMode === "single"} disabled={state.busy} onPress={() => state.patch({ transferMode: "single", decisions: {} })} />
        <ImportChoice title={t("dataImport.wizard.transferTwice")} selected={state.options.transferMode === "paired"} disabled={state.busy} onPress={() => state.patch({ transferMode: "paired", decisions: {} })} />
        {state.options.transferMode === "paired" && (!transfer.outgoing || !transfer.incoming) && bullet(t("dataImport.ui.transferMismatch"), true)}
        {state.options.transferMode === "paired" && !!transfer.outgoing && !!transfer.incoming && <Text style={styles.body}>{t("dataImport.ui.transferCounts", { outgoing: transfer.outgoing, incoming: transfer.incoming })}</Text>}
      </View>}
      <ImportAction variant="secondary" label={t(showOptional ? "dataImport.wizard.hideOptional" : "dataImport.wizard.showOptional")} onPress={() => setShowOptional(!showOptional)} disabled={state.busy} />
      {showOptional && <View style={styles.card}>
        <ImportInput label={t("dataImport.wizard.sourceLabel")} value={state.options.source} placeholder={t("dataImport.wizard.sourceExample")} onHelp={() => setHelp("source")} onChange={(value) => state.patch({ source: value })} disabled={state.busy} />
        {optionalFields.map(columnRow)}
      </View>}
    </>}
    {state.step === "columns" && types.length > 0 && <Text style={styles.label}>{t("dataImport.ui.typeMappingTitle")}</Text>}
    {state.step === "matching" && !state.accountNames.length && <Text style={styles.error}>{t("dataImport.wizard.noAccounts")}</Text>}
    {state.step === "categories" && !state.categoryNames.length && <Text style={styles.body}>{t("dataImport.wizard.noCategories")}</Text>}
    {state.step === "review" && state.preview && <>
      <View style={styles.card}>
        <Text style={styles.label}>{t("dataImport.wizard.findings")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {(["attention", "excluded", "ready"] as const).map((group) => <Pressable key={group} accessibilityRole="button" accessibilityState={{ selected: activeGroup === group }}
            onPress={() => { setReviewFilter(group); if (activeGroup !== group) setSearch(""); }}
            style={{ flex: 1, minWidth: 90, minHeight: 72, padding: theme.spacing.sm, gap: theme.spacing.sm, borderWidth: activeGroup === group ? 2 : 1,
              borderColor: activeGroup === group ? theme.colors.primary : theme.colors.borderStrong, borderRadius: theme.borderRadius.medium }}>
            <Text style={styles.label}>{t(`dataImport.ui.${group}`)}</Text>
            <ImportChip tone={group} label={String(counts[group])} />
          </Pressable>)}
        </View>
        <Text style={styles.example}>{t("dataImport.ui.draftOnly")}</Text>
        <ImportAction variant="secondary" label={t("dataImport.ui.viewBalances")} onPress={() => setBalancesOpen(true)} />
      </View>
      <ImportInput label={t("dataImport.ui.searchEntries")} value={search} onChange={setSearch} />
      <Text style={styles.label}>{t(`dataImport.ui.${activeGroup}`)} ({filteredRows.length})</Text>
      {wide && <View style={{ flexDirection: "row", gap: theme.spacing.sm, padding: theme.spacing.md }}>
        {(["date", "name", "account", "amount"] as const).map((field) => <Text key={field} style={[styles.label, { flex: field === "name" ? 2 : 1 }]}>{t(`dataImport.fields.${field}`)}</Text>)}
        <Text style={[styles.label, { flex: 1.3 }]}>{t("dataImport.ui.status")}</Text><View style={{ flex: 1.4 }} />
      </View>}
    </>}
    {state.step === "done" && <>
      <Text accessibilityLiveRegion="polite" style={styles.heading}>{t("dataImport.complete")}</Text>
      <Text style={styles.body}>{t("dataImport.counts", { imported: state.result?.imported, skipped: state.result?.skipped })}</Text>
      <Text style={styles.body}>{t("dataImport.recovery")}</Text>
      <ImportAction label={t("dataImport.history")} onPress={() => state.setStep("history")} />
      <ImportAction variant="secondary" label={t("dataImport.another")} onPress={state.restart} />
    </>}
    {state.step === "history" && <><Text style={styles.body}>{t("dataImport.recovery")}</Text>{!state.history.length && <Text style={styles.body}>{t("dataImport.emptyHistory")}</Text>}<ImportAction variant="secondary" label={t("dataImport.another")} onPress={state.restart} disabled={state.busy} /></>}
  </View>;
  const footer = stepIndex >= 0 ? <View style={styles.section}>
    {state.step === "columns" && <>
      {!!missingColumns.length && bullet(t("dataImport.wizard.missingColumns", { fields: missingColumns.map((field) => t(`dataImport.fields.${field}`)).join(", ") }), true)}
      {!!unknownTypes.length && <Text style={styles.error}>{t("dataImport.ui.mapUnknownTypes", { count: unknownTypes.length })}</Text>}
      <ImportAction label={t("dataImport.wizard.nextAccounts")} onPress={state.matching} disabled={state.busy || missingColumns.length > 0 || unknownTypes.length > 0} />
    </>}
    {state.step === "matching" && <ImportAction label={t(state.options.kind === "transactions" ? "dataImport.wizard.nextCategories" : "dataImport.wizard.nextReview")} onPress={() => state.setStep(state.options.kind === "transactions" ? "categories" : "review")} disabled={state.busy} />}
    {state.step === "categories" && <ImportAction label={t("dataImport.wizard.nextReview")} onPress={() => state.setStep("review")} disabled={state.busy} />}
    {state.step === "review" && <>
      {state.preview && !state.preview.ready && <Text style={styles.error}>{t(state.preview.errors ? "dataImport.wizard.cannotImport" : "dataImport.wizard.nothingToImport")}</Text>}
      <ImportAction label={t("dataImport.ui.importCount", { count: state.preview?.accepted ?? 0 })} onPress={() => setConfirm(true)} disabled={state.busy || !state.preview?.ready || !personalWorkspace} loading={state.busy} />
    </>}
    {state.step !== "review" && <ImportAction variant="secondary" label={t("dataImport.wizard.previous")} onPress={goBack} disabled={state.busy} />}
  </View> : null;
  const helpTitle = help === "source" ? t("dataImport.wizard.sourceLabel") : help === "transfer" ? t("dataImport.wizard.transfersTitle")
    : help === "step" ? t(`dataImport.wizard.${stage}Title`) : help === "mapping" ? t("dataImport.wizard.mappingTitle")
    : help === "amount" ? t("dataImport.wizard.amountLayout") : help === "account" ? t("dataImport.wizard.fallbackAccount") : t("dataImport.title");
  const helpMessage = help === "source" ? t("dataImport.wizard.sourceHelp") : help === "transfer" ? t("dataImport.wizard.transferHelp")
    : help === "step" ? (stage === "accounts" ? t("dataImport.ui.accountsHelp") : stage === "categories" ? t("dataImport.ui.categoriesHelp") : stage === "review" ? t("dataImport.ui.reviewHelp") : t(`dataImport.wizard.${stage}Description`)) : help === "mapping" ? t("dataImport.wizard.mappingHelp")
    : help === "amount" ? t("dataImport.ui.amountHelp") : help === "account" ? t("dataImport.wizard.fallbackAccountHelp")
    : `${t("dataImport.intro")}\n\n${t("dataImport.limits")}`;
  return <View style={styles.screen}>
    <ModalScreenHeader title={t(state.step === "history" ? "dataImport.history" : "dataImport.title")} backAccessibilityLabel={t("dataImport.back")}
      onPressHelp={state.step === "history" ? undefined : () => setHelp("overview")} helpAccessibilityLabel={t("dataImport.help")} onPressBack={goBack} />
    <ImportHelpModal visible={help !== null} title={helpTitle} message={helpMessage} buttonLabel={t("dataImport.closeHelp")} onClose={() => setHelp(null)} />
    <FlatList key={state.step} data={items} renderItem={renderItem} keyExtractor={(item) => item.key}
      renderScrollComponent={(props) => <KeyboardAwareForm {...props} bottomOffset={state.step === "review" ? 96 : 24} />}
      initialNumToRender={20} maxToRenderPerBatch={20} ListHeaderComponent={header} ListFooterComponent={state.step === "review" ? null : footer}
      ListEmptyComponent={state.step === "review" ? <Text style={styles.body}>{t("dataImport.ui.noResults")}</Text> : null}
      contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { maxWidth: state.step === "review" ? 1100 : 840, paddingBottom: Math.max(insets.bottom, 24) }]} />
    {state.step === "review" && <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: Math.max(insets.bottom, 16), borderTopWidth: 1, borderColor: theme.colors.border }}>{footer}</View>}
    <FullScreenFormModal visible={balancesOpen} title={t("dataImport.wizard.projectedBalances")} onClose={() => setBalancesOpen(false)}>
      <FlatList data={state.preview?.balances ?? []} keyExtractor={(balance) => balance.key} contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
        ListHeaderComponent={<View style={styles.section}>
          {Object.entries(state.preview?.income ?? {}).map(([currency, amount]) => <Text key={`i:${currency}`} style={styles.body}>{t("dataImport.types.income")}: {money(amount, currency)}</Text>)}
          {Object.entries(state.preview?.expense ?? {}).map(([currency, amount]) => <Text key={`e:${currency}`} style={styles.body}>{t("dataImport.types.expense")}: {money(amount, currency)}</Text>)}
        </View>}
        renderItem={({ item }) => <View style={styles.card}><Text style={styles.label}>{item.name}</Text>
          <Text style={styles.body}>{t("dataImport.wizard.before", { amount: money(item.before, item.currency) })}</Text>
          <Text style={styles.label}>{t("dataImport.wizard.after", { amount: money(item.after, item.currency) })}</Text></View>} />
    </FullScreenFormModal>
    <ConfirmModal visible={confirm} variant="primary" title={t("dataImport.confirm")} message={t("dataImport.confirmHelp")}
      confirmLabel={t("dataImport.confirm")} cancelLabel={t("dataImport.cancel")} pending={state.busy}
      onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); void state.commit(); }} />
    <ConfirmModal visible={discard} title={t("dataImport.leave")} message={t("dataImport.leaveHelp")}
      confirmLabel={t("dataImport.leave")} cancelLabel={t("dataImport.cancel")} onCancel={() => setDiscard(false)}
      onConfirm={() => { setDiscard(false); state.restart(); pendingBack?.(); }} />
  </View>;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, gap: theme.spacing.lg, maxWidth: 840, width: "100%", alignSelf: "center" },
    section: { gap: theme.spacing.md },
    card: { padding: theme.spacing.lg, gap: theme.spacing.md, borderRadius: theme.borderRadius.large, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    label: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.base, fontWeight: "600", flexShrink: 1 },
    heading: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.xl, fontWeight: "700" },
    body: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, lineHeight: theme.typography.lineHeight.base },
    example: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.xs, lineHeight: theme.typography.lineHeight.sm },
    error: { color: theme.colors.danger, fontSize: theme.typography.fontSize.sm, lineHeight: theme.typography.lineHeight.base },
    stepLabel: { color: theme.colors.primary, fontSize: theme.typography.fontSize.sm, fontWeight: "700" },
    progress: { flexDirection: "row", gap: theme.spacing.sm },
    progressSegment: { flex: 1, height: theme.spacing.xs, borderRadius: theme.borderRadius.small },
    mappingRow: { flexDirection: "row", gap: theme.spacing.md, alignItems: "center", paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderColor: theme.colors.border },
    mappingName: { flex: 1, minWidth: 0 },
    mappingValue: { flex: 1.4, minWidth: 0 },
    titleRow: { flexDirection: "row", gap: theme.spacing.sm, alignItems: "center" },
  });
}
