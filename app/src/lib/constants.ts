// App constants based on zmNinja analysis
export const ZM_CONSTANTS = {
  // HTTP timeouts
  httpTimeout: 10000,
  largeHttpTimeout: 30000,

  // Streaming and video
  defaultFPS: 3,
  maxFPS: 30,
  streamMaxFPS: 10, // Max FPS for montage/monitor streams
  safeImageQuality: 10,
  defaultMontageQuality: 50,
  maxMontageQuality: 70,

  // Scales for different views
  montageStreamScale: 50, // Scale percentage for montage streams
  monitorStreamScale: 40, // Scale percentage for single monitor view

  // Image dimensions
  thumbWidth: 200,
  eventImageWidth: 320,
  eventImageHeight: 240,
  eventMontageImageWidth: 300,
  eventMontageImageHeight: 200,

  // Timers and intervals
  eventCheckTime: 30000, // 30 seconds
  streamQueryStatusTime: 10000, // 10 sec
  alarmStatusTime: 10000, // 10 sec
  montageScaleFrequency: 300,
  packeryTimer: 500,
  loginInterval: 1800000, // 30 minutes
  streamReconnectDelay: 5000, // 5 seconds before allowing retry

  // Token management
  accessTokenLeewayMin: 5,
  refreshTokenLeewayMin: 10,
  accessTokenLeewayMs: 5 * 60 * 1000, // 5 minutes in milliseconds
  tokenCheckInterval: 60 * 1000, // Check every minute

  // Grid layout
  gridRowHeight: 100,
  gridMargin: 8,

  // Timeline
  timelineZoomMin: 60000, // 1 minute
  timelineZoomMax: 7 * 24 * 60 * 60 * 1000, // 1 week
} as const;

export const MONITOR_FUNCTIONS = ['None', 'Monitor', 'Modect', 'Record', 'Mocord', 'Nodect'] as const;

export const MONITOR_STATUS_COLORS = {
  checking: '#03A9F4',
  notRunning: '#F44336',
  pending: '#FF9800',
  running: '#4CAF50',
  error: '#795548',
} as const;
