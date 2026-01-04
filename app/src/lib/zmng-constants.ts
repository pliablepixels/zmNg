/**
 * zmNg Application Constants
 *
 * Centralized configuration values for the zmNg application.
 * Many values are derived from the original zmNinja application
 * to ensure consistent behavior and performance.
 *
 * For ZoneMinder protocol constants (commands, modes, etc.),
 * see zm-constants.ts
 */

/**
 * ZoneMinder Integration Constants
 *
 * Configuration values for interacting with ZoneMinder servers.
 * These are zmNg-specific settings, not ZM protocol values.
 */
export const ZM_INTEGRATION = {
  // HTTP timeouts for ZM API calls
  httpTimeout: 10000, // 10 seconds - standard API calls
  largeHttpTimeout: 30000, // 30 seconds - large responses (events, etc.)

  // Streaming and video performance
  defaultFps: 3, // Default FPS for event playback
  maxFps: 30, // Maximum FPS allowed
  streamMaxFps: 10, // Max FPS for live monitor streams (to reduce bandwidth)

  // Image quality settings
  safeImageQuality: 10, // Safe quality setting for bandwidth-constrained scenarios
  defaultMontageQuality: 50, // Default JPEG quality for montage view
  maxMontageQuality: 70, // Maximum quality for montage (balance quality/bandwidth)

  // Stream scale percentages
  montageStreamScale: 50, // Scale % for montage streams (reduces bandwidth)
  monitorStreamScale: 40, // Scale % for single monitor detail view

  // Image dimensions
  thumbWidth: 200, // Thumbnail width for event cards
  eventImageWidth: 320, // Event snapshot width
  eventImageHeight: 240, // Event snapshot height
  eventMontageImageWidth: 300, // Event montage tile width
  eventMontageImageHeight: 200, // Event montage tile height

  // Polling and status intervals
  eventCheckTime: 30000, // 30 sec - how often to check for new events
  streamQueryStatusTime: 10000, // 10 sec - stream status polling
  alarmStatusTime: 10000, // 10 sec - alarm status polling
  streamReconnectDelay: 5000, // 5 sec - wait before allowing stream reconnect

  // Token management
  accessTokenLeewayMin: 5, // Minutes before token expiry to refresh
  refreshTokenLeewayMin: 10, // Minutes before refresh token expiry
  accessTokenLeewayMs: 5 * 60 * 1000, // 5 minutes in milliseconds
  tokenCheckInterval: 60 * 1000, // Check token status every minute
  loginInterval: 1800000, // 30 minutes - re-login interval
} as const;

/**
 * Grid Layout Constants
 *
 * Used by Dashboard and Montage views for responsive grid layouts.
 * Based on react-grid-layout configuration.
 */
export const GRID_LAYOUT = {
  // Grid columns (12-column system for responsive layout)
  cols: 12,

  // Row height in pixels (dashboard cards)
  rowHeight: 100,

  // Margin between grid items in pixels
  margin: 16,

  // Minimum card width in grid units
  minCardWidth: 50,

  // Montage-specific row height (more compact for many monitors)
  montageRowHeight: 10,

  // Grid calculation frequencies
  montageScaleFrequency: 300, // How often to recalculate montage scales (ms)
  packeryTimer: 500, // Delay for packery layout recalculation (ms)
} as const;

/**
 * Sidebar Navigation Constants
 *
 * Dimensions and behavior for the collapsible sidebar navigation.
 */
export const SIDEBAR_NAV = {
  // Minimum width when collapsed (icon-only mode)
  minWidth: 60,

  // Maximum width when expanded
  maxWidth: 256,

  // Default width on first load
  defaultWidth: 180,
} as const;

/**
 * Timeline Widget Constants
 *
 * Configuration for the timeline view zoom and display.
 */
export const TIMELINE = {
  // Minimum zoom level (1 minute)
  zoomMin: 60000,

  // Maximum zoom level (1 week)
  zoomMax: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Notification Service Constants
 *
 * Configuration for the WebSocket notification service.
 */
export const NOTIFICATIONS_SERVICE = {
  // Default port for ZM notification server
  defaultPort: 9000,

  // Maximum events to keep in notification history
  maxEvents: 100,

  // Delay before attempting reconnection (ms)
  reconnectDelay: 5000,
} as const;

/**
 * Bootstrap and Initialization Timeouts
 *
 * Timeouts for profile initialization and server connection.
 */
export const BOOTSTRAP_TIMEOUTS = {
  // Timeout for each bootstrap step (auth, timezone, etc.)
  stepTimeoutMs: 8000,

  // Total timeout for entire bootstrap process
  totalTimeoutMs: 20000,
} as const;

/**
 * API Pagination Limits
 *
 * Limits for paginated API responses to prevent excessive data fetching.
 */
export const API_PAGINATION = {
  // Maximum pages to fetch for events (prevents infinite loops)
  maxEventPages: 10,

  // Events per page (ZM API default)
  eventsPerPage: 100,

  // Total max events = maxEventPages * eventsPerPage = 1000
} as const;

/**
 * Development Proxy Server Configuration
 *
 * DEVELOPMENT ONLY: Used by the local proxy server for CORS bypass during development.
 * Not used in production builds.
 */
export const DEV_PROXY = {
  // Local proxy server port (only used in dev mode)
  port: 3001,

  // Mock notification server port (for testing without ZM)
  mockNotificationPort: 9000,
} as const;

/**
 * Monitor Status Color Mappings
 *
 * Color codes for monitor status indicators in the UI.
 */
export const MONITOR_STATUS_COLORS = {
  checking: '#03A9F4', // Blue - checking status
  notRunning: '#F44336', // Red - monitor not running
  pending: '#FF9800', // Orange - pending state
  running: '#4CAF50', // Green - running normally
  error: '#795548', // Brown - error state
} as const;

/**
 * Valid ZoneMinder Monitor Functions
 *
 * NOTE: These are duplicated from zm-constants for backward compatibility.
 * New code should import from zm-constants.ts instead.
 *
 * @deprecated Use ZM_MONITOR_FUNCTIONS from zm-constants.ts
 */
export const MONITOR_FUNCTIONS = ['None', 'Monitor', 'Modect', 'Record', 'Mocord', 'Nodect'] as const;
