@P1 @UC1
Feature: Edit an existing annotation
  The reviewer reopens a saved comment through its pencil action, changes the
  body in the prefilled composer, and the recorded feedback reflects the edit
  rather than the original wording.

  Scenario: Edit a comment's body in place via the sidebar pencil
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "original note" into the comment composer
    And I press Enter in the comment composer
    And I edit the annotation on card 1
    Then the edit composer is visible in the viewport
    And the comment composer body reads "original note"
    When I type "sharpened note" into the comment composer
    And I save the comment composer
    And I click Request changes
    Then the recorded feedback contains "sharpened note"
    And the recorded feedback does not contain "original note"
