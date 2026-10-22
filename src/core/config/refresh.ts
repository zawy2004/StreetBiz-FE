/**
 * How often a screen that is open and visible asks the server again. Work queues (what a person has
 * to act on) refresh faster than overviews (counts and charts). Polling stops while the tab is hidden
 * (React Query's default), and a hidden tab refreshes what is stale when it is shown again.
 * Live push (SignalR) is used instead where it exists: orders and chat.
 */
export const QUEUE_REFRESH_MS = 30_000;
export const OVERVIEW_REFRESH_MS = 60_000;

/**
 * Who holds or rents a slot changes under the user's eyes (another vendor takes a hold, the ward
 * decides an application), and a stale "available" sends them down a path that ends in a 409. The
 * server refuses the double booking either way; this keeps what is shown close to what is true.
 */
export const SLOT_REFRESH_MS = 15_000;
