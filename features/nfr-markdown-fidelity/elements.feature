@NFR-4 @smoke
Feature: Markdown element rendering
  The viewer renders every element type in its supported markdown subset:
  headings, paragraphs, lists, fenced code, tables, inline code, and prose
  typography.

  Scenario: Headings render as native HTML headings
    Given I open the viewer
    Then I see a rendered heading at level 1
    And I see a rendered heading at level 2

  Scenario: Lists render as native HTML lists
    Given I open the viewer
    Then I see at least one rendered list

  Scenario: Fenced code blocks render as native pre/code
    Given I open the viewer
    Then I see a rendered fenced code block

  Scenario: Inline code renders without the markdown backticks leaking through
    Given I open the viewer
    Then inline code renders without backticks
