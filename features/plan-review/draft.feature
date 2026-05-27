Feature: Draft persistence across reloads
  The reviewer's in-progress annotations are POSTed to /api/draft and
  restored on reload so they aren't lost. Approve / Submit clear the
  draft via DELETE /api/draft.

  Scenario: A failing draft load is logged to the console without crashing the viewer
    Given the draft endpoint always returns 500
    And a console error listener is installed
    And I open the viewer
    Then a console error containing "failed to load draft" was logged
    And the editor is still visible

  Scenario: A draft is POSTed after dropping a comment
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Should this be a wolf?" into the comment composer
    And I press Enter in the comment composer
    Then a draft was POSTed at least once

  Scenario: Reloading the viewer keeps the annotated text rendered
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Should this be a wolf?" into the comment composer
    And I press Enter in the comment composer
    And I reload the page
    Then the editor still shows a comment mark on "quick brown fox"
