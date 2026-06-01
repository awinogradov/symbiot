@P1 @UC3
Feature: Annotate mode — annotations render inside fenced code blocks
  Code blocks are a routine part of the plans these agents produce, so a
  reviewer must be able to select a token inside a fenced code block, comment on
  it, and SEE the resulting mark — rendered alongside Shiki syntax highlighting.
  Guards #174, where the code was an opaque highlighted blob: selecting a token
  never reached the editor and any mark was invisible.

  Scenario: Code blocks render selectable, syntax-highlighted tokens
    Given I open the viewer in annotate mode
    Then the code block has syntax-highlighted tokens

  Scenario: Comment a token inside a code block and see the mark
    Given I open the viewer in annotate mode
    When I scroll the code block into view
    And I select the text "greeting" in the editor
    And I click the Comment toolbar button
    Then the comment composer shows "greeting" as a quote
    When I type "name this better" into the comment composer
    And I press Enter in the comment composer
    Then a comment annotation mark is visible inside the code block
