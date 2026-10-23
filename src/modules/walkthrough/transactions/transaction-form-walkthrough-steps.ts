import type { WalkthroughStep } from "../types/walkthrough.types";

export interface TransactionFormWalkthroughOptions {
  showPresets?: boolean;
  showCustomize?: boolean;
  showName?: boolean;
  showAttachment?: boolean;
  showTime?: boolean;
  isTransfer?: boolean;
  showSplit?: boolean;
  showLabels?: boolean;
  showNote?: boolean;
}

export function getTransactionFormWalkthroughSteps(
  options: TransactionFormWalkthroughOptions = {},
): WalkthroughStep[] {
  const {
    showPresets = true,
    showCustomize = true,
    showName = true,
    showAttachment = true,
    showTime = true,
    isTransfer = false,
    showSplit = true,
    showLabels = true,
    showNote = true,
  } = options;

  const steps: WalkthroughStep[] = [];

  if (showPresets) {
    steps.push({
      id: "txFormPresets",
      targetId: "txFormPresets",
      titleKey: "transactionFormWalkthrough.stepPresetsTitle",
      descKey: "transactionFormWalkthrough.stepPresetsDesc",
    });
  }

  if (showCustomize) {
    steps.push({
      id: "txFormCustomize",
      targetId: "txFormCustomize",
      titleKey: "transactionFormWalkthrough.stepCustomizeTitle",
      descKey: "transactionFormWalkthrough.stepCustomizeDesc",
    });
  }

  steps.push({
    id: "txFormTypePicker",
    targetId: "txFormTypePicker",
    titleKey: "transactionFormWalkthrough.stepTypePickerTitle",
    descKey: "transactionFormWalkthrough.stepTypePickerDesc",
  });

  if (showName) {
    steps.push({
      id: "txFormName",
      targetId: "txFormName",
      titleKey: "transactionFormWalkthrough.stepNameTitle",
      descKey: "transactionFormWalkthrough.stepNameDesc",
    });
  }

  if (showAttachment) {
    steps.push({
      id: "txFormAttachment",
      targetId: "txFormAttachment",
      titleKey: "transactionFormWalkthrough.stepAttachmentTitle",
      descKey: "transactionFormWalkthrough.stepAttachmentDesc",
    });
  }

  steps.push({
    id: "txFormDate",
    targetId: "txFormDate",
    titleKey: "transactionFormWalkthrough.stepDateTitle",
    descKey: "transactionFormWalkthrough.stepDateDesc",
  });

  if (showTime) {
    steps.push({
      id: "txFormTime",
      targetId: "txFormTime",
      titleKey: "transactionFormWalkthrough.stepTimeTitle",
      descKey: "transactionFormWalkthrough.stepTimeDesc",
    });
  }

  steps.push({
    id: "txFormAmount",
    targetId: "txFormAmount",
    titleKey: "transactionFormWalkthrough.stepAmountTitle",
    descKey: "transactionFormWalkthrough.stepAmountDesc",
  });

  if (!isTransfer) {
    steps.push({
      id: "txFormCurrency",
      targetId: "txFormCurrency",
      titleKey: "transactionFormWalkthrough.stepCurrencyTitle",
      descKey: "transactionFormWalkthrough.stepCurrencyDesc",
    });
  }

  steps.push({
    id: "txFormAccount",
    targetId: "txFormAccount",
    titleKey: "transactionFormWalkthrough.stepAccountTitle",
    descKey: "transactionFormWalkthrough.stepAccountDesc",
  });

  if (!isTransfer) {
    steps.push({
      id: "txFormCategory",
      targetId: "txFormCategory",
      titleKey: "transactionFormWalkthrough.stepCategoryTitle",
      descKey: "transactionFormWalkthrough.stepCategoryDesc",
    });

    if (showSplit) {
      steps.push({
        id: "txFormSplit",
        targetId: "txFormSplit",
        titleKey: "transactionFormWalkthrough.stepSplitTitle",
        descKey: "transactionFormWalkthrough.stepSplitDesc",
      });
    }
  }

  if (showLabels) {
    steps.push({
      id: "txFormLabels",
      targetId: "txFormLabels",
      titleKey: "transactionFormWalkthrough.stepLabelsTitle",
      descKey: "transactionFormWalkthrough.stepLabelsDesc",
    });
  }

  if (showNote) {
    steps.push({
      id: "txFormNote",
      targetId: "txFormNote",
      titleKey: "transactionFormWalkthrough.stepNoteTitle",
      descKey: "transactionFormWalkthrough.stepNoteDesc",
    });
  }

  steps.push({
    id: "txFormCancel",
    targetId: "txFormCancel",
    titleKey: "transactionFormWalkthrough.stepCancelTitle",
    descKey: "transactionFormWalkthrough.stepCancelDesc",
  });

  steps.push({
    id: "txFormSave",
    targetId: "txFormSave",
    titleKey: "transactionFormWalkthrough.stepSaveTitle",
    descKey: "transactionFormWalkthrough.stepSaveDesc",
  });

  steps.push({
    id: "txFormClose",
    targetId: "txFormClose",
    titleKey: "transactionFormWalkthrough.stepCloseTitle",
    descKey: "transactionFormWalkthrough.stepCloseDesc",
  });

  return steps;
}

export const TRANSACTION_FORM_WALKTHROUGH_STEPS: WalkthroughStep[] =
  getTransactionFormWalkthroughSteps();
