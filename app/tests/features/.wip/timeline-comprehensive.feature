Feature: Timeline Page - Complete Interaction Testing
  As a ZoneMinder user
  I want to visualize events on a timeline
  So that I can understand activity patterns over time

  Background:
    Given I am logged into zmNg
    When I navigate to the "Timeline" page

  # ============================================
  # Timeline Display
  # ============================================

  Scenario: View timeline with events
    Then I should see the timeline visualization
    And events should be displayed as markers
    And time axis should be visible

  Scenario: Timeline shows current time indicator
    Then I should see current time marker
    And marker should be at correct position

  Scenario: Timeline loads for selected date range
    Then timeline should show configured date range
    And all events in range should appear

  # ============================================
  # Date/Time Selection
  # ============================================

  Scenario: Select start date
    When I click the start date picker
    Then I should see calendar picker
    When I select a date
    Then start date should update
    And timeline should reload

  Scenario: Select end date
    When I click the end date picker
    Then I should see calendar picker
    When I select a date
    Then end date should update
    And timeline should reload

  Scenario: Select time range preset
    When I click the time range dropdown
    Then I should see preset options
    When I select "Last 24 hours"
    Then timeline should show last 24 hours

  Scenario: Time range presets
    When I click the time range dropdown
    Then I should see "Last hour" option
    And I should see "Last 24 hours" option
    And I should see "Last 7 days" option
    And I should see "Last 30 days" option
    And I should see "Custom" option

  Scenario: Custom date range
    When I click the time range dropdown
    And I select "Custom"
    Then I should see date range picker
    When I set custom start and end dates
    Then timeline should show custom range

  # ============================================
  # Timeline Zoom
  # ============================================

  Scenario: Zoom in on timeline
    When I click the zoom in button
    Then timeline should zoom in
    And time labels should show more detail
    And events should spread out

  Scenario: Zoom out on timeline
    When I click the zoom out button
    Then timeline should zoom out
    And time labels should show less detail
    And events should compress

  Scenario: Zoom with scroll wheel
    When I scroll up on timeline
    Then timeline should zoom in
    When I scroll down on timeline
    Then timeline should zoom out

  Scenario: Pinch to zoom on mobile
    Given the viewport is 375x812 pixels
    When I pinch to zoom on timeline
    Then timeline should zoom accordingly

  # ============================================
  # Timeline Navigation
  # ============================================

  Scenario: Pan timeline left
    When I drag timeline to the right
    Then timeline should pan to show earlier time

  Scenario: Pan timeline right
    When I drag timeline to the left
    Then timeline should pan to show later time

  Scenario: Jump to current time
    When I click jump to now button
    Then timeline should center on current time
    And current time marker should be visible

  Scenario: Jump to specific time
    When I enter a specific time in time input
    Then timeline should jump to that time
    And that time should be centered

  # ============================================
  # Event Interaction
  # ============================================

  Scenario: Hover shows event preview
    When I hover over an event marker
    Then I should see event preview tooltip
    And tooltip should show event thumbnail
    And tooltip should show event time

  Scenario: Click event opens detail
    When I click on an event marker
    Then I should navigate to event detail page

  Scenario: Event color coding by monitor
    Then events should be color coded
    And each monitor should have distinct color
    And legend should show monitor colors

  Scenario: Event color coding by type
    When I toggle color by event type
    Then events should be colored by cause
    And legend should update

  # ============================================
  # Monitor Filter
  # ============================================

  Scenario: Filter timeline by monitor
    When I open the monitor filter
    And I select specific monitors
    Then only selected monitor events should show

  Scenario: Clear monitor filter
    Given monitors are filtered
    When I click clear filter
    Then all monitors should show

  Scenario: Toggle individual monitor visibility
    When I click on a monitor in legend
    Then that monitor's events should hide
    When I click again
    Then that monitor's events should show

  # ============================================
  # Timeline View Modes
  # ============================================

  Scenario: Switch to compact view
    When I click compact view button
    Then timeline should show compact layout
    And events should be smaller

  Scenario: Switch to detailed view
    When I click detailed view button
    Then timeline should show detailed layout
    And event markers should be larger

  Scenario: Switch to swim lane view
    When I click swim lane view button
    Then each monitor should have own lane
    And events should not overlap

  # ============================================
  # Timeline Export
  # ============================================

  Scenario: Export timeline as image
    When I click export button
    And I select export as image
    Then timeline image should be downloaded

  Scenario: Export timeline data as CSV
    When I click export button
    And I select export as CSV
    Then CSV file should be downloaded
    And file should contain event data

  # ============================================
  # Auto-Refresh
  # ============================================

  Scenario: Enable auto-refresh
    When I enable auto-refresh toggle
    Then timeline should refresh periodically
    And new events should appear automatically

  Scenario: Disable auto-refresh
    Given auto-refresh is enabled
    When I disable auto-refresh
    Then timeline should stop refreshing

  # ============================================
  # Loading States
  # ============================================

  Scenario: Loading state during data fetch
    When timeline data is loading
    Then I should see loading indicator
    And timeline should show skeleton state

  Scenario: Empty state when no events
    Given there are no events in selected range
    Then I should see empty state message
    And suggestion to adjust date range

  # ============================================
  # Error Handling
  # ============================================

  Scenario: Handle data load failure
    Given timeline data fails to load
    Then I should see error message
    And retry button should be available
    When I click retry
    Then data load should retry

  Scenario: Handle partial data
    Given some event data is incomplete
    Then available events should still show
    And incomplete events should be indicated

  # ============================================
  # Keyboard Navigation
  # ============================================

  Scenario: Navigate timeline with arrow keys
    When I press right arrow key
    Then timeline should pan right
    When I press left arrow key
    Then timeline should pan left

  Scenario: Zoom with plus minus keys
    When I press plus key
    Then timeline should zoom in
    When I press minus key
    Then timeline should zoom out

  # ============================================
  # Mobile Specific
  # ============================================

  @mobile
  Scenario: Timeline on mobile viewport
    Given the viewport is 375x812 pixels
    Then timeline should be horizontally scrollable
    And controls should be in bottom sheet

  @mobile
  Scenario: Mobile date picker
    Given the viewport is 375x812 pixels
    When I tap the date picker
    Then native date picker should appear

  @mobile
  Scenario: Touch gestures on timeline
    Given the viewport is 375x812 pixels
    When I drag on timeline
    Then timeline should pan
    And momentum scrolling should work
