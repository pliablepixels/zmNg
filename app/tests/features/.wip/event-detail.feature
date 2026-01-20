Feature: Event Detail Page - Complete Interaction Testing
  As a ZoneMinder user viewing an event
  I want to interact with all video controls and event actions
  So that I can review and manage recorded events

  Background:
    Given I am logged into zmNg
    When I navigate to the "Events" page
    And I wait for events to load
    And I click into the first event if events exist

  # ============================================
  # Video Playback Controls
  # ============================================

  Scenario: Video player loads and displays event
    Then I should see the event video player if on detail page
    And the video should show first frame

  Scenario: Play and pause video
    Given I am on event detail page
    When I click the play button
    Then the video should start playing
    And the play button should change to pause
    When I click the pause button
    Then the video should pause
    And the pause button should change to play

  Scenario: Seek video with progress bar
    Given I am on event detail page
    And the video is playing
    When I click on the progress bar at 50%
    Then the video should seek to that position
    And the current time should update

  Scenario: Seek video with keyboard
    Given I am on event detail page
    When I press the right arrow key
    Then the video should skip forward 10 seconds
    When I press the left arrow key
    Then the video should skip backward 10 seconds

  Scenario: Adjust volume
    Given I am on event detail page
    When I click the volume button
    Then I should see the volume slider
    When I drag the volume slider to 50%
    Then the volume should be at 50%

  Scenario: Mute and unmute video
    Given I am on event detail page
    When I click the mute button
    Then the video should be muted
    And the mute icon should show muted state
    When I click the mute button again
    Then the video should be unmuted

  Scenario: Toggle video fullscreen
    Given I am on event detail page
    When I click the fullscreen button
    Then the video should enter fullscreen
    When I press Escape key
    Then the video should exit fullscreen

  Scenario: Change playback speed
    Given I am on event detail page
    When I click the playback speed button
    Then I should see speed options
    When I select 2x speed
    Then the video should play at 2x speed

  # ============================================
  # Event Actions
  # ============================================

  Scenario: Favorite event from detail page
    Given I am on event detail page
    When I click the favorite button
    Then the event should be marked as favorite
    And I should see favorite success toast

  Scenario: Unfavorite event from detail page
    Given I am on event detail page
    And the event is favorited
    When I click the favorite button
    Then the event should be unmarked as favorite

  Scenario: Download event video
    Given I am on event detail page
    When I click the download video button
    Then I should see download started in background tasks
    And the download progress should be visible
    And the download should complete successfully

  Scenario: Download event snapshot
    Given I am on event detail page
    When I click the download snapshot button
    Then I should see snapshot download initiated

  Scenario: Delete event with confirmation
    Given I am on event detail page
    When I click the delete event button
    Then I should see delete confirmation dialog
    When I confirm deletion
    Then I should navigate back to events list
    And I should see event deleted toast

  Scenario: Cancel event deletion
    Given I am on event detail page
    When I click the delete event button
    Then I should see delete confirmation dialog
    When I cancel deletion
    Then the dialog should close
    And I should remain on event detail page

  # ============================================
  # Event Navigation
  # ============================================

  Scenario: Navigate to next event
    Given I am on event detail page
    And there are multiple events
    When I click the next event button
    Then I should navigate to the next event
    And the event info should update

  Scenario: Navigate to previous event
    Given I am on event detail page
    And there are multiple events
    When I click the previous event button
    Then I should navigate to the previous event

  Scenario: Swipe navigation between events
    Given I am on event detail page
    When I swipe left on the video
    Then I should navigate to the next event if available
    When I swipe right on the video
    Then I should navigate to the previous event if available

  Scenario: Navigate back to events list
    Given I am on event detail page
    When I click the back button
    Then I should return to events list
    And I should see events list or empty state

  # ============================================
  # Event Information Display
  # ============================================

  Scenario: View event metadata
    Given I am on event detail page
    Then I should see event start time
    And I should see event end time
    And I should see event duration
    And I should see event monitor name

  Scenario: View event cause/notes
    Given I am on event detail page
    Then I should see event cause if available
    And I should see event notes if available

  Scenario: View event frames count
    Given I am on event detail page
    Then I should see total frames count
    And I should see alarm frames count

  # ============================================
  # Frame Navigation
  # ============================================

  Scenario: Jump to specific frame
    Given I am on event detail page
    When I open the frame navigator
    And I enter frame number "50"
    Then the video should jump to frame 50

  Scenario: Step through frames
    Given I am on event detail page
    When I click the next frame button
    Then the video should advance one frame
    When I click the previous frame button
    Then the video should go back one frame

  Scenario: Jump to alarm frame
    Given I am on event detail page
    And the event has alarm frames
    When I click the jump to alarm button
    Then the video should jump to first alarm frame

  # ============================================
  # Sharing
  # ============================================

  Scenario: Share event link
    Given I am on event detail page
    When I click the share button
    Then I should see share options
    When I click copy link
    Then the event link should be copied to clipboard
    And I should see link copied toast

  # ============================================
  # Error Handling
  # ============================================

  Scenario: Handle video load failure
    Given the event video fails to load
    Then I should see video error message
    And I should see retry button
    When I click retry
    Then the video should attempt to reload

  Scenario: Handle event not found
    Given the event ID does not exist
    Then I should see event not found message
    And I should see link to return to events list

  # ============================================
  # Mobile Specific
  # ============================================

  @mobile
  Scenario: Video controls on mobile
    Given the viewport is 375x812 pixels
    And I am on event detail page
    Then the video controls should be mobile-optimized
    And tap to play/pause should work

  @mobile
  Scenario: Swipe gestures on mobile
    Given the viewport is 375x812 pixels
    And I am on event detail page
    When I swipe down on video
    Then the video should minimize
    And I should see event details below
