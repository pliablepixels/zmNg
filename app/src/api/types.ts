import { z } from 'zod';

// Authentication types
export const LoginResponseSchema = z.object({
  access_token: z.string(),
  access_token_expires: z.number(),
  refresh_token: z.string().optional(),
  refresh_token_expires: z.number().optional(),
  credentials: z.string().optional(),
  append_password: z.number().optional(),
  version: z.string().optional(),
  apiversion: z.string().optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

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
  Brightness: z.number().nullable(),
  Contrast: z.number().nullable(),
  Hue: z.number().nullable(),
  Colour: z.number().nullable(),
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
  ZoneCount: z.number(),
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

// Event types
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

// Profile types (app-specific, not from ZM API)
export interface Profile {
  id: string;
  name: string;
  portalUrl: string;
  apiUrl: string;
  cgiUrl: string;
  username?: string;
  password?: string; // encrypted
  isDefault: boolean;
  createdAt: number;
  lastUsed?: number;
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
}

export interface EventCardProps {
  event: Event;
  monitorName: string;
  thumbnailUrl: string;
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
