@P1 @UC1
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

  Scenario: Reopen the composer after pressing Escape
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    Then the comment composer is visible in the viewport
    When I press Escape in the comment composer
    And I select the text "lazy dog" in the editor
    And I click the Comment toolbar button
    Then the comment composer is visible in the viewport
    And the comment composer shows "lazy dog" as a quote

  Scenario: Reopen the composer after closing via overlay click
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    Then the comment composer is visible in the viewport
    When I close the comment composer via the overlay
    And I select the text "lazy dog" in the editor
    And I click the Comment toolbar button
    Then the comment composer is visible in the viewport

  Scenario: Reopen the composer after clicking the Cancel button
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    Then the comment composer is visible in the viewport
    When I click the comment composer Cancel button
    And I select the text "lazy dog" in the editor
    And I click the Comment toolbar button
    Then the comment composer is visible in the viewport

  Scenario: Reopen the composer after saving the first comment
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "first" into the comment composer
    And I save the comment composer
    Then the comment composer is not visible in the viewport
    When I select the text "lazy dog" in the editor
    And I click the Comment toolbar button
    Then the comment composer is visible in the viewport
    And the comment composer shows "lazy dog" as a quote
