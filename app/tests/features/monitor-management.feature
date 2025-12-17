Feature: Monitor Management
  As a ZoneMinder user
  I want to view and manage my security camera monitors
  So that I can monitor my property effectively

  Background:
    Given I am logged into zmNg
    And the system has at least 2 monitors configured

  Scenario: View monitor list
    When I navigate to the Monitors page
    Then I should see the page title "Monitors"
    And I should see at least 2 monitor cards
    And each monitor card should display the monitor name
    And each monitor card should show a status indicator

  Scenario: View live monitor feed
    Given I am on the Monitors page
    When I click on the "Front Door" monitor
    Then I should be on the monitor detail page
    And the URL should contain "/monitors/"
    And I should see the live stream player
    And the player should start loading within 15 seconds

  Scenario: Download monitor snapshot
    Given I am viewing the "Front Door" monitor detail page
    When I click the "Download Snapshot" button
    Then a download should be initiated
    And the downloaded filename should match "Front_Door*.jpg"
    And I should see a success notification "Snapshot downloaded"

  Scenario: View monitor properties
    Given I am viewing a monitor detail page
    When I click the "Settings" button
    Then the properties dialog should open
    And I should see the monitor ID field
    And I should see the resolution field
    And I should see the streaming URL field
    When I close the properties dialog
    Then the dialog should no longer be visible

  Scenario: Navigate back to monitor list
    Given I am viewing a monitor detail page
    When I click the back navigation button
    Then I should return to the Monitors page
    And the monitor grid should still be visible

  Scenario: Handle offline monitor
    Given a monitor is offline
    When I view the monitor list
    Then the offline monitor should display an "Offline" status
    And the offline indicator should be red or inactive

  Scenario: Handle empty monitor list
    Given the system has no monitors configured
    When I navigate to the Monitors page
    Then I should see a "No monitors found" message
    And I should see helpful text about adding monitors
