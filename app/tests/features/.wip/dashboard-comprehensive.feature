Feature: Dashboard Page - Complete Interaction Testing
  As a ZoneMinder user
  I want to customize my dashboard with widgets
  So that I can have quick access to important information

  Background:
    Given I am logged into zmNg
    When I navigate to the "Dashboard" page

  # ============================================
  # Dashboard Initial State
  # ============================================

  Scenario: View empty dashboard
    Given no widgets are configured
    Then I should see empty dashboard state
    And I should see add widget prompt

  Scenario: View dashboard with existing widgets
    Given widgets are configured
    Then I should see the widget grid
    And widgets should load their content

  # ============================================
  # Add Widget Dialog
  # ============================================

  Scenario: Open add widget dialog
    When I click the add widget button
    Then I should see the add widget dialog
    And I should see widget type options

  Scenario: Close add widget dialog with X
    When I click the add widget button
    Then I should see the add widget dialog
    When I click the close button
    Then the dialog should close

  Scenario: Close add widget dialog by clicking outside
    When I click the add widget button
    Then I should see the add widget dialog
    When I click outside the dialog
    Then the dialog should close

  # ============================================
  # Add Monitor Widget
  # ============================================

  Scenario: Add monitor stream widget
    When I click the add widget button
    And I select "Monitor Stream" widget type
    Then I should see monitor selection list
    When I select the first monitor
    And I enter widget title "Camera 1"
    And I click the Add button
    Then the dialog should close
    And I should see widget titled "Camera 1"
    And the widget should show live stream

  Scenario: Add monitor widget requires selection
    When I click the add widget button
    And I select "Monitor Stream" widget type
    Then the Add button should be disabled
    When I select the first monitor
    Then the Add button should be enabled

  Scenario: Add multiple monitor widget
    When I click the add widget button
    And I select "Monitor Stream" widget type
    And I select multiple monitors
    And I enter widget title "Multi Cam"
    And I click the Add button
    Then I should see widget with multiple streams

  # ============================================
  # Add Events Widget
  # ============================================

  Scenario: Add recent events widget
    When I click the add widget button
    And I select "Events" widget type
    And I enter widget title "Recent Events"
    And I click the Add button
    Then I should see widget titled "Recent Events"
    And the widget should show event list or empty state

  Scenario: Events widget shows events
    Given I have an events widget on dashboard
    Then the widget should show recent events
    And events should be clickable

  Scenario: Click event in widget navigates to detail
    Given I have an events widget with events
    When I click the first event in widget
    Then I should navigate to event detail page

  # ============================================
  # Add Timeline Widget
  # ============================================

  Scenario: Add timeline widget
    When I click the add widget button
    And I select "Timeline" widget type
    And I enter widget title "Activity Timeline"
    And I click the Add button
    Then I should see widget titled "Activity Timeline"
    And the widget should show timeline visualization

  Scenario: Interact with timeline widget
    Given I have a timeline widget on dashboard
    When I click on a time segment
    Then events for that time should highlight

  # ============================================
  # Add Heatmap Widget
  # ============================================

  Scenario: Add event heatmap widget
    When I click the add widget button
    And I select "Event Heatmap" widget type
    And I enter widget title "Weekly Activity"
    And I click the Add button
    Then I should see widget titled "Weekly Activity"
    And the widget should show heatmap grid

  Scenario: Heatmap widget shows activity levels
    Given I have a heatmap widget on dashboard
    Then cells should show color intensity based on events
    And hovering should show event count

  # ============================================
  # Widget Configuration
  # ============================================

  Scenario: Edit widget title
    Given I have a widget on dashboard
    When I click the widget menu button
    And I click edit
    Then I should see edit dialog
    When I change title to "New Title"
    And I save changes
    Then widget should show "New Title"

  Scenario: Edit widget settings
    Given I have a monitor widget on dashboard
    When I click the widget menu button
    And I click edit
    Then I should see widget settings
    And I should be able to change monitor selection

  # ============================================
  # Widget Deletion
  # ============================================

  Scenario: Delete widget with confirmation
    Given I have a widget on dashboard
    When I click the widget menu button
    And I click delete
    Then I should see delete confirmation
    When I confirm deletion
    Then the widget should be removed

  Scenario: Cancel widget deletion
    Given I have a widget on dashboard
    When I click the widget menu button
    And I click delete
    Then I should see delete confirmation
    When I cancel deletion
    Then the widget should remain

  # ============================================
  # Widget Drag and Drop
  # ============================================

  Scenario: Drag widget to new position
    Given I have multiple widgets on dashboard
    When I drag the first widget to the right
    Then the widget should move to new position
    And the position should persist

  Scenario: Widgets maintain grid alignment
    Given I have multiple widgets on dashboard
    When I drag a widget
    Then it should snap to grid
    And other widgets should adjust

  # ============================================
  # Widget Resize
  # ============================================

  Scenario: Resize widget larger
    Given I have a widget on dashboard
    When I drag the resize handle
    And I make the widget larger
    Then the widget should resize
    And content should adjust to new size

  Scenario: Resize widget smaller
    Given I have a widget on dashboard
    When I drag the resize handle
    And I make the widget smaller
    Then the widget should resize
    And content should still be visible

  Scenario: Widget has minimum size
    Given I have a widget on dashboard
    When I try to resize below minimum
    Then the widget should not go smaller
    And content should remain usable

  # ============================================
  # Dashboard Edit Mode
  # ============================================

  Scenario: Enter edit mode
    Given I have widgets on dashboard
    When I click the edit mode button
    Then dashboard should enter edit mode
    And widgets should show drag handles
    And widgets should show resize handles

  Scenario: Exit edit mode
    Given dashboard is in edit mode
    When I click done editing
    Then dashboard should exit edit mode
    And drag handles should hide
    And changes should be saved

  Scenario: Exit edit mode with escape
    Given dashboard is in edit mode
    When I press Escape key
    Then dashboard should exit edit mode

  # ============================================
  # Dashboard Layout Persistence
  # ============================================

  Scenario: Widget positions persist after reload
    Given I have widgets positioned on dashboard
    When I reload the page
    Then widgets should be in same positions

  Scenario: Widget sizes persist after reload
    Given I have resized widgets on dashboard
    When I reload the page
    Then widgets should have same sizes

  # ============================================
  # Widget Refresh
  # ============================================

  Scenario: Refresh individual widget
    Given I have an events widget on dashboard
    When I click the widget refresh button
    Then the widget should reload content
    And loading indicator should show briefly

  Scenario: Widgets auto-refresh periodically
    Given I have an events widget on dashboard
    When I wait for auto-refresh interval
    Then the widget should update content

  # ============================================
  # Error Handling
  # ============================================

  Scenario: Widget handles load failure gracefully
    Given a widget fails to load data
    Then the widget should show error state
    And retry button should be visible
    When I click retry
    Then the widget should attempt to reload

  Scenario: Dashboard handles many widgets
    Given I add 10 widgets to dashboard
    Then all widgets should load
    And scrolling should work smoothly

  # ============================================
  # Mobile Specific
  # ============================================

  @mobile
  Scenario: Dashboard displays in mobile layout
    Given the viewport is 375x812 pixels
    Then widgets should stack vertically
    And widgets should be full width

  @mobile
  Scenario: Add widget on mobile
    Given the viewport is 375x812 pixels
    When I tap the add widget button
    Then I should see mobile-optimized dialog
    And widget types should be in list format

  @mobile
  Scenario: Edit mode on mobile
    Given the viewport is 375x812 pixels
    And I have widgets on dashboard
    When I enter edit mode
    Then drag handles should be touch-friendly
    And long press should allow drag
