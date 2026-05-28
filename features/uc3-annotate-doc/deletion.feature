@P1 @UC3
Feature: Annotate mode — suggest a deletion
  In annotate mode the reviewer can select text and click Delete on the
  floating toolbar to mark it for removal. Submitting routes through
  POST /api/feedback and the recorded feedback contains a 'Suggest deleting'
  entry for the anchored range.

  Scenario: Drop a deletion via the selection toolbar in annotate mode
    Given I open the viewer in annotate mode
    When I select the text "quick brown fox" in the editor
    And I click the Delete toolbar button
    And I click Request changes
    Then the recorded annotate feedback contains "Suggest deleting"
    And the recorded annotate feedback contains "quick brown fox"
