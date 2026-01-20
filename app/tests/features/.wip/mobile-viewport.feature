@mobile
Feature: Mobile Viewport Testing - All Pages
  As a ZoneMinder user on mobile device
  I want the app to work correctly on small screens
  So that I can use zmNg on my phone

  Background:
    Given the viewport is 375x812 pixels
    And I am logged into zmNg

  # ============================================
  # Navigation on Mobile
  # ============================================

  Scenario: Mobile navigation menu
    Then I should see the hamburger menu button
    And main navigation should be hidden

  Scenario: Open mobile navigation
    When I tap the hamburger menu button
    Then I should see the navigation drawer
    And all navigation items should be visible

  Scenario: Close mobile navigation by tapping outside
    Given the navigation drawer is open
    When I tap outside the drawer
    Then the drawer should close

  Scenario: Navigate via mobile menu
    When I tap the hamburger menu button
    And I tap on "Events"
    Then I should navigate to the Events page
    And the drawer should close

  # ============================================
  # Dashboard Mobile
  # ============================================

  Scenario: Dashboard widgets stack vertically
    When I navigate to the "Dashboard" page
    Then widgets should be full width
    And widgets should stack in single column

  Scenario: Dashboard add widget mobile
    When I navigate to the "Dashboard" page
    And I tap add widget button
    Then dialog should be full screen or sheet
    And widget types should be in list format

  Scenario: Dashboard widget actions mobile
    When I navigate to the "Dashboard" page
    And I long press on a widget
    Then widget action menu should appear

  # ============================================
  # Monitors Mobile
  # ============================================

  Scenario: Monitor grid on mobile
    When I navigate to the "Monitors" page
    Then monitors should display in 1 or 2 columns
    And monitor cards should fit screen width

  Scenario: Monitor detail on mobile
    When I navigate to the "Monitors" page
    And I tap into the first monitor
    Then video should be full width
    And controls should be below video

  Scenario: Monitor swipe navigation mobile
    When I navigate to the "Monitors" page
    And I tap into the first monitor
    When I swipe left
    Then next monitor should load

  # ============================================
  # Montage Mobile
  # ============================================

  Scenario: Montage layout on mobile
    When I navigate to the "Montage" page
    Then grid should be optimized for portrait
    And layout controls should be accessible

  Scenario: Montage fullscreen on mobile
    When I navigate to the "Montage" page
    And I tap a monitor
    Then that monitor should go fullscreen
    And exit button should be visible

  # ============================================
  # Events Mobile
  # ============================================

  Scenario: Events list on mobile
    When I navigate to the "Events" page
    Then event cards should be full width
    And thumbnails should be appropriately sized

  Scenario: Events filter on mobile
    When I navigate to the "Events" page
    And I tap the filter button
    Then filter panel should slide up as sheet
    And filter controls should be touch-friendly

  Scenario: Event detail on mobile
    When I navigate to the "Events" page
    And I tap the first event if events exist
    Then video player should be full width
    And controls should not overlap video

  # ============================================
  # Timeline Mobile
  # ============================================

  Scenario: Timeline horizontal scroll on mobile
    When I navigate to the "Timeline" page
    Then timeline should be horizontally scrollable
    And touch pan should work smoothly

  Scenario: Timeline controls on mobile
    When I navigate to the "Timeline" page
    Then date controls should be in top bar
    And zoom controls should be accessible

  # ============================================
  # Settings Mobile
  # ============================================

  Scenario: Settings layout on mobile
    When I navigate to the "Settings" page
    Then settings should be in single column
    And toggle switches should be full width

  Scenario: Settings dropdowns on mobile
    When I navigate to the "Settings" page
    And I tap the theme dropdown
    Then dropdown should open as native picker or sheet

  # ============================================
  # Profiles Mobile
  # ============================================

  Scenario: Profile list on mobile
    When I navigate to the "Profiles" page
    Then profile cards should be full width
    And action buttons should be accessible

  Scenario: Add profile form on mobile
    When I navigate to the "Profiles" page
    And I tap add profile
    Then form should be full screen
    And keyboard should not obscure inputs

  # ============================================
  # Server Page Mobile
  # ============================================

  Scenario: Server info on mobile
    When I navigate to the "Server" page
    Then info cards should stack vertically
    And all text should be readable

  # ============================================
  # Logs Mobile
  # ============================================

  Scenario: Logs on mobile
    When I navigate to the "Logs" page
    Then log entries should be readable
    And filter controls should be accessible

  # ============================================
  # Touch Interactions
  # ============================================

  Scenario: Pull to refresh on lists
    When I navigate to the "Events" page
    And I pull down on the list
    Then list should refresh
    And refresh indicator should show

  Scenario: Long press for context menu
    When I navigate to the "Events" page
    And I long press on an event card
    Then context menu should appear
    And options should be touch-friendly

  Scenario: Swipe to dismiss dialogs
    When I navigate to the "Dashboard" page
    And I open add widget dialog
    When I swipe down on the dialog
    Then dialog should dismiss

  # ============================================
  # Orientation Changes
  # ============================================

  Scenario: Rotate to landscape
    When I rotate device to landscape
    Then layout should adapt to landscape
    And no content should be cut off

  Scenario: Rotate back to portrait
    Given device is in landscape
    When I rotate to portrait
    Then layout should adapt to portrait
    And scrolling should work properly

  # ============================================
  # Safe Areas
  # ============================================

  Scenario: Content respects safe areas
    Then content should not be under notch
    And content should not be under home indicator
    And bottom navigation should have safe area padding

  Scenario: Fullscreen video respects safe areas
    When I navigate to the "Monitors" page
    And I view a monitor in fullscreen
    Then video controls should be in safe area
    And close button should be accessible
