Feature: Keyboard shortcuts — drive the reviewer surface without the mouse
  The plan-review surface binds five hotkeys so reviewers can submit, comment,
  insert, replace, and delete without leaving the keyboard. The `c` key is
  context-sensitive: it opens the inline comment composer when there is an
  editor text selection, otherwise it opens the global comment composer. The
  composer textarea keeps its own Enter/Esc semantics so global hotkeys do not
  fire while the reviewer is typing.

  Scenario: c with no selection opens the global comment composer
    Given I open the viewer in annotate mode
    When I press "c" anywhere outside the editor
    Then the global comment composer is visible in the viewport

  Scenario: c with a selection opens the inline comment composer
    Given I open the viewer in annotate mode
    When I select the text "quick brown fox" in the editor
    And I press "c" anywhere outside the editor
    Then the comment composer is visible in the viewport
    And the comment composer shows "quick brown fox" as a quote

  Scenario: i with a selection opens the insertion composer
    Given I open the viewer in annotate mode
    When I select the text "quick brown fox" in the editor
    And I press "i" anywhere outside the editor
    Then the comment composer is visible in the viewport

  Scenario: r with a selection opens the replacement composer
    Given I open the viewer in annotate mode
    When I select the text "quick brown fox" in the editor
    And I press "r" anywhere outside the editor
    Then the comment composer is visible in the viewport

  Scenario: Mod+Enter approves a clean plan
    Given I open the viewer
    When I press "Mod+Enter" anywhere outside the editor
    Then the recorded decision is "approve"

  Scenario: Mod+Enter is suppressed while a composer dialog is open
    Given I open the viewer in annotate mode
    When I open the global comment composer
    And I move focus to the global composer Cancel button
    And I press "Mod+Enter" in the global comment composer
    Then the global comment composer is visible in the viewport
