@P1 @UC1
Feature: Suggest a replacement
  The reviewer selects text, clicks Replace, types the replacement into the
  popover composer, saves, then Requests changes. The recorded feedback markdown
  uses the "Suggest replacing"/"Replace with:" form for the R tuple.

  @smoke
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

  Scenario Outline: Cancelling the replacement composer via <route> discards the applied highlight
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Replace toolbar button
    Then the "replacement" highlight is visible in the editor
    When I <dismiss>
    Then the "replacement" highlight is absent from the editor

    Examples:
      | route         | dismiss                                     |
      | Cancel button | click the comment composer Cancel button    |
      | Escape        | press Escape in the comment composer        |
      | overlay click | close the comment composer via the overlay  |
