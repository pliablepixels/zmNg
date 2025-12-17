# Data-TestID Implementation Guide

This document outlines the data-testid attributes to add to UI components for reliable E2E testing.

## Naming Convention

Use kebab-case with descriptive names:
- `data-testid="component-element-descriptor"`
- Examples: `monitor-card`, `event-list`, `login-button`

## Priority Components

### High Priority (Required for current tests)

#### Monitors Page (`src/pages/Monitors.tsx`)
```tsx
// Line 126: Add to the grid container
<div className="..." data-testid="monitor-grid">

// Line 122: Add to empty state
<div className="..." data-testid="monitors-empty-state">
```

#### Monitor Card (`src/components/monitors/MonitorCard.tsx`)
```tsx
// Around line 100-110: Add to Card wrapper
<Card
  className="..."
  data-testid="monitor-card"
>

// Monitor name element
<h3 data-testid="monitor-name">{monitor.Name}</h3>

// Status indicator
<Badge data-testid="monitor-status" ...>
  {isRunning ? 'Online' : 'Offline'}
</Badge>

// Player/stream element
<img
  ref={imgRef}
  data-testid="monitor-player"
  ...
/>
```

#### Events Page (`src/pages/Events.tsx`)
```tsx
// Event list container
<div data-testid="event-list">

// Individual event cards
<Card data-testid="event-card">

// Event ID
<span data-testid="event-id">{event.Id}</span>

// Monitor name in event
<span data-testid="event-monitor-name">{event.MonitorName}</span>

// Event thumbnail
<img data-testid="event-thumbnail" .../>

// Empty state
<div data-testid="events-empty-state">
```

#### Event Detail Page (`src/pages/EventDetail.tsx`)
```tsx
// Video player
<video data-testid="event-video-player" .../>

// Event metadata container
<div data-testid="event-metadata">

// Play/pause button
<Button data-testid="event-play-button" ...>

// Timeline/scrubber
<div data-testid="event-timeline">

// Frame markers
<div data-testid="event-frame-marker" data-frame-type="alarm">
<div data-testid="event-frame-marker" data-frame-type="max-score">
```

#### Profiles Page (`src/pages/Profiles.tsx`)
```tsx
// Profile list container
<div data-testid="profile-list">

// Individual profile cards
<Card data-testid="profile-card">

// Profile name
<span data-testid="profile-name">{profile.name}</span>

// Active profile indicator
<Check data-testid="profile-active-indicator" .../>
```

#### Logs Page (`src/pages/Logs.tsx`)
```tsx
// Log entries container
<div data-testid="log-entries">

// Individual log entry
<div data-testid="log-entry">

// Empty state
<div data-testid="logs-empty-state">
```

### Medium Priority (Useful for future tests)

#### Dashboard (`src/pages/Dashboard.tsx`)
```tsx
// Widget grid
<div data-testid="dashboard-grid">

// Add widget button
<Button data-testid="add-widget-button" ...>

// Individual widgets
<div data-testid="dashboard-widget" data-widget-type={type}>
```

#### Montage (`src/pages/Montage.tsx`)
```tsx
// Montage grid
<div data-testid="montage-grid">

// Grid controls
<Select data-testid="montage-layout-selector" ...>
```

#### Timeline (`src/pages/Timeline.tsx`)
```tsx
// Timeline container
<div data-testid="timeline-container">

// Timeline chart
<div data-testid="timeline-chart">

// Monitor filters
<div data-testid="timeline-monitor-filters">
```

#### Notifications (`src/pages/NotificationHistory.tsx` and `NotificationSettings.tsx`)
```tsx
// Notification list
<div data-testid="notification-list">

// Individual notifications
<div data-testid="notification-item">

// Settings toggle
<Switch data-testid="notifications-enabled-toggle" ...>

// Connection status
<Badge data-testid="notification-connection-status">
```

### Low Priority (Nice to have)

#### Settings Page
```tsx
// Settings sections
<div data-testid="settings-section" data-section={sectionName}>

// Theme toggle
<Button data-testid="theme-toggle" ...>

// Language selector
<Select data-testid="language-selector" ...>
```

## Implementation Example

Here's how to add data-testid to a component:

### Before:
```tsx
export function MonitorCard({ monitor, status }: Props) {
  return (
    <Card className="...">
      <h3>{monitor.Name}</h3>
      <Badge>{status}</Badge>
    </Card>
  );
}
```

### After:
```tsx
export function MonitorCard({ monitor, status }: Props) {
  return (
    <Card className="..." data-testid="monitor-card">
      <h3 data-testid="monitor-name">{monitor.Name}</h3>
      <Badge data-testid="monitor-status">{status}</Badge>
    </Card>
  );
}
```

## Testing the Implementation

After adding data-testid attributes, verify they work:

```typescript
// In Playwright test
const monitorCard = page.getByTestId('monitor-card').first();
await expect(monitorCard).toBeVisible();

const monitorName = monitorCard.getByTestId('monitor-name');
await expect(monitorName).toHaveText('Front Door');
```

## Best Practices

1. **Be Specific**: Use descriptive names that clearly identify the element
2. **Be Consistent**: Follow the naming convention across all components
3. **Don't Overuse**: Only add test IDs to elements that need to be selected in tests
4. **Use Semantic HTML**: Prefer role-based selectors when possible (buttons, links, headings)
5. **Combine Approaches**: Use both test IDs and semantic selectors for robust tests

## Priority Implementation Order

1. **Phase 1** (Immediate):
   - Monitor Card (monitor-card, monitor-name, monitor-status, monitor-player)
   - Monitors Page (monitor-grid)
   - Event Card (event-card, event-id)

2. **Phase 2** (Next sprint):
   - Event Detail page elements
   - Profile page elements
   - Logs page elements

3. **Phase 3** (Future):
   - Dashboard widgets
   - Timeline components
   - Notification components
   - Settings components

## Files to Modify

Create issues or tasks for:
- [ ] `src/components/monitors/MonitorCard.tsx`
- [ ] `src/pages/Monitors.tsx`
- [ ] `src/pages/Events.tsx`
- [ ] `src/pages/EventDetail.tsx`
- [ ] `src/pages/Profiles.tsx`
- [ ] `src/pages/Logs.tsx`
- [ ] `src/pages/Dashboard.tsx`
- [ ] `src/pages/Montage.tsx`
- [ ] `src/pages/Timeline.tsx`
- [ ] `src/pages/NotificationHistory.tsx`
- [ ] `src/pages/NotificationSettings.tsx`
