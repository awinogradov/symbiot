@P1 @UC1
Feature: Suggest a replacement
  The reviewer selects text, clicks Replace, types the replacement into the
  popover composer, saves, then Requests changes. The recorded feedback markdown
  uses the "Suggest replacing"/"Replace with:" form for the R tuple.

  Scenario: Drop a replacement via the popover composer
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Replace toolbar button
    And I type "swift auburn vulpine" into the comment composer
    And I press Enter in the comment composer
    Then the sidebar total count reads "1"
    When I click Request changes
    Then the recorded feedback contains "Suggest replacing:"
    And the recorded feedback contains "quick brown fox"
    And the recorded feedback contains "swift auburn vulpine"
    And the recorded feedback contains "Replace with:"
