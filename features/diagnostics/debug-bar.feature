Feature: Diagnostics — Debug bar version badge
  The bottom-right debug bar shows the running build's version + git SHA on
  every viewer screen. Clicking the badge copies the full SHA to the clipboard
  and the badge briefly announces the result before reverting to idle.

  Scenario: The badge is visible on the review screen
    Given I open the viewer
    Then the debug bar badge is visible

  Scenario: Clicking the badge copies the SHA and shows a confirmation
    Given I open the viewer
    When I click the debug bar badge
    Then the debug bar badge announces "copied"
    And the badge aria-label confirms the copy

  Scenario: The confirmation reverts to idle after a short delay
    Given I open the viewer
    When I click the debug bar badge
    Then the debug bar badge announces "copied"
    When I wait for the debug bar badge to return to idle
    Then the debug bar badge announces "idle"

  Scenario: A failed clipboard write reports failure
    Given I open the viewer
    And the clipboard rejects writes
    When I click the debug bar badge
    Then the debug bar badge announces "failed"

  Scenario: Missing clipboard support reports failure synchronously
    Given I open the viewer
    And the clipboard is unavailable
    When I click the debug bar badge
    Then the debug bar badge announces "failed"

  Scenario: A second click while still showing the confirmation resets the timer
    Given I open the viewer
    When I click the debug bar badge
    Then the debug bar badge announces "copied"
    When I click the debug bar badge again
    Then the debug bar badge announces "copied"
