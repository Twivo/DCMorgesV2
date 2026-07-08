import type { EventItem } from "./types";
import data from "./events.json";

// Agenda sorted chronologically (soonest first) by ISO date so upcoming events
// lead, regardless of insertion order.
export const events = (data as EventItem[])
  .slice()
  .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

// "Today" is resolved at build time (the public site is static and rebuilt when
// content changes). Events without a valid date are treated as upcoming.
const today = new Date().toISOString().slice(0, 10);

/** Upcoming events, soonest first. */
export const upcomingEvents = events.filter((event) => (event.date ?? "9999") >= today);

/** Past events, most recent first. */
export const pastEvents = events.filter((event) => (event.date ?? "9999") < today).reverse();
