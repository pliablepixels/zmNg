Feature: Event Browsing
  As a ZoneMinder user
  I want to browse and filter security events
  So that I can review recorded incidents

  Background:
    Given I am logged into zmNg
    And the system has recorded events

  Scenario: View events list
    When I navigate to the Events page
    Then I should see the page title "Events"
    And I should see a list of events
    And each event should display:
      | field          |
      | Event ID       |
      | Monitor name   |
      | Date and time  |
      | Duration       |
      | Thumbnail      |

  Scenario: Filter events by date range
    Given I am on the Events page
    When I select "Past 24 Hours" from the date filter
    Then I should only see events from the last 24 hours
    And the event count should update

  Scenario: Filter events by monitor
    Given I am on the Events page
    And I have events from multiple monitors
    When I select "Front Door" monitor from the filter
    Then I should only see events from "Front Door" monitor
    And events from other monitors should not be visible

  Scenario: View event details
    Given I am on the Events page
    And I can see event cards
    When I click on an event card
    Then I should be on the event detail page
    And I should see the event video player
    And I should see event metadata:
      | field            |
      | Event ID         |
      | Camera name      |
      | Date and time    |
      | Duration         |
      | Frames           |
      | Alarm frames     |
      | Score            |

  Scenario: Play event video
    Given I am viewing an event detail page
    When I click the play button
    Then the event video should start playing
    And the playback progress bar should update
    And I should be able to pause the video

  Scenario: Download event video
    Given I am viewing an event detail page
    When I click the "Download Video" button
    Then a video download should be initiated
    And the filename should contain the event ID
    And the file format should be MP4

  Scenario: Jump to alarm frames
    Given I am viewing an event with alarm frames
    When I click the "First Alarm Frame" marker
    Then the video should jump to that frame
    And the current frame indicator should update

  Scenario: Navigate event timeline
    Given I am viewing an event detail page
    When I drag the timeline scrubber
    Then the video frame should update in real-time
    And the frame number should be displayed

  Scenario: Clear all event filters
    Given I have applied multiple filters
    When I click the "Clear Filters" button
    Then all filters should be reset
    And I should see all events again

  Scenario: Load more events (pagination)
    Given I am on the Events page
    And there are more than 50 events
    When I scroll to the bottom of the event list
    Then I should see a "Load More" button
    When I click "Load More"
    Then additional events should be loaded
    And the event count should increase
