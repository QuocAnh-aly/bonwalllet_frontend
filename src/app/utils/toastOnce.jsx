/**
 * Session-based toast deduplication.
 * Tracks which toasts have been shown in the current browser tab session
 * (resets on page refresh, not on navigation).
 *
 * Usage:
 *   import { shouldShowToast } from '../../utils/toastOnce';
 *   if (shouldShowToast(`budget-over:${b.id}`)) {
 *     toast.error(`"${b.name}" đã vượt hạn mức!`);
 *   }
 */

const sessionShownKeys = new Set();

/**
 * Check if a toast with the given key should be shown.
 * Returns true only once per key per session.
 * @param {string} key - Unique key for this toast (e.g., `budget-over:17`)
 * @returns {boolean} - true if toast should be shown (first time), false if already shown
 */
export function shouldShowToast(key) {
  if (sessionShownKeys.has(key)) return false;
  sessionShownKeys.add(key);
  return true;
}

/**
 * Check if a toast has already been shown (read-only, doesn't mark). 
 * Useful when you want to conditionally render something based on toast state.
 */
export function isToastShown(key) {
  return sessionShownKeys.has(key);
}

/**
 * Clear all remembered toasts (useful on logout).
 */
export function clearToastHistory() {
  sessionShownKeys.clear();
}
