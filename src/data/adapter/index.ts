import type { DataAdapter } from "./types";
import { mockAdapter } from "./mockAdapter";
import { supabaseAdapter } from "./supabaseAdapter";

// Start in mock mode; optional Supabase auth can switch this at runtime.
let adapter: DataAdapter = mockAdapter;

export function getDataAdapter(): DataAdapter {
  return adapter;
}

export function setDataAdapter(next: DataAdapter) {
  adapter = next;
}

export function useMockAdapter() {
  adapter = mockAdapter;
}

export function useSupabaseAdapter() {
  adapter = supabaseAdapter;
}

export function getAdapterKind(): "mock" | "supabase" {
  return adapter === supabaseAdapter ? "supabase" : "mock";
}




