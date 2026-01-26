/**
 * Event Cause Icon Mapping
 *
 * Maps event causes from ZoneMinder to Lucide icons.
 * Used to display visual icons next to event cause text.
 */

import { Move, Bell, Wifi, Link, Hand, Video, Circle, type LucideIcon } from 'lucide-react';

/**
 * Maps common ZoneMinder event causes to appropriate icons.
 * Keys are case-sensitive and match ZoneMinder's Cause field values.
 */
const causeIconMap: Record<string, LucideIcon> = {
  Motion: Move,
  Alarm: Bell,
  Signal: Wifi,
  Linked: Link,
  'Forced Web': Hand,
  Continuous: Video,
};

/**
 * Returns the appropriate icon component for an event cause.
 * Falls back to Circle for unknown causes.
 *
 * Matching logic:
 * 1. Exact match (e.g., "Motion" → Motion icon)
 * 2. Prefix match (e.g., "Motion:All" or "Motion:Person" → Motion icon)
 * 3. Fallback to Circle for unknown causes
 *
 * @param cause - The event cause string from ZoneMinder
 * @returns The Lucide icon component for the cause
 */
export function getEventCauseIcon(cause: string): LucideIcon {
  // Try exact match first
  if (causeIconMap[cause]) {
    return causeIconMap[cause];
  }

  // Try prefix match (e.g., "Motion:All" matches "Motion")
  for (const [key, icon] of Object.entries(causeIconMap)) {
    if (cause.startsWith(key)) {
      return icon;
    }
  }

  return Circle;
}

/**
 * Checks if a cause has a specific icon (not the fallback).
 *
 * @param cause - The event cause string
 * @returns True if the cause has a mapped icon
 */
export function hasSpecificCauseIcon(cause: string): boolean {
  if (cause in causeIconMap) {
    return true;
  }
  // Check prefix match
  return Object.keys(causeIconMap).some(key => cause.startsWith(key));
}
