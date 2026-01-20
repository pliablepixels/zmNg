Feature: Montage Page - Complete Interaction Testing
  As a ZoneMinder user viewing montage
  I want to interact with all layout and display controls
  So that I can customize my multi-camera view

  Background:
    Given I am logged into zmNg
    When I navigate to the "Montage" page

  # ============================================
  # Grid Layout Controls
  # ============================================

  Scenario: View default grid layout
    Then I should see the montage grid
    And I should see at least 1 monitor in the grid
    And each monitor should display video stream

  Scenario: Change grid to 1x1 layout
    When I click the grid layout selector
    And I select "1x1" grid layout
    Then I should see 1 monitor visible in grid
    And the layout should update immediately

  Scenario: Change grid to 2x2 layout
    When I click the grid layout selector
    And I select "2x2" grid layout
    Then I should see up to 4 monitors in grid
    And the layout should update immediately

  Scenario: Change grid to 3x3 layout
    When I click the grid layout selector
    And I select "3x3" grid layout
    Then I should see up to 9 monitors in grid

  Scenario: Change grid to 4x4 layout
    When I click the grid layout selector
    And I select "4x4" grid layout
    Then I should see up to 16 monitors in grid

  Scenario: Custom grid layout selection
    When I click the grid layout selector
    And I select custom columns "3"
    And I select custom rows "2"
    Then I should see up to 6 monitors in grid

  # ============================================
  # Fullscreen Mode
  # ============================================

  Scenario: Enter fullscreen mode
    When I click the fullscreen button
    Then the montage should enter fullscreen mode
    And the controls should be visible in fullscreen

  Scenario: Exit fullscreen with button
    When I click the fullscreen button
    Then the montage should enter fullscreen mode
    When I click the exit fullscreen button
    Then the montage should exit fullscreen mode

  Scenario: Exit fullscreen with Escape key
    When I click the fullscreen button
    Then the montage should enter fullscreen mode
    When I press Escape key
    Then the montage should exit fullscreen mode

  Scenario: Fullscreen controls auto-hide
    When I click the fullscreen button
    Then the controls should be visible initially
    When I wait 3 seconds without moving mouse
    Then the controls should hide
    When I move the mouse
    Then the controls should become visible again

  # ============================================
  # Individual Monitor Interaction
  # ============================================

  Scenario: Click monitor to view detail
    When I click on the first monitor in montage grid
    Then I should navigate to the monitor detail page

  Scenario: Double-click monitor to fullscreen single view
    When I double-click on the first monitor in montage grid
    Then that monitor should expand to full view

  Scenario: Hover shows monitor controls overlay
    When I hover over a monitor in montage grid
    Then I should see the monitor name overlay
    And I should see the snapshot button overlay

  Scenario: Take snapshot from montage overlay
    When I hover over a monitor in montage grid
    And I click the snapshot button in overlay
    Then I should see snapshot download initiated

  # ============================================
  # Auto-Cycle Feature
  # ============================================

  Scenario: Enable auto-cycle through monitors
    When I enable auto-cycle mode
    And I set cycle interval to 5 seconds
    Then monitors should cycle automatically
    And the progress indicator should show cycle timing

  Scenario: Disable auto-cycle
    Given auto-cycle is enabled
    When I disable auto-cycle mode
    Then monitors should stop cycling

  Scenario: Manual navigation pauses auto-cycle temporarily
    Given auto-cycle is enabled
    When I manually navigate to next monitor
    Then auto-cycle should pause briefly
    And then resume cycling

  # ============================================
  # Container Resize Handling
  # ============================================

  Scenario: Grid adjusts to window resize
    Given the montage is displaying 4 monitors
    When the window is resized smaller
    Then the grid should reflow to fit
    And aspect ratios should be maintained

  Scenario: Grid handles portrait orientation
    Given the viewport is portrait orientation
    Then the grid should stack vertically
    And monitors should fill available width

  # ============================================
  # Stream Settings Per-Monitor
  # ============================================

  Scenario: View streaming method for monitor
    When I hover over a monitor in montage grid
    And I click the settings icon in overlay
    Then I should see streaming method options

  Scenario: Change streaming method for individual monitor
    When I hover over a monitor in montage grid
    And I click the settings icon in overlay
    And I select "MJPEG" streaming method
    Then that monitor should reload with MJPEG stream

  # ============================================
  # Monitor Visibility Toggle
  # ============================================

  Scenario: Hide specific monitor from montage
    When I open montage settings
    And I toggle off visibility for first monitor
    Then that monitor should hide from grid
    And other monitors should fill the space

  Scenario: Show hidden monitor
    Given a monitor is hidden from montage
    When I open montage settings
    And I toggle on visibility for hidden monitor
    Then that monitor should appear in grid

  # ============================================
  # Performance and Loading
  # ============================================

  Scenario: Montage loads with skeleton placeholders
    Given I am on dashboard page
    When I navigate to the "Montage" page
    Then I should see skeleton loading states
    And then monitors should load progressively

  Scenario: Failed stream shows error state
    Given a monitor stream fails to load
    Then that monitor should show error indicator
    And I should see retry option

  Scenario: Retry failed stream
    Given a monitor shows error state
    When I click retry on error monitor
    Then the stream should attempt to reload

  # ============================================
  # Mobile Specific
  # ============================================

  @mobile
  Scenario: Montage displays in mobile viewport
    Given the viewport is 375x812 pixels
    Then the montage should display in compact mode
    And grid controls should be in mobile drawer

  @mobile
  Scenario: Swipe to change layout on mobile
    Given the viewport is 375x812 pixels
    When I swipe up on montage controls
    Then the layout options should appear

  @mobile
  Scenario: Tap monitor for fullscreen on mobile
    Given the viewport is 375x812 pixels
    When I tap on a monitor
    Then that monitor should expand fullscreen
    And I should see close button
