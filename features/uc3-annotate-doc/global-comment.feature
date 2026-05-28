@P1 @UC3
Feature: Annotate mode — add a global comment
  In annotate mode the reviewer opens the Global comment composer from the
  editor column FAB, types a body, and submits. The recorded annotate feedback
  emits a 'General feedback' section with the quoted body.

  Scenario: Drop a global comment via the editor-column composer in annotate mode
    Given I open the viewer in annotate mode
    When I open the global comment composer
    And I type "Overall direction looks great" into the global comment composer
    And I press Enter in the global comment composer
    And I click Request changes
    Then the recorded annotate feedback contains "General feedback"
    And the recorded annotate feedback contains "Overall direction looks great"
