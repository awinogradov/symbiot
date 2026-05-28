@P1 @UC1
Feature: Suggest an insertion
  The reviewer selects context text, clicks Insert, types the new text into
  the popover composer, saves, then Requests changes. The recorded feedback
  markdown includes "Insert after" with the context and the proposed text.

  Scenario: Drop an insertion via the popover composer
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Insert toolbar button
    And I type "and the agile cat" into the comment composer
    And I press Enter in the comment composer
    Then the sidebar total count reads "1"
    When I click Request changes
    Then the recorded feedback contains "Insert after"
    And the recorded feedback contains "quick brown fox"
    And the recorded feedback contains "and the agile cat"
