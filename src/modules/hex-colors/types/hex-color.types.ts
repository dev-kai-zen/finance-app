export interface HexColor {
  id: string;
  name: string;
  hex: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NewHexColor = {
  id?: string;
  name: string;
  hex: string;
  isSystem?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface HexColorInput {
  name: string;
  hex: string;
}

export interface HexColorUsageCount {
  accountTypes: number;
  categories: number;
  total: number;
}
