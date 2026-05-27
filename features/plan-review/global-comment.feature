Feature: Add a global comment
  The reviewer opens the Global comment composer from the editor column FAB,
  types a body, and submits. The feedback markdown emits a 'General feedback'
  section with the quoted body.

  Scenario: Drop a global comment via the editor-column composer
    Given I open the viewer
    When I open the global comment composer
    And I type "Overall direction looks great" into the global comment composer
    And I press Enter in the global comment composer
    And I click Request changes
    Then the recorded feedback contains "General feedback"
    And the recorded feedback contains "Overall direction looks great"

  Scenario: Removing a global comment via the sidebar drops it from the list
    Given I open the viewer
    When I open the global comment composer
    And I type "Stub global comment" into the global comment composer
    And I press Enter in the global comment composer
    And I remove the annotation on card 1 and confirm
    Then the sidebar total count reads "0"
