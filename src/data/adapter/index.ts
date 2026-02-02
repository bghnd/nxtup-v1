import type { DataAdapter } from "./types";
import { mockAdapter } from "./mockAdapter";
import { supabaseAdapter } from "./supabaseAdapter";

function pickAdapter(): DataAdapter {
  const useSupabase = (import.meta.env.VITE_USE_SUPABASE as string | undefined) === "1";
  const hasEnv = Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
  if (useSupabase && hasEnv) return supabaseAdapter;
  return mockAdapter;
}

let adapter: DataAdapter = pickAdapter();
let adapterKind: "mock" | "supabase" = adapter === supabaseAdapter ? "supabase" : "mock";

export function getDataAdapter(): DataAdapter {
  return adapter;
}

export function setDataAdapter(next: DataAdapter) {
  adapter = next;
}

export function getAdapterKind(): "mock" | "supabase" {
  return adapterKind;
}

export function useMockAdapter() {
  adapter = mockAdapter;
  adapterKind = "mock";
}

export function useSupabaseAdapter() {
  adapter = supabaseAdapter;
  adapterKind = "supabase";
}





