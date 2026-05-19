Feature: Annotate mode — the inline comment composer is visible after clicking Comment
  When the reviewer selects inline text and clicks the Comment toolbar button,
  the popover composer must mount AND render on-screen (positioned next to
  the selection). A composer that mounts off-screen is invisible to the user
  and indistinguishable from "comment doesn't work".

  Scenario: Inline comment composer is visible in the viewport
    Given I open the viewer in annotate mode
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    Then the comment composer is visible in the viewport

  Scenario: Inline comment composer is anchored near the selected text
    Given I open the viewer in annotate mode
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    Then the comment composer is anchored near the selected text
