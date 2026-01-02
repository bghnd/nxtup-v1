export type DisplayPrefs = {
  showPriority: boolean;
  showDueDate: boolean;
  showChecklist: boolean;
  showComments: boolean;
};

export const DISPLAY_KEY = "nxtup.board.display.v1";

export function loadDisplayPrefs(): DisplayPrefs {
  try {
    const raw = localStorage.getItem(DISPLAY_KEY);
    if (raw) return JSON.parse(raw) as DisplayPrefs;
  } catch {
    // ignore
  }
  // Default to "dense", but remember the user's last-used settings via localStorage.
  return { showPriority: false, showDueDate: false, showChecklist: false, showComments: false };
}



