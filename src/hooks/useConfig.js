import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function useConfig() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    invoke("get_config")
      .then(setConfig)
      .catch((err) => console.error("Failed to load config:", err));
  }, []);

  const saveConfig = useCallback(async (newConfig) => {
    try {
      await invoke("save_config", { config: newConfig });
      setConfig(newConfig);
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  }, []);

  return { config, saveConfig };
}
