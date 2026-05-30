@diagnostics
Feature: Diagnostics — Debug bar version badge
  The bottom-right debug bar shows the running build's version + git SHA on
  every viewer screen. Clicking the badge copies the full SHA to the clipboard
  and the badge briefly announces the result before reverting to idle.

  Scenario: The badge is visible on the review screen
    Given I open the viewer
    Then the debug bar badge is visible
    And the debug bar badge text shows the "idle" state

  Scenario: The badge clears the sidebar controls when annotations exist
    Given I open the viewer
    When I open the global comment composer
    And I type "needs work" into the global comment composer
    And I press Enter in the global comment composer
    Then the sidebar total count reads "1"
    And the debug bar badge does not overlap the "clear-all button"
    And the debug bar badge does not overlap the "global comment button"

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

  Scenario: A second click resets the copy-state timer so the badge stays copied past the original deadline
    Given I open the viewer
    And the viewer's clock is controlled
    When I click the debug bar badge
    Then the debug bar badge text shows the "copied" state
    When the clock fast-forwards 900 ms
    Then the debug bar badge text shows the "copied" state
    When I click the debug bar badge
    And the clock fast-forwards 600 ms
    Then the debug bar badge text shows the "copied" state
