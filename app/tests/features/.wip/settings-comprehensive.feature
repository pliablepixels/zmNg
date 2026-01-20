Feature: Settings Page - Complete Interaction Testing
  As a ZoneMinder user
  I want to configure all application settings
  So that I can customize the app to my preferences

  Background:
    Given I am logged into zmNg
    When I navigate to the "Settings" page

  # ============================================
  # Theme Settings
  # ============================================

  Scenario: View current theme
    Then I should see the theme selector
    And the current theme should be displayed

  Scenario: Switch to dark theme
    When I click the theme selector
    And I select "Dark" theme
    Then the application should switch to dark theme
    And the background should be dark
    And the setting should persist

  Scenario: Switch to light theme
    When I click the theme selector
    And I select "Light" theme
    Then the application should switch to light theme
    And the background should be light

  Scenario: Switch to system theme
    When I click the theme selector
    And I select "System" theme
    Then the theme should match system preference

  # ============================================
  # Language Settings
  # ============================================

  Scenario: View current language
    Then I should see the language selector
    And the current language should be displayed

  Scenario: Switch language to German
    When I click the language selector
    And I select "Deutsch" language
    Then all UI text should change to German
    And the setting should persist

  Scenario: Switch language to Spanish
    When I click the language selector
    And I select "Español" language
    Then all UI text should change to Spanish

  Scenario: Switch language to French
    When I click the language selector
    And I select "Français" language
    Then all UI text should change to French

  Scenario: Switch language to Chinese
    When I click the language selector
    And I select "中文" language
    Then all UI text should change to Chinese

  Scenario: Switch language back to English
    When I click the language selector
    And I select "English" language
    Then all UI text should change to English

  # ============================================
  # Streaming Method Settings
  # ============================================

  Scenario: View streaming method setting
    Then I should see streaming method selector
    And I should see options Auto WebRTC MJPEG

  Scenario: Set streaming method to Auto
    When I click streaming method selector
    And I select "Auto" streaming method
    Then the setting should be saved
    And monitors should use automatic stream selection

  Scenario: Set streaming method to WebRTC
    When I click streaming method selector
    And I select "WebRTC" streaming method
    Then the setting should be saved

  Scenario: Set streaming method to MJPEG
    When I click streaming method selector
    And I select "MJPEG" streaming method
    Then the setting should be saved

  # ============================================
  # Event Retention Settings
  # ============================================

  Scenario: View event retention setting
    Then I should see event retention selector

  Scenario: Change event retention period
    When I click event retention selector
    And I select "30 days" retention
    Then the setting should be saved

  # ============================================
  # UI Toggle Settings
  # ============================================

  Scenario: Toggle show monitor names
    When I find the show monitor names toggle
    And I toggle it on
    Then monitor names should be visible
    When I toggle it off
    Then monitor names should be hidden

  Scenario: Toggle show timestamps
    When I find the show timestamps toggle
    And I toggle it on
    Then timestamps should be visible on streams
    When I toggle it off
    Then timestamps should be hidden

  Scenario: Toggle haptic feedback
    When I find the haptic feedback toggle
    And I toggle it on
    Then haptic feedback should be enabled
    When I toggle it off
    Then haptic feedback should be disabled

  Scenario: Toggle auto-play videos
    When I find the auto-play toggle
    And I toggle it off
    Then videos should not auto-play
    When I toggle it on
    Then videos should auto-play

  # ============================================
  # Profile Settings Section
  # ============================================

  Scenario: Navigate to profiles from settings
    When I click on profile settings link
    Then I should navigate to the profiles page

  # ============================================
  # Server Settings Section
  # ============================================

  Scenario: Navigate to server from settings
    When I click on server settings link
    Then I should navigate to the server page

  # ============================================
  # Notification Settings Section
  # ============================================

  Scenario: Navigate to notifications from settings
    When I click on notification settings link
    Then I should navigate to the notifications page

  # ============================================
  # Log Settings Section
  # ============================================

  Scenario: Navigate to logs from settings
    When I click on logs link
    Then I should navigate to the logs page

  # ============================================
  # About Section
  # ============================================

  Scenario: View app version
    Then I should see the app version number

  Scenario: View build information
    Then I should see build date or commit info

  # ============================================
  # Clear Data
  # ============================================

  Scenario: Clear cache with confirmation
    When I click clear cache button
    Then I should see confirmation dialog
    When I confirm clear cache
    Then cache should be cleared
    And I should see success toast

  Scenario: Cancel clear cache
    When I click clear cache button
    Then I should see confirmation dialog
    When I cancel
    Then dialog should close
    And cache should not be cleared

  Scenario: Reset all settings with confirmation
    When I click reset settings button
    Then I should see warning dialog
    When I confirm reset
    Then all settings should reset to defaults
    And I should see success toast

  # ============================================
  # Settings Persistence
  # ============================================

  Scenario: Settings persist after page reload
    When I click the theme selector
    And I select "Dark" theme
    And I reload the page
    Then the theme should still be Dark

  Scenario: Settings persist after app restart
    Given I change theme to "Dark"
    And I change language to "Deutsch"
    When I close and reopen the app
    Then theme should be Dark
    And language should be German

  # ============================================
  # Mobile Specific
  # ============================================

  @mobile
  Scenario: Settings page mobile layout
    Given the viewport is 375x812 pixels
    Then settings should display in single column
    And toggles should be full width

  @mobile
  Scenario: Mobile-specific settings visible
    Given the viewport is 375x812 pixels
    Then I should see mobile-specific settings
    And I should see swipe gesture settings
