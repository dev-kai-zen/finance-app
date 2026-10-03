// Components
export { LabelBadge } from "./components/label-badge";
export { LabelPickerModal } from "./components/label-picker-modal";
export { LabelsManagerModal } from "./components/labels-manager-modal";
export { LabelFormModal } from "./components/label-form-modal";

// Hooks
export { useLabels } from "./hooks/use-labels";
export { useLabelMutations } from "./hooks/use-label-mutations";

// Services (Public cross-module interface)
export { createLabel } from "./services/create-label.service";
export { updateLabel } from "./services/update-label.service";
export { deleteLabel } from "./services/delete-label.service";
export { reorderLabels } from "./services/reorder-labels.service";
export { assignTransactionLabels } from "./services/assign-transaction-labels.service";
export {
  getLabelsByTransactionIds,
  getLabelsForTransaction,
} from "./services/get-transaction-labels.service";

// Repositories
export {
  listLabels,
  findLabelById,
  findLabelByName,
} from "./repositories/labels.repository";

// Types
export type {
  Label,
  NewLabel,
  CreateLabelInput,
  UpdateLabelInput,
  LabelBadgeItem,
} from "./types/label.types";
