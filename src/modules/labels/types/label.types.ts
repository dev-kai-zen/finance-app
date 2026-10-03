export interface Label {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount?: number;
}

export type NewLabel = Omit<Label, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface CreateLabelInput {
  name: string;
  color?: string | null;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string | null;
  sortOrder?: number;
  isArchived?: boolean;
}

export interface LabelBadgeItem {
  id: string;
  name: string;
  color: string | null;
}
