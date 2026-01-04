/**
 * ZoneMinder Protocol Constants
 *
 * These constants are defined by the ZoneMinder streaming protocol and control interface.
 * They represent the official ZoneMinder protocol values and should not be modified.
 *
 * References:
 * - ZoneMinder source: src/zms.cpp (streaming daemon)
 * - ZoneMinder source: web/includes/actions/control.php (control actions)
 * - ZoneMinder documentation: https://zoneminder.readthedocs.io/
 */

/**
 * ZMS Stream Command Codes
 *
 * Commands sent to the ZoneMinder Streaming Server (zms) to control playback,
 * navigation, and stream lifecycle.
 *
 * Used via: /index.php?view=request&request=stream&command=<code>&connkey=<key>
 */
export const ZMS_COMMANDS = {
  /** No command / idle */
  cmdNone: 0,

  /** Start/resume playback */
  cmdPlay: 1,

  /** Pause playback */
  cmdPause: 2,

  /** Stop playback */
  cmdStop: 3,

  /** Fast forward */
  cmdFastFwd: 4,

  /** Slow forward */
  cmdSlowFwd: 5,

  /** Slow reverse */
  cmdSlowRev: 6,

  /** Fast reverse */
  cmdFastRev: 7,

  /** Zoom in */
  cmdZoomIn: 8,

  /** Zoom out */
  cmdZoomOut: 9,

  /** Pan camera */
  cmdPan: 10,

  /** Scale stream */
  cmdScale: 11,

  /** Previous frame/event */
  cmdPrev: 12,

  /** Next frame/event */
  cmdNext: 13,

  /** Seek to position */
  cmdSeek: 14,

  /** Variable playback speed */
  cmdVarPlay: 15,

  /** Get single image */
  cmdGetImage: 16,

  /** Quit/close stream connection - IMPORTANT for cleanup */
  cmdQuit: 17,

  /** Query stream status */
  cmdQuery: 18,

  /** Set maximum FPS */
  cmdMaxFps: 19,
} as const;

/**
 * ZMS Stream Modes
 *
 * Defines the type of stream requested from zms.
 * Used as the 'mode' parameter in stream URLs.
 */
export const ZMS_MODES = {
  /** MJPEG stream - continuous multipart JPEG frames */
  jpeg: 'jpeg',

  /** Single frame snapshot - one JPEG image */
  single: 'single',

  /** Raw stream - direct camera stream (rarely used) */
  stream: 'stream',
} as const;

/**
 * Monitor Function States
 *
 * Valid states for a ZoneMinder monitor's function setting.
 * Determines how the monitor operates (disabled, recording, motion detection, etc.)
 */
export const ZM_MONITOR_FUNCTIONS = {
  /** Monitor is disabled */
  none: 'None',

  /** View only, no recording or analysis */
  monitor: 'Monitor',

  /** Motion detection only */
  modect: 'Modect',

  /** Continuous recording */
  record: 'Record',

  /** Continuous recording with motion detection */
  mocord: 'Mocord',

  /** External trigger only */
  nodect: 'Nodect',
} as const;

/**
 * Type-safe command values
 */
export type ZmsCommand = typeof ZMS_COMMANDS[keyof typeof ZMS_COMMANDS];
export type ZmsMode = typeof ZMS_MODES[keyof typeof ZMS_MODES];
export type ZmMonitorFunction = typeof ZM_MONITOR_FUNCTIONS[keyof typeof ZM_MONITOR_FUNCTIONS];
