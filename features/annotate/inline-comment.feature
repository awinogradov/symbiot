Feature: Annotate mode — the inline comment composer renders the selected text
  When the reviewer selects inline text and clicks the Comment toolbar button,
  the modal composer must mount AND render on-screen, and surface the selected
  text as a quote above the textarea so the reviewer keeps context.

  Scenario: Inline comment composer is visible in the viewport
    Given I open the viewer in annotate mode
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    Then the comment composer is visible in the viewport

  Scenario: Inline comment composer shows the selected text as a quote
    Given I open the viewer in annotate mode
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    Then the comment composer shows "quick brown fox" as a quote
