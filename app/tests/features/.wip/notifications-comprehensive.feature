Feature: Notification Settings - Complete Interaction Testing
  As a ZoneMinder user
  I want to configure push notifications
  So that I can be alerted about security events

  Background:
    Given I am logged into zmNg
    When I navigate to the "Notifications" page

  # ============================================
  # Notification Settings View
  # ============================================

  Scenario: View notification settings page
    Then I should see the page heading "Notification Settings"
    And I should see notification enable toggle
    And I should see monitor selection section

  Scenario: View empty state when no notifications configured
    Given no notifications are configured
    Then I should see setup prompt
    And I should see enable notifications button

  # ============================================
  # Enable/Disable Notifications
  # ============================================

  Scenario: Enable push notifications
    Given notifications are disabled
    When I toggle notifications on
    Then I should see permission request if needed
    And notifications should be enabled
    And I should see success message

  Scenario: Disable push notifications
    Given notifications are enabled
    When I toggle notifications off
    Then notifications should be disabled
    And I should see confirmation message

  Scenario: Handle notification permission denied
    Given device notification permission is denied
    When I try to enable notifications
    Then I should see permission denied message
    And I should see instructions to enable in settings

  # ============================================
  # Monitor Selection
  # ============================================

  Scenario: View monitors for notification
    Given notifications are enabled
    Then I should see list of monitors
    And each monitor should have toggle switch

  Scenario: Enable notifications for specific monitor
    Given notifications are enabled
    When I toggle on notifications for first monitor
    Then that monitor should be enabled for notifications
    And I should see confirmation

  Scenario: Disable notifications for specific monitor
    Given a monitor has notifications enabled
    When I toggle off notifications for that monitor
    Then notifications should be disabled for that monitor

  Scenario: Enable all monitors
    Given notifications are enabled
    When I click enable all monitors
    Then all monitors should be enabled for notifications

  Scenario: Disable all monitors
    Given multiple monitors have notifications enabled
    When I click disable all monitors
    Then all monitors should be disabled

  # ============================================
  # Notification Types
  # ============================================

  Scenario: Select alarm notification type
    Given notifications are enabled
    When I enable alarm notifications
    Then I should receive notifications for alarms

  Scenario: Select motion notification type
    Given notifications are enabled
    When I enable motion notifications
    Then I should receive notifications for motion

  Scenario: Configure notification types per monitor
    Given notifications are enabled
    When I click configure for a monitor
    Then I should see notification type options
    And I can select specific types for that monitor

  # ============================================
  # Notification Schedule
  # ============================================

  Scenario: View notification schedule
    Then I should see schedule configuration section
    And I should see day/time options

  Scenario: Set quiet hours
    When I enable quiet hours
    And I set quiet hours from 10pm to 7am
    Then notifications should be silent during those hours

  Scenario: Set notification schedule by day
    When I open schedule configuration
    And I disable notifications for weekends
    Then notifications should only come on weekdays

  # ============================================
  # Notification History
  # ============================================

  Scenario: Navigate to notification history
    When I click view history button
    Then I should navigate to notification history page

  Scenario: View notification history
    Given I am on notification history page
    Then I should see notification history content

  Scenario: Click notification in history
    Given I am on notification history page
    And there are notifications in history
    When I click on a notification
    Then I should navigate to related event

  Scenario: Clear notification history
    Given I am on notification history page
    And there are notifications in history
    When I click clear history
    Then I should see confirmation dialog
    When I confirm
    Then history should be cleared

  Scenario: Filter notification history
    Given I am on notification history page
    When I filter by monitor
    Then only that monitor's notifications should show

  # ============================================
  # Test Notification
  # ============================================

  Scenario: Send test notification
    Given notifications are enabled
    When I click send test notification
    Then I should receive a test notification
    And I should see success message

  Scenario: Test notification with specific monitor
    Given notifications are enabled for a monitor
    When I click test on that monitor
    Then test notification should show that monitor's info

  # ============================================
  # Notification Sound
  # ============================================

  Scenario: Configure notification sound
    When I click notification sound setting
    Then I should see sound options
    When I select a different sound
    Then that sound should be saved

  Scenario: Preview notification sound
    When I click preview sound
    Then the selected sound should play

  Scenario: Disable notification sound
    When I toggle sound off
    Then notifications should be silent

  # ============================================
  # Badge Settings
  # ============================================

  Scenario: Enable app badge count
    When I enable badge count
    Then app icon should show notification count

  Scenario: Disable app badge count
    Given badge count is enabled
    When I disable badge count
    Then app icon should not show count

  # ============================================
  # FCM Token Management
  # ============================================

  Scenario: View FCM registration status
    Then I should see device registration status
    And status should show registered or not registered

  Scenario: Re-register device
    When I click re-register device
    Then device should re-register with FCM
    And I should see registration result

  # ============================================
  # Error Handling
  # ============================================

  Scenario: Handle notification service unavailable
    Given notification service is unavailable
    Then I should see service error message
    And retry option should be available

  Scenario: Handle save failure
    Given saving settings fails
    Then I should see error message
    And settings should revert
    And retry option should be available

  # ============================================
  # Mobile Specific
  # ============================================

  @mobile
  Scenario: Notification settings on mobile
    Given the viewport is 375x812 pixels
    Then settings should be mobile-optimized
    And toggles should be touch-friendly

  @mobile
  Scenario: System notification settings link
    Given the viewport is 375x812 pixels
    When I tap open system settings
    Then system notification settings should open
