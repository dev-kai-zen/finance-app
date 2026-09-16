import { useCallback, useEffect, useState } from "react";
import { listHexColors } from "../repositories/hex-colors.repository";
import { createHexColor } from "../services/create-hex-color.service";
import { deleteHexColor } from "../services/delete-hex-color.service";
import { updateHexColor } from "../services/update-hex-color.service";
import type { HexColor, HexColorInput } from "../types/hex-color.types";

export function useHexColors() {
  const [colors, setColors] = useState<HexColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const data = listHexColors();
      setColors(data);
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

  return {
    colors,
    loading,
    error,
    refresh,
    addColor,
    editColor,
    removeColor,
  };
}
