# Dashboard

The Dashboard is the main screen you see after logging in. It displays customizable widgets showing an overview of your ZoneMinder system.

## Widgets

The dashboard supports several widget types:

| Widget | Description |
|--------|-------------|
| **System Status** | ZoneMinder daemon status and server health |
| **Monitor Summary** | Count of monitors by state (online, alarm, offline) |
| **Recent Events** | Latest events across all monitors |
| **Event Statistics** | Event counts and charts over time |

## Customizing the Layout

The dashboard uses a drag-and-drop grid layout:

- **Move widgets**: Click and drag a widget header to reposition it
- **Resize widgets**: Drag the bottom-right corner of a widget to resize
- **Add widgets**: Tap the add button to place a new widget
- **Remove widgets**: Tap the close button on a widget header

Your layout is saved automatically per profile.

## Mobile Layout

On mobile devices (portrait orientation), widgets stack vertically in a single column. The layout adapts automatically based on screen width.

In landscape mode, the grid layout is used, similar to the desktop view.

## Refreshing Data

Dashboard widgets refresh automatically based on your bandwidth settings:

- **Normal mode**: Widgets refresh every 30 seconds
- **Low bandwidth mode**: Widgets refresh every 60 seconds

You can also pull down to manually refresh on mobile devices.

See {doc}`settings` for bandwidth configuration.
