Feature: Compare current with predecessor
  When the reviewer is on the boot (current) version AND a predecessor exists,
  the History tab exposes a "Compare with previous" button. Clicking it flips
  the editor pane into a read-only diff overlay of current vs predecessor.
  "Back to editing" exits the overlay and restores the editable editor.

  Scenario: Compare button is hidden when no predecessor exists
    Given I open the viewer
    Then the compare with previous button is not visible

  Scenario: Compare button appears on the current version with a predecessor
    Given a second version of the plan exists on disk
    And I open the viewer
    When I click the sidebar history tab
    Then the compare with previous button is visible

  Scenario: Clicking compare reveals the diff editor and lets the reviewer exit
    Given a second version of the plan exists on disk
    And I open the viewer
    When I click the sidebar history tab
    And I click the compare with previous button
    Then the diff editor is visible
    And the back to editing button is visible
    When I click the back to editing button
    Then the editor root is visible
