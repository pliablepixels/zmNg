Feature: Server Page - Complete Interaction Testing
  As a ZoneMinder user
  I want to view and manage server information
  So that I can monitor system health and control the server

  Background:
    Given I am logged into zmNg
    When I navigate to the "Server" page

  # ============================================
  # Server Information Display
  # ============================================

  Scenario: View server version
    Then I should see the ZoneMinder version
    And version should be displayed prominently

  Scenario: View server status
    Then I should see server status indicator
    And status should show running or stopped

  Scenario: View server uptime
    Then I should see server uptime
    And uptime should update periodically

  Scenario: View system load
    Then I should see CPU load information
    And I should see memory usage
    And I should see disk usage

  # ============================================
  # Monitor Statistics
  # ============================================

  Scenario: View monitor count
    Then I should see total monitors count
    And I should see active monitors count
    And I should see monitors by function breakdown

  Scenario: View event statistics
    Then I should see total events count
    And I should see events today count
    And I should see storage used by events

  # ============================================
  # Server Controls
  # ============================================

  Scenario: Restart ZoneMinder daemon
    When I click the restart daemon button
    Then I should see confirmation dialog
    When I confirm restart
    Then I should see restarting indicator
    And server should reconnect after restart

  Scenario: Cancel daemon restart
    When I click the restart daemon button
    Then I should see confirmation dialog
    When I cancel
    Then restart should not occur

  Scenario: Stop ZoneMinder daemon
    When I click the stop daemon button
    Then I should see warning dialog
    When I confirm stop
    Then daemon should stop
    And status should show stopped

  Scenario: Start ZoneMinder daemon
    Given daemon is stopped
    When I click the start daemon button
    Then daemon should start
    And status should show running

  # ============================================
  # Connection Test
  # ============================================

  Scenario: Test server connection
    When I click test connection button
    Then connection test should run
    And I should see testing indicator
    And result should show success or failure

  Scenario: Connection test shows details
    When I click test connection button
    And connection succeeds
    Then I should see response time
    And I should see API version

  # ============================================
  # Server Logs Quick View
  # ============================================

  Scenario: View recent server logs
    Then I should see recent log entries section
    And last few log entries should be visible

  Scenario: Navigate to full logs from server page
    When I click view all logs
    Then I should navigate to logs page

  # ============================================
  # Storage Information
  # ============================================

  Scenario: View storage paths
    Then I should see event storage path
    And I should see storage space available

  Scenario: Storage warning when low
    Given storage is below threshold
    Then I should see storage warning
    And warning should show action needed

  # ============================================
  # Database Information
  # ============================================

  Scenario: View database stats
    Then I should see database size
    And I should see event count in database

  # ============================================
  # API Information
  # ============================================

  Scenario: View API endpoints
    Then I should see API base URL
    And I should see API authentication status

  Scenario: Copy API URL
    When I click copy API URL button
    Then URL should be copied to clipboard
    And I should see copied confirmation

  # ============================================
  # Refresh Data
  # ============================================

  Scenario: Refresh server information
    When I click the refresh button
    Then all server data should refresh
    And loading indicators should show
    And data should update

  Scenario: Auto-refresh server data
    Given auto-refresh is enabled
    Then server data should refresh automatically
    And refresh interval should be configurable

  # ============================================
  # Error Handling
  # ============================================

  Scenario: Handle server unreachable
    Given server becomes unreachable
    Then I should see connection lost message
    And reconnect button should be visible
    When I click reconnect
    Then connection attempt should occur

  Scenario: Handle partial data load failure
    Given some server stats fail to load
    Then available data should still display
    And failed sections should show error state
    And retry option should be available

  # ============================================
  # Mobile Specific
  # ============================================

  @mobile
  Scenario: Server page mobile layout
    Given the viewport is 375x812 pixels
    Then information should be in cards
    And cards should stack vertically
    And text should be readable

  @mobile
  Scenario: Server controls on mobile
    Given the viewport is 375x812 pixels
    Then control buttons should be accessible
    And confirmation dialogs should be full-width
