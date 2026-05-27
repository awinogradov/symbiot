Feature: Three-kind feedback gate
  The reviewer drops one Comment, one Deletion, and one Global Comment,
  then submits Request changes. The resulting feedback markdown contains
  all three annotation kinds.

  Scenario: All three annotation types end-to-end in one denial
    Given I open the viewer
    # Comment
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Should this be a wolf?" into the comment composer
    And I press Enter in the comment composer
    # Deletion
    And I select the text "lazy dog" in the editor
    And I click the Delete toolbar button
    # Global comment
    And I open the global comment composer
    And I type "Overall: tighten the framing" into the global comment composer
    And I press Enter in the global comment composer
    # Submit
    And I click Request changes
    Then the recorded feedback contains "Feedback on:"
    And the recorded feedback contains "Should this be a wolf?"
    And the recorded feedback contains "Suggest deleting"
    And the recorded feedback contains "lazy dog"
    And the recorded feedback contains "General feedback"
    And the recorded feedback contains "tighten the framing"
