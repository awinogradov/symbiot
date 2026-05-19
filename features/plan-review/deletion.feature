Feature: Suggest a deletion
  The reviewer selects text and clicks Delete to mark it for removal. The
  feedback markdown emits a 'Suggest deleting' entry for the anchored range.

  Scenario: Drop a deletion via the selection toolbar
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Delete toolbar button
    And I click Request changes
    Then the recorded feedback contains "Suggest deleting"
    And the recorded feedback contains "quick brown fox"
