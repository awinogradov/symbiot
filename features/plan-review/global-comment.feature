Feature: Add a global comment
  The reviewer opens the Global comment composer from the top bar, types a
  body, and submits. The feedback markdown emits a 'General feedback'
  section with the quoted body.

  Scenario: Drop a global comment via the top-bar composer
    Given I open the viewer
    When I open the global comment composer
    And I type "Overall direction looks great" into the global comment composer
    And I press Enter in the global comment composer
    And I click Request changes
    Then the recorded feedback contains "General feedback"
    And the recorded feedback contains "Overall direction looks great"
