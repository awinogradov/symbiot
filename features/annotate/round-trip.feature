Feature: Annotate mode — submit feedback for an arbitrary markdown file
  When the viewer launches in annotate mode (via `symbiot annotate <file.md>`),
  the top bar shows 'Submit feedback' instead of Approve/Request-changes, and
  submitting routes through POST /api/feedback (writes to
  ~/.symbiot/annotations/{project}/{slug}/00N.md).

  Scenario: Drop a comment in annotate mode and submit
    Given I open the viewer in annotate mode
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Should this be a wolf?" into the comment composer
    And I press Enter in the comment composer
    And I click Request changes
    Then the recorded annotate feedback contains "Should this be a wolf?"
