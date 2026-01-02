import type { DataAdapter } from "./types";
import { mockAdapter } from "./mockAdapter";

let adapter: DataAdapter = mockAdapter;

export function getDataAdapter(): DataAdapter {
  return adapter;
}

export function setDataAdapter(next: DataAdapter) {
  adapter = next;
}




