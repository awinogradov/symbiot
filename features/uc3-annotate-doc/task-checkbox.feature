@P1 @UC3
Feature: Annotate mode — task checkbox feedback
  Toggling a GFM task checkbox records it as a task annotation. The sidebar
  projects the toggle with a "Mark as done" body when the box ends up checked
  and "Mark as not done" when it ends up unchecked.

  Scenario: Toggling task checkboxes records them in the annotation sidebar
    Given I open the viewer in annotate mode
    When I toggle task checkbox 1
    And I toggle task checkbox 2
    Then the annotation sidebar shows a task entry "Mark as done"
    And the annotation sidebar shows a task entry "Mark as not done"
