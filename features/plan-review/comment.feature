Feature: Comment via composer
  The reviewer selects text, clicks Comment, types a body into the popover
  composer, saves, then Requests changes. The recorded feedback markdown
  includes the body.

  Scenario: Drop a comment via the popover composer (replaces window.prompt)
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Should this be a wolf?" into the comment composer
    And I press Enter in the comment composer
    And I click Request changes
    Then the recorded feedback contains "Should this be a wolf?"
