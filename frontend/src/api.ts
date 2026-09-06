export interface ModelInfo {
  name: str;
  type: string | null;
  available: boolean;
}

const API_BASE = "http://localhost:8000/api";

export const api = {
  getSetupStatus: async () => {
    const res = await fetch(`${API_BASE}/models/setup-status`);
    if (!res.ok) throw new Error("Failed to fetch setup status");
    return res.json();
  },
  
  getModels: async () => {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) throw new Error("Failed to fetch models");
    return res.json();
  },
  
  getConfig: async () => {
    const res = await fetch(`${API_BASE}/models/config`);
    if (!res.ok) throw new Error("Failed to fetch config");
    return res.json();
  },
  
  saveConfig: async (models: {name: string, type: string}[]) => {
    const res = await fetch(`${API_BASE}/models/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ models })
    });
    if (!res.ok) throw new Error("Failed to save config");
    return res.json();
  }
};
