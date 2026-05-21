Feature: Sidebar — annotations list and clear-all
  The right-hand sidebar shows the count of dropped annotations and lets the
  reviewer wipe them with a confirmed destructive action.

  Scenario: Sidebar shows the count of dropped annotations
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Should this be a wolf?" into the comment composer
    And I press Enter in the comment composer
    Then the sidebar total count reads "1"

  Scenario: Clear-all removes all annotations after confirmation
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Should this be a wolf?" into the comment composer
    And I press Enter in the comment composer
    And I clear all annotations and confirm
    Then the sidebar total count reads "0"

  Scenario: Remove a single annotation via the card's close button
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Should this be a wolf?" into the comment composer
    And I press Enter in the comment composer
    And I select the text "lazy dog" in the editor
    And I click the Comment toolbar button
    And I type "Maybe energetic dog?" into the comment composer
    And I press Enter in the comment composer
    Then the sidebar total count reads "2"
    When I remove the annotation on card 1 and confirm
    Then the sidebar total count reads "1"

  Scenario: Cancel removal keeps the annotation
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Should this be a wolf?" into the comment composer
    And I press Enter in the comment composer
    Then the sidebar total count reads "1"
    When I open the remove dialog on card 1 and cancel
    Then the sidebar total count reads "1"
