import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { listHexColors } from "../repositories/hex-colors.repository";
import { createHexColor } from "../services/create-hex-color.service";
import { deleteHexColor } from "../services/delete-hex-color.service";
import { updateHexColor } from "../services/update-hex-color.service";
import type { HexColor, HexColorInput } from "../types/hex-color.types";

interface HexColorsContextValue {
  colors: HexColor[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  addColor: (input: HexColorInput) => HexColor;
  editColor: (id: string, input: Partial<HexColorInput>) => void;
  removeColor: (id: string) => void;
}

const HexColorsContext = createContext<HexColorsContextValue | null>(null);

export function HexColorsProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<HexColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      setColors(listHexColors());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load colors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addColor = useCallback(
    (input: HexColorInput) => {
      const created = createHexColor(input);
      refresh();
      return created;
    },
    [refresh],
  );

  const editColor = useCallback(
    (id: string, input: Partial<HexColorInput>) => {
      updateHexColor(id, input);
      refresh();
    },
    [refresh],
  );

  const removeColor = useCallback(
    (id: string) => {
      deleteHexColor(id);
      refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      colors,
      loading,
      error,
      refresh,
      addColor,
      editColor,
      removeColor,
    }),
    [colors, loading, error, refresh, addColor, editColor, removeColor],
  );

  return (
    <HexColorsContext.Provider value={value}>{children}</HexColorsContext.Provider>
  );
}

export function useHexColorsContext(): HexColorsContextValue {
  const context = useContext(HexColorsContext);
  if (!context) {
    throw new Error("useHexColors must be used within HexColorsProvider.");
  }
  return context;
}
