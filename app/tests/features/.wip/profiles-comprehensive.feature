Feature: Profile Management - Complete Interaction Testing
  As a ZoneMinder user
  I want to manage server profiles
  So that I can connect to multiple ZoneMinder servers

  Background:
    Given I am logged into zmNg
    When I navigate to the "Profiles" page

  # ============================================
  # Profile List View
  # ============================================

  Scenario: View profile list
    Then I should see the profiles list
    And I should see at least 1 profile card
    And I should see the active profile indicator

  Scenario: Active profile is highlighted
    Then the active profile should have visual indicator
    And active profile should show connected status

  # ============================================
  # Add New Profile
  # ============================================

  Scenario: Open add profile form
    When I click the add profile button
    Then I should see the profile form
    And the form should be empty

  Scenario: Add profile with valid credentials
    When I click the add profile button
    And I enter profile name "Test Server"
    And I enter server URL "http://test-server:8080/zm"
    And I enter username "admin"
    And I enter password "password123"
    And I click test connection
    Then I should see connection success message
    When I click save profile
    Then I should see the new profile in list

  Scenario: Add profile with invalid URL shows error
    When I click the add profile button
    And I enter profile name "Bad Server"
    And I enter server URL "not-a-valid-url"
    And I click test connection
    Then I should see connection failed message
    And save button should be disabled

  Scenario: Add profile requires all fields
    When I click the add profile button
    And I leave profile name empty
    Then save button should be disabled
    When I enter profile name "Test"
    And I leave server URL empty
    Then save button should be disabled

  Scenario: Test connection shows loading state
    When I click the add profile button
    And I enter valid server details
    And I click test connection
    Then I should see testing indicator
    And the test button should be disabled during test

  # ============================================
  # Edit Profile
  # ============================================

  Scenario: Open edit profile dialog
    When I click edit on the first profile
    Then I should see the profile edit dialog
    And fields should be populated with current values

  Scenario: Edit profile name
    When I click edit on the first profile
    And I change the profile name to "Renamed Server"
    And I click save
    Then the profile should show "Renamed Server"

  Scenario: Edit profile server URL
    When I click edit on the first profile
    And I change the server URL
    And I click test connection
    Then connection should be tested with new URL
    When I click save
    Then changes should be saved

  Scenario: Cancel edit discards changes
    When I click edit on the first profile
    And I change the profile name to "Should Not Save"
    And I click cancel
    Then changes should be discarded
    And original name should remain

  # ============================================
  # Delete Profile
  # ============================================

  Scenario: Delete non-active profile
    Given there are multiple profiles
    When I click delete on a non-active profile
    Then I should see delete confirmation dialog
    When I confirm deletion
    Then the profile should be removed

  Scenario: Cancel profile deletion
    When I click delete on a profile
    Then I should see delete confirmation dialog
    When I cancel deletion
    Then the profile should remain

  Scenario: Cannot delete last profile
    Given there is only one profile
    Then the delete button should be disabled or show warning

  Scenario: Cannot delete active profile warning
    Given there are multiple profiles
    When I try to delete the active profile
    Then I should see warning about active profile
    And I should be prompted to switch first

  # ============================================
  # Switch Profile
  # ============================================

  Scenario: Switch to different profile
    Given there are multiple profiles
    When I click on a non-active profile
    Then I should see switch confirmation
    When I confirm switch
    Then that profile should become active
    And app should reconnect to new server

  Scenario: Switching shows loading state
    Given there are multiple profiles
    When I switch to a different profile
    Then I should see connecting indicator
    And navigation should be disabled during switch

  Scenario: Switch failure shows error
    Given there are multiple profiles
    And the target server is unreachable
    When I switch to that profile
    Then I should see connection error
    And I should remain on current profile

  # ============================================
  # Profile Card Actions
  # ============================================

  Scenario: Profile card shows server info
    Then each profile card should show server URL
    And profile cards should show connection status

  Scenario: Profile card menu
    When I click the menu button on a profile
    Then I should see edit option
    And I should see delete option
    And I should see test connection option

  Scenario: Test connection from profile card
    When I click the menu button on a profile
    And I click test connection
    Then connection test should run
    And status should update based on result

  # ============================================
  # Profile Security
  # ============================================

  Scenario: Password is masked in form
    When I click edit on a profile with password
    Then password field should show masked value
    And reveal password button should be visible

  Scenario: Reveal password toggle
    When I click edit on a profile
    And I click reveal password
    Then password should be visible
    When I click hide password
    Then password should be masked again

  Scenario: Credentials stored securely
    When I add a profile with credentials
    Then credentials should be encrypted at rest
    And credentials should not appear in logs

  # ============================================
  # Profile Import/Export
  # ============================================

  Scenario: Export profiles
    When I click export profiles
    Then a file should be downloaded
    And file should contain profile data
    And passwords should be excluded or encrypted

  Scenario: Import profiles
    When I click import profiles
    And I select a valid export file
    Then profiles should be imported
    And duplicate check should run

  # ============================================
  # Error Handling
  # ============================================

  Scenario: Handle network error during profile save
    Given network is unavailable
    When I try to save a new profile
    Then I should see network error message
    And form data should not be lost

  Scenario: Handle duplicate profile name
    Given a profile named "Server 1" exists
    When I try to add another profile named "Server 1"
    Then I should see duplicate name warning

  # ============================================
  # Mobile Specific
  # ============================================

  @mobile
  Scenario: Profile list mobile layout
    Given the viewport is 375x812 pixels
    Then profile cards should be full width
    And cards should stack vertically

  @mobile
  Scenario: Add profile on mobile
    Given the viewport is 375x812 pixels
    When I tap add profile
    Then form should be mobile-optimized
    And keyboard should not obscure inputs

  @mobile
  Scenario: Swipe to delete profile
    Given the viewport is 375x812 pixels
    When I swipe left on a profile card
    Then delete action should be revealed
