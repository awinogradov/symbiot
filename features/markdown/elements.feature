Feature: Markdown FR-1.2 element rendering
  The viewer renders every element type from the FR-1.2 supported subset.
  Phase 3.1 carries over tables, lists, fenced code, and prose typography
  that Phase 2 left as raw markdown.

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
