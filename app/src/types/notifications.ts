/**
 * Shared types for ZoneMinder Notifications
 */

export interface ZMEventServerConfig {
    host: string; // e.g., "zm.example.com"
    port: number; // default 9000
    path?: string; // default "/"
    ssl: boolean; // true for wss://, false for ws://
    username: string;
    password: string;
    token?: string;
    appVersion: string;
    portalUrl: string; // ZoneMinder portal URL for constructing image URLs
}

export interface ZMAlarmEvent {
    MonitorId: number;
    MonitorName: string;
    EventId: number;
    Cause: string;
    Name: string;
    DetectionJson?: unknown[];
    ImageUrl?: string; // URL to event snapshot/alarm frame
}

export interface ZMNotificationMessage {
    event: 'auth' | 'alarm' | 'push' | 'control';
    type: string;
    status: 'Success' | 'Fail';
    reason?: string;
    version?: string;
    events?: ZMAlarmEvent[];
    supplementary?: string;
}

export type ConnectionState =
    | 'disconnected'
    | 'connecting'
    | 'authenticating'
    | 'connected'
    | 'error';

export type NotificationEventCallback = (event: ZMAlarmEvent) => void;
export type ConnectionStateCallback = (state: ConnectionState) => void;
