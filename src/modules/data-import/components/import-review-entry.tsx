import { useState } from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { FullScreenFormModal } from "@/components/full-screen-form-modal";
import { KeyboardAwareForm } from "@/components/keyboard-aware-form";
import { InfoModal } from "@/components/info-modal";
import type { useDataImport } from "../hooks/use-data-import";
import type { AccountMapping, ImportField, ImportPreviewRow, ImportTransactionType } from "../types/import.types";
import { normalizeImportName } from "../utils/csv";
import { cellValue, resolveImportType, sourceCategories } from "../utils/import-preview";
import { importAccountName, importReviewGroup } from "../utils/import-review";
import { prepareImportMappings } from "../utils/prepare-import-mappings";
import { ImportAction, ImportChip, ImportDateField, ImportInput, ImportTypePicker } from "./import-controls";
import { ImportAccountCard, ImportCategoryCard } from "./import-matching-cards";

type ImportState = ReturnType<typeof useDataImport>;
export function ImportReviewEntry({ row, state, wide = false }: { row: ImportPreviewRow; state: ImportState; wide?: boolean }) {
  const { t } = useLocalization(), theme = useAppTheme();
  const [editing, setEditing] = useState(false), [cells, setCells] = useState(row.cells);
  const [accounts, setAccounts] = useState<Record<string, AccountMapping>>({}), [categories, setCategories] = useState<Record<string, string>>({});
  const [defaultAccount, setDefaultAccount] = useState<string | undefined>();
  const [entryType, setEntryType] = useState<string>("");
  const [more, setMore] = useState(false), [repeatHelp, setRepeatHelp] = useState(false);
  const draftOptions = editing && state.file && state.catalog ? prepareImportMappings(state.file.document, {
    ...state.options, rowEdits: { ...state.options.rowEdits, [row.number]: cells },
    rowTypes: ["expense", "income", "transfer"].includes(entryType) ? { ...state.options.rowTypes, [row.number]: entryType as ImportTransactionType } : state.options.rowTypes,
    accounts: { ...state.options.accounts, ...accounts }, categories: { ...state.options.categories, ...categories },
    defaultAccount: defaultAccount ?? state.options.defaultAccount,
  }, state.catalog) : state.options;
  const draftState = { ...state, options: draftOptions,
    account: (key: string, value: Partial<AccountMapping>) => setAccounts((old) => ({ ...old, [key]: { ...draftOptions.accounts[key], ...value } })),
    category: (key: string, id: string) => setCategories((old) => ({ ...old, [key]: id })),
  };
  const get = (field: ImportField) => cellValue(editing ? cells : row.cells, draftOptions, field);
  const accountName = get("account") || draftOptions.defaultAccount;
  const accountNames = [...new Set([accountName, get("toAccount"), row.transaction?.toAccountKey ? state.accountNames.find((name) => normalizeImportName(name) === row.transaction?.toAccountKey) : ""].filter((name): name is string => !!name))];
  const category = sourceCategories({ headers: state.file?.document.headers ?? [], rows: [{ number: row.number, cells: editing ? cells : row.cells }] }, draftOptions)[0];
  const fields = Object.entries(state.options.columns).filter(([field]) => !["sourceId", "accountType", "openingBalance", "balanceDate", "type"].includes(field)) as [ImportField, number][];
  const basic = new Set(["date", "name", "amount", "debit", "credit"]);
  const group = importReviewGroup(row), label = row.repeated ? t("dataImport.ui.previouslyImported") : t(`dataImport.ui.${group}`);
  const resolved = resolveImportType(row.cells, state.options, row.number);
  const dirty = cells.some((value, index) => value !== row.cells[index]) || Object.keys(accounts).length > 0 || Object.keys(categories).length > 0 || defaultAccount !== undefined || (editing && entryType !== resolved);
  const textStyle = { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.sm };
  const edit = () => { setCells(row.cells); setAccounts({}); setCategories({}); setDefaultAccount(undefined); setEntryType(resolved); setMore(false); setEditing(true); };
  const apply = () => {
    const keys = accountNames.map(normalizeImportName);
    state.updateRow(row.number, cells, {
      accounts: Object.fromEntries(keys.filter((key) => draftOptions.accounts[key]).map((key) => [key, draftOptions.accounts[key]])),
      categories: category && draftOptions.categories[category.key] !== undefined ? { [category.key]: draftOptions.categories[category.key] } : {},
      defaultAccount: draftOptions.defaultAccount,
      type: ["expense", "income", "transfer"].includes(entryType) ? entryType as ImportTransactionType : undefined,
    });
    setEditing(false);
  };
  const field = ([name, index]: [ImportField, number]) => name === "date"
    ? <ImportDateField key={name} label={t("dataImport.fields.date")} value={cells[index] ?? ""} format={state.options.dateFormat} disabled={state.busy} onChange={(value) => setCells((old) => old.map((cell, i) => i === index ? value : cell))} />
    : <ImportInput key={name} label={t(`dataImport.fields.${name}`)} value={cells[index] ?? ""} disabled={state.busy} onChange={(value) => setCells((old) => old.map((cell, i) => i === index ? value : cell))} />;
  return <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderWidth: 1,
    borderColor: group === "attention" ? theme.colors.danger : theme.colors.border, borderRadius: wide ? 0 : theme.borderRadius.large }}>
    <View style={{ flexDirection: wide ? "row" : "column", gap: theme.spacing.sm, alignItems: wide ? "center" : "stretch" }}>
      <Text style={[textStyle, wide && { flex: 1 }]}>{get("date") || t("dataImport.row", { number: row.number })}</Text>
      <Text numberOfLines={2} style={[textStyle, { fontWeight: "600" }, wide && { flex: 2 }]}>{get("name") || t("dataImport.row", { number: row.number })}{row.companion ? ` (+${row.companion})` : ""}</Text>
      <Text style={[textStyle, wide && { flex: 1 }]}>{importAccountName(accountName, draftOptions, state.catalog ?? undefined)}</Text>
      <View style={wide ? { flex: 1 } : undefined}>
        <Text style={[textStyle, { fontWeight: "600" }]}>{row.transaction?.currency ?? get("currency")} {get("amount") || get("debit") || get("credit")}</Text>
        {(["expense", "income", "transfer"] as const).map((type) => resolved === type ? <Text key={type} style={{ color: theme.colors.textSecondary }}>{t(`dataImport.types.${type}`)}</Text> : null)}
      </View>
      <View style={wide ? { flex: 1.3 } : undefined}><ImportChip label={label} tone={group} /></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, ...(wide ? { flex: 1.4 } : {}) }}>
        {row.repeated ? <ImportAction size="small" variant="secondary" label={t("dataImport.ui.details")} onPress={() => setRepeatHelp(true)} /> : <>
          <ImportAction size="small" variant="secondary" label={t("dataImport.wizard.editEntry")} disabled={state.busy} onPress={edit} />
          <ImportAction size="small" variant="secondary" label={t(row.skip ? "dataImport.include" : "dataImport.exclude")} disabled={state.busy} onPress={() => { if (row.skip && resolved === "exclude") edit(); else state.decision(row.number, row.skip ? undefined : "skip"); }} />
          {row.duplicate && !row.skip && state.options.kind === "transactions" && <ImportAction size="small" label={t("dataImport.keepDuplicate")} disabled={state.busy} onPress={() => state.decision(row.number, "import")} />}
        </>}
      </View>
    </View>
    <FullScreenFormModal visible={editing} title={t("dataImport.row", { number: row.number })} onClose={() => setEditing(false)}
      headerRight={<View />}
      onSave={apply} saveLabel={t("dataImport.ui.applyCorrections")} saveDisabled={state.options.kind === "transactions" && !["expense", "income", "transfer"].includes(entryType)} pending={state.busy} isDirty={dirty}>
      <KeyboardAwareForm contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Text style={{ color: theme.colors.textSecondary }}>{t("dataImport.ui.draftOnly")}</Text>
        <ImportChip label={label} tone={group} />
        {row.issue && !row.skip && <View>
          <Text style={{ color: theme.colors.danger }}>{"\u2022 "}{t(`dataImport.errors.${row.issue}`)}</Text>
          <Text style={textStyle}>{"\u2022 "}{t(`dataImport.wizard.issueActions.${row.issue}`)}</Text>
        </View>}
        {state.options.kind === "transactions" && <>
          <Text style={textStyle}>{t("dataImport.fields.type")}</Text>
          <ImportTypePicker value={entryType} disabled={state.busy} onChange={setEntryType} />
          {fields.filter(([name]) => basic.has(name)).map(field)}
        </>}
        {draftOptions.columns.account === undefined && <ImportInput label={t("dataImport.wizard.fallbackAccount")} value={draftOptions.defaultAccount} onChange={setDefaultAccount} disabled={state.busy} />}
        {accountNames.map((name) => <ImportAccountCard key={name} name={name} state={draftState} />)}
        {category && <ImportCategoryCard category={category} state={draftState} />}
        {state.options.kind === "transactions" && <>
          <ImportAction variant="secondary" label={t(more ? "dataImport.wizard.hideOptional" : "dataImport.wizard.showOptional")} disabled={state.busy} onPress={() => setMore(!more)} />
          {more && fields.filter(([name]) => !basic.has(name)).map(field)}
        </>}
        <ImportAction label={t("dataImport.ui.applyCorrections")} disabled={state.busy || (state.options.kind === "transactions" && !["expense", "income", "transfer"].includes(entryType))} onPress={apply} />
      </KeyboardAwareForm>
    </FullScreenFormModal>
    <InfoModal visible={repeatHelp} title={t("dataImport.ui.previouslyImported")} message={t("dataImport.ui.repeatHelp")} buttonLabel={t("dataImport.closeHelp")} onClose={() => setRepeatHelp(false)} />
  </View>;
}
