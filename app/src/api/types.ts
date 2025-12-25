import { z } from 'zod';
import { log, LogLevel } from '../lib/logger';

// Authentication types
export const LoginResponseSchema = z.object({
  access_token: z.string().optional(),
  access_token_expires: z.number().optional(),
  refresh_token: z.string().optional(),
  refresh_token_expires: z.number().optional(),
  credentials: z.string().optional(),
  append_password: z.number().optional(),
  version: z.string().optional(),
  apiversion: z.string().optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// Version types
export const VersionResponseSchema = z.object({
  version: z.string(),
  apiversion: z.string(),
});

export type VersionResponse = z.infer<typeof VersionResponseSchema>;

// Host types
export const HostTimeZoneResponseSchema = z.object({
  DateTime: z.object({
    TimeZone: z.string().optional(),
    Timezone: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
  dateTime: z.object({
    TimeZone: z.string().optional(),
    Timezone: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
  // Support root level keys
  TimeZone: z.string().optional(),
  Timezone: z.string().optional(),
  timezone: z.string().optional(),
  tz: z.string().optional(),
}).transform((data) => {
  // Check nested first
  const dt = data.DateTime || data.dateTime;
  let tz = dt ? (dt.TimeZone || dt.Timezone || dt.timezone) : undefined;

  // If not nested, check root
  if (!tz) {
    tz = data.TimeZone || data.Timezone || data.timezone || data.tz;
  }

  if (!tz) {
    // Log the actual data to help debugging if this fails
    log.api('HostTimeZoneResponseSchema validation failed', LogLevel.WARN, { receivedData: JSON.stringify(data) });
    throw new Error('Response missing TimeZone field (checked root and DateTime object)');
  }

  return {
    DateTime: {
      TimeZone: tz
    }
  };
});

export type HostTimeZoneResponse = z.infer<typeof HostTimeZoneResponseSchema>;

// Monitor types
export const MonitorStatusSchema = z.object({
  MonitorId: z.coerce.string().nullable(),
  Status: z.coerce.string().nullable(),
  CaptureFPS: z.coerce.string().nullable().optional(),
  AnalysisFPS: z.coerce.string().nullable().optional(),
  CaptureBandwidth: z.coerce.string().nullable().optional(),
});

export const MonitorSchema = z.object({
  Id: z.coerce.string(),
  Name: z.string(),
  Notes: z.string().nullable().optional(),
  Deleted: z.boolean().optional(),
  ServerId: z.coerce.string().nullable(),
  StorageId: z.coerce.string().nullable(),
  Type: z.string(),
  Function: z.enum(['None', 'Monitor', 'Modect', 'Record', 'Mocord', 'Nodect']),
  Enabled: z.coerce.string(),
  LinkedMonitors: z.string().nullable(),
  Triggers: z.string().nullable(),
  Device: z.string().nullable(),
  Channel: z.coerce.string().nullable(),
  Format: z.coerce.string().nullable(),
  V4LMultiBuffer: z.string().nullable(),
  V4LCapturesPerFrame: z.coerce.string().nullable(),
  Protocol: z.string().nullable(),
  Method: z.string().nullable(),
  Host: z.string().nullable(),
  Port: z.string().nullable(),
  SubPath: z.string().nullable(),
  Path: z.string().nullable(),
  Options: z.string().nullable(),
  User: z.string().nullable(),
  Pass: z.string().nullable(),
  Width: z.coerce.string(),
  Height: z.coerce.string(),
  Colours: z.coerce.string(),
  Palette: z.coerce.string().nullable(),
  Orientation: z.string().nullable(),
  Deinterlacing: z.coerce.string().nullable(),
  DecoderHWAccelName: z.string().nullable(),
  DecoderHWAccelDevice: z.string().nullable(),
  SaveJPEGs: z.coerce.string().nullable(),
  VideoWriter: z.coerce.string().nullable(),
  EncoderParameters: z.string().nullable(),
  RecordAudio: z.coerce.string().nullable(),
  RTSPDescribe: z.coerce.string().nullable(),
  Brightness: z.coerce.number().nullable(),
  Contrast: z.coerce.number().nullable(),
  Hue: z.coerce.number().nullable(),
  Colour: z.coerce.number().nullable(),
  EventPrefix: z.string().nullable(),
  LabelFormat: z.string().nullable(),
  LabelX: z.coerce.string().nullable(),
  LabelY: z.coerce.string().nullable(),
  LabelSize: z.coerce.string().nullable(),
  ImageBufferCount: z.coerce.string(),
  WarmupCount: z.coerce.string(),
  PreEventCount: z.coerce.string(),
  PostEventCount: z.coerce.string(),
  StreamReplayBuffer: z.coerce.string(),
  AlarmFrameCount: z.coerce.string(),
  SectionLength: z.coerce.string(),
  MinSectionLength: z.coerce.string(),
  FrameSkip: z.coerce.string(),
  MotionFrameSkip: z.coerce.string(),
  AnalysisFPSLimit: z.string().nullable(),
  AnalysisUpdateDelay: z.coerce.string(),
  MaxFPS: z.string().nullable(),
  AlarmMaxFPS: z.string().nullable(),
  FPSReportInterval: z.coerce.string(),
  RefBlendPerc: z.coerce.string(),
  AlarmRefBlendPerc: z.coerce.string(),
  Controllable: z.coerce.string(),
  ControlId: z.coerce.string().nullable(),
  ControlDevice: z.string().nullable(),
  ControlAddress: z.string().nullable(),
  AutoStopTimeout: z.string().nullable(),
  TrackMotion: z.coerce.string().nullable(),
  TrackDelay: z.coerce.string().nullable(),
  ReturnLocation: z.coerce.string().nullable(),
  ReturnDelay: z.coerce.string().nullable(),
  ModectDuringPTZ: z.coerce.string().nullable(),
  DefaultRate: z.coerce.string(),
  DefaultScale: z.union([z.string(), z.number()]).transform(String),
  SignalCheckPoints: z.coerce.string().nullable(),
  SignalCheckColour: z.string(),
  WebColour: z.string(),
  Exif: z.coerce.string().nullable(),
  Sequence: z.coerce.string().nullable(),
  ZoneCount: z.coerce.number(),
  Refresh: z.string().nullable(),
  DefaultCodec: z.string().nullable(),
  GroupIds: z.coerce.string().nullable().optional(),
  Latitude: z.coerce.number().nullable(),
  Longitude: z.coerce.number().nullable(),
  RTSPServer: z.coerce.string().nullable(),
  RTSPStreamName: z.string().nullable(),
  Importance: z.string().nullable(),
});

export const MonitorDataSchema = z.object({
  Monitor: MonitorSchema,
  Monitor_Status: MonitorStatusSchema.optional(),
});

export const MonitorsResponseSchema = z.object({
  monitors: z.array(MonitorDataSchema),
});

export type Monitor = z.infer<typeof MonitorSchema>;
export type MonitorStatus = z.infer<typeof MonitorStatusSchema>;
export type MonitorData = z.infer<typeof MonitorDataSchema>;
export type MonitorsResponse = z.infer<typeof MonitorsResponseSchema>;

// Monitor update response (for updateMonitor endpoint)
export const MonitorUpdateResponseSchema = z.object({
  monitor: MonitorDataSchema,
});

export type MonitorUpdateResponse = z.infer<typeof MonitorUpdateResponseSchema>;

// Monitor alarm status response (for getAlarmStatus and alarm control endpoints)
// ZM alarm() function returns different structures based on command and success/failure:
// - Success with 'status' command: { status: number, output: number }
// - Success with 'on'/'off' commands: { status: string, output: string }
// - Error: { status: 'false', code: number, error: string }
export const AlarmStatusResponseSchema = z.object({
  status: z.union([z.string(), z.coerce.number()]),
  output: z.union([z.string(), z.coerce.number()]).optional(),
  // Error response fields
  code: z.coerce.number().optional(),
  error: z.string().optional(),
});

export type AlarmStatusResponse = z.infer<typeof AlarmStatusResponseSchema>;

// Monitor daemon status response (for getDaemonStatus endpoint)
// ZM daemonControl() returns: { status: 'ok', statustext: string }
export const DaemonStatusResponseSchema = z.object({
  status: z.string(),
  statustext: z.string().optional(), // The actual status message
});

export type DaemonStatusResponse = z.infer<typeof DaemonStatusResponseSchema>;

export const ZMControlSchema = z.object({
  Id: z.coerce.string(),
  Name: z.string(),
  Type: z.string(),
  Protocol: z.string().nullable(),
  CanWake: z.coerce.string().optional(),
  CanSleep: z.coerce.string().optional(),
  CanReset: z.coerce.string().optional(),
  CanReboot: z.coerce.string().optional(),
  CanZoom: z.coerce.string().optional(),
  CanAutoZoom: z.coerce.string().optional(),
  CanZoomAbs: z.coerce.string().optional(),
  CanZoomRel: z.coerce.string().optional(),
  CanZoomCon: z.coerce.string().optional(),
  HasZoomSpeed: z.coerce.string().optional(),
  CanFocus: z.coerce.string().optional(),
  CanAutoFocus: z.coerce.string().optional(),
  CanFocusAbs: z.coerce.string().optional(),
  CanFocusRel: z.coerce.string().optional(),
  CanFocusCon: z.coerce.string().optional(),
  HasFocusSpeed: z.coerce.string().optional(),
  CanIris: z.coerce.string().optional(),
  CanAutoIris: z.coerce.string().optional(),
  CanIrisAbs: z.coerce.string().optional(),
  CanIrisRel: z.coerce.string().optional(),
  CanIrisCon: z.coerce.string().optional(),
  HasIrisSpeed: z.coerce.string().optional(),
  CanGain: z.coerce.string().optional(),
  CanAutoGain: z.coerce.string().optional(),
  CanGainAbs: z.coerce.string().optional(),
  CanGainRel: z.coerce.string().optional(),
  CanGainCon: z.coerce.string().optional(),
  HasGainSpeed: z.coerce.string().optional(),
  CanWhite: z.coerce.string().optional(),
  CanAutoWhite: z.coerce.string().optional(),
  CanWhiteAbs: z.coerce.string().optional(),
  CanWhiteRel: z.coerce.string().optional(),
  CanWhiteCon: z.coerce.string().optional(),
  HasWhiteSpeed: z.coerce.string().optional(),
  HasPresets: z.coerce.string().optional(),
  NumPresets: z.coerce.string().optional(),
  HasHomePreset: z.coerce.string().optional(),
  CanSetPresets: z.coerce.string().optional(),
  CanMove: z.coerce.string().optional(),
  CanMoveDiag: z.coerce.string().optional(),
  CanMoveMap: z.coerce.string().optional(),
  CanMoveAbs: z.coerce.string().optional(),
  CanMoveRel: z.coerce.string().optional(),
  CanMoveCon: z.coerce.string().optional(),
  CanPan: z.coerce.string().optional(),
  HasPanSpeed: z.coerce.string().optional(),
  HasTurboPan: z.coerce.string().optional(),
  CanTilt: z.coerce.string().optional(),
  HasTiltSpeed: z.coerce.string().optional(),
  HasTurboTilt: z.coerce.string().optional(),
  CanAutoScan: z.coerce.string().optional(),
  NumScanPaths: z.coerce.string().optional(),
});

export const ControlDataSchema = z.object({
  control: z.object({
    Control: ZMControlSchema
  })
});

export type ZMControl = z.infer<typeof ZMControlSchema>;
export type ControlData = z.infer<typeof ControlDataSchema>;

// Event types
// Force re-bundle
export const EventSchema = z.object({
  Id: z.coerce.string(),
  MonitorId: z.coerce.string(),
  StorageId: z.coerce.string().nullable(),
  SecondaryStorageId: z.coerce.string().nullable(),
  Name: z.string(),
  Cause: z.string(),
  StartDateTime: z.string(),
  EndDateTime: z.string().nullable(),
  Width: z.coerce.string(),
  Height: z.coerce.string(),
  Length: z.coerce.string(),
  Frames: z.coerce.string(),
  AlarmFrames: z.coerce.string(),
  AlarmFrameId: z.coerce.string().optional(),  // First alarm frame ID
  MaxScoreFrameId: z.coerce.string().optional(),  // Frame with highest score
  DefaultVideo: z.string().nullable(),
  SaveJPEGs: z.coerce.string().nullable(),
  TotScore: z.coerce.string(),
  AvgScore: z.coerce.string(),
  MaxScore: z.coerce.string(),
  Archived: z.coerce.string(),
  Videoed: z.coerce.string(),
  Uploaded: z.coerce.string(),
  Emailed: z.coerce.string(),
  Messaged: z.coerce.string(),
  Executed: z.coerce.string(),
  Notes: z.string().nullable(),
  StateId: z.coerce.string().nullable(),
  Orientation: z.string().nullable(),
  DiskSpace: z.coerce.string().nullable(),
  Scheme: z.string().nullable(),
});

export const EventDataSchema = z.object({
  Event: EventSchema,
});

export const EventsResponseSchema = z.object({
  events: z.array(EventDataSchema),
  pagination: z.object({
    pageCount: z.number(),
    page: z.number(),
    current: z.number(),
    count: z.number(),
    prevPage: z.boolean(),
    nextPage: z.boolean(),
    limit: z.number(),
  }),
});

export type Event = z.infer<typeof EventSchema>;
export type EventData = z.infer<typeof EventDataSchema>;
export type EventsResponse = z.infer<typeof EventsResponseSchema>;

// Single event response (for getEvent endpoint)
export const EventResponseSchema = z.object({
  event: EventDataSchema,
});

export type EventResponse = z.infer<typeof EventResponseSchema>;

// Console events response (for getConsoleEvents endpoint)
// API can return either an object (record) or an array, so we handle both
export const ConsoleEventsResponseSchema = z.object({
  results: z.union([
    z.record(z.string(), z.coerce.number()),
    z.array(z.unknown()),
  ]).optional(),
});

export type ConsoleEventsResponse = z.infer<typeof ConsoleEventsResponseSchema>;

// Config types
export const ConfigSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Value: z.string(),
  Type: z.string(),
  DefaultValue: z.string(),
  Hint: z.string().nullable(),
  Pattern: z.string().nullable(),
  Format: z.string().nullable(),
  Prompt: z.string().nullable(),
  Help: z.string().nullable(),
  Category: z.string(),
  Readonly: z.string().nullable(),
  Requires: z.string().nullable(),
});

export const ConfigDataSchema = z.object({
  Config: ConfigSchema,
});

export const ConfigsResponseSchema = z.object({
  configs: z.array(ConfigDataSchema),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ConfigData = z.infer<typeof ConfigDataSchema>;
export type ConfigsResponse = z.infer<typeof ConfigsResponseSchema>;

// ZMS Path response schema for fetching ZM_PATH_ZMS config
export const ZmsPathResponseSchema = z.object({
  config: z.object({
    Value: z.string(),
  }),
});

export type ZmsPathResponse = z.infer<typeof ZmsPathResponseSchema>;

// ZoneMinder server log types
export const ZMLogSchema = z.object({
  Id: z.coerce.number(),
  TimeKey: z.string(),
  Component: z.string(),
  ServerId: z.coerce.number().nullable(),
  Pid: z.coerce.number().nullable(),
  Level: z.coerce.number(),
  Code: z.string(),
  Message: z.string(),
  File: z.string().nullable(),
  Line: z.coerce.number().nullable(),
});

export const ZMLogDataSchema = z.object({
  Log: ZMLogSchema,
});

export const ZMLogsResponseSchema = z.object({
  logs: z.array(ZMLogDataSchema),
  pagination: z.object({
    page: z.number(),
    current: z.number(),
    count: z.number(),
    prevPage: z.boolean(),
    nextPage: z.boolean(),
    pageCount: z.number(),
    order: z.record(z.string(), z.string()).optional(),
    limit: z.number(),
    options: z.object({
      conditions: z.array(z.unknown()),
    }).optional(),
    paramType: z.string().optional(),
    queryScope: z.unknown().nullable().optional(),
  }),
});

export type ZMLog = z.infer<typeof ZMLogSchema>;
export type ZMLogData = z.infer<typeof ZMLogDataSchema>;
export type ZMLogsResponse = z.infer<typeof ZMLogsResponseSchema>;

// State types
export const StateSchema = z.object({
  Id: z.coerce.string(),
  Name: z.string(),
  Definition: z.string(),
  IsActive: z.coerce.string(),
});

export const StateDataSchema = z.object({
  State: z.object({
    Id: z.coerce.number(),
    Name: z.string(),
    Definition: z.string(),
    IsActive: z.coerce.number(),
  }),
});

export const StatesResponseSchema = z.object({
  states: z.array(StateDataSchema).optional(),
});

export type State = z.infer<typeof StateSchema>;
export type StateData = z.infer<typeof StateDataSchema>;
export type StatesResponse = z.infer<typeof StatesResponseSchema>;

// Profile types (app-specific, not from ZM API)
export interface Profile {
  id: string;
  name: string;
  portalUrl: string;
  apiUrl: string;
  cgiUrl: string;
  username?: string;
  password?: string; // encrypted
  refreshToken?: string; // stored in profile for auto-login
  isDefault: boolean;
  createdAt: number;
  lastUsed?: number;
  timezone?: string;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Stream options types
export interface StreamOptions {
  mode?: 'jpeg' | 'single' | 'stream';
  scale?: number;
  width?: number;
  height?: number;
  maxfps?: number;
  buffer?: number;
  token?: string;
  connkey?: number;
  cacheBuster?: number;
}

// Image options types
export interface ImageOptions {
  token?: string;
  width?: number;
  height?: number;
}

// Component prop types
export interface MonitorCardProps {
  monitor: Monitor;
  status: MonitorStatus | undefined;
  eventCount?: number;
  objectFit?: React.CSSProperties['objectFit'];
}

export interface EventCardProps {
  event: Event;
  monitorName: string;
  thumbnailUrl: string;
  objectFit?: React.CSSProperties['objectFit'];
  thumbnailWidth: number;
  thumbnailHeight: number;
}

// Montage layout types
export interface MontageLayout {
  lg?: ReactGridLayout.Layout[];
  md?: ReactGridLayout.Layout[];
  sm?: ReactGridLayout.Layout[];
  xs?: ReactGridLayout.Layout[];
}

// Import for ReactGridLayout namespace
import type * as ReactGridLayout from 'react-grid-layout';
