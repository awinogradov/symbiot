Feature: Diagnostics — Debug bar version badge
  The bottom-right debug bar shows the running build's version + git SHA on
  every viewer screen. Clicking the badge copies the full SHA to the clipboard
  and the badge briefly announces the result before reverting to idle.

  Scenario: The badge is visible on the review screen
    Given I open the viewer
    Then the debug bar badge is visible
    And the debug bar badge text shows the "idle" state

  Scenario: Clicking the badge writes the full SHA to the clipboard and announces "copied"
    Given I open the viewer
    And the clipboard writes are spied on
    When I click the debug bar badge
    Then the debug bar badge text shows the "copied" state
    And the clipboard received the full build SHA

  Scenario: The confirmation reverts to idle after the copy state expires
    Given I open the viewer
    When I click the debug bar badge
    Then the debug bar badge text shows the "copied" state
    And the debug bar badge text shows the "idle" state

  Scenario: A failed clipboard write reports failure
    Given I open the viewer
    And the clipboard rejects writes
    When I click the debug bar badge
    Then the debug bar badge text shows the "failed" state

  Scenario: A missing clipboard reports failure synchronously
    Given I open the viewer
    And the clipboard is unavailable
    When I click the debug bar badge
    Then the debug bar badge text shows the "failed" state

  Scenario: A second click extends the confirmation past the original timer's deadline
    Given I open the viewer
    When I click the debug bar badge
    Then the debug bar badge text shows the "copied" state
    When I wait 900 ms
    Then the debug bar badge text shows the "copied" state
    When I click the debug bar badge
    And I wait 600 ms
    Then the debug bar badge text shows the "copied" state
