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

  Scenario: Edit an insertion suggestion in place
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Insert toolbar button
    And I type "insert original" into the comment composer
    And I save the comment composer
    And I edit the annotation on card 1
    Then the edit composer is visible in the viewport
    And the comment composer body reads "insert original"
    When I type "insert revised" into the comment composer
    And I save the comment composer
    And I click Request changes
    Then the recorded feedback contains "insert revised"

  Scenario: Edit a replacement suggestion in place
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Replace toolbar button
    And I type "replace original" into the comment composer
    And I save the comment composer
    And I edit the annotation on card 1
    Then the edit composer is visible in the viewport
    And the comment composer body reads "replace original"
    When I type "replace revised" into the comment composer
    And I save the comment composer
    And I click Request changes
    Then the recorded feedback contains "replace revised"

  Scenario: Edit one global comment leaves the others intact
    Given I open the viewer
    When I open the global comment composer
    And I type "global keep" into the global comment composer
    And I press Enter in the global comment composer
    And I open the global comment composer
    And I type "global original" into the global comment composer
    And I press Enter in the global comment composer
    And I edit the annotation on card 2
    Then the global edit composer is visible in the viewport
    And the global comment composer body reads "global original"
    When I type "global revised" into the global comment composer
    And I press Enter in the global comment composer
    And I click Request changes
    Then the recorded feedback contains "global revised"
    And the recorded feedback contains "global keep"
    And the recorded feedback does not contain "global original"
