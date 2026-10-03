import { useState } from "react";
import { createLabel } from "../services/create-label.service";
import { updateLabel } from "../services/update-label.service";
import { deleteLabel } from "../services/delete-label.service";
import { reorderLabels } from "../services/reorder-labels.service";
import type { CreateLabelInput, Label, UpdateLabelInput } from "../types/label.types";

export function useLabelMutations(onSuccess?: () => void) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (input: CreateLabelInput): Promise<Label | null> => {
    setSubmitting(true);
    setError(null);
    try {
      const created = createLabel(input);
      onSuccess?.();
      return created;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create label.";
      setError(msg);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, input: UpdateLabelInput): Promise<Label | null> => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = updateLabel(id, input);
      onSuccess?.();
      return updated;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update label.";
      setError(msg);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      deleteLabel(id);
      onSuccess?.();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete label.";
      setError(msg);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleReorder = async (orderedIds: string[]): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      reorderLabels(orderedIds);
      onSuccess?.();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to reorder labels.";
      setError(msg);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitting,
    error,
    createLabel: handleCreate,
    updateLabel: handleUpdate,
    deleteLabel: handleDelete,
    reorderLabels: handleReorder,
  };
}
