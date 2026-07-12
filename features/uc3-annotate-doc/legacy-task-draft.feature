@P1 @UC3
Feature: Annotate mode — task toggles persisted by an older build
  The task checkbox was removed, so nothing creates task toggles any more. Drafts
  saved before that still carry them (a draft persists the raw editor value), so
  the viewer must still project each toggle into the sidebar, strike the item a
  toggle marked done, and let the reviewer clear it.

  Scenario: A draft carrying task toggles still projects and removes them
    Given a draft persisted by an older build carries a task toggle
    When I open the viewer in annotate mode
    Then the annotation sidebar shows a task entry "Mark as done"
    And the annotation sidebar shows a task entry "Mark as not done"
    And the task item "Open task" is struck through
    And the task item "Completed task" is not struck through
    When I remove the annotation on card 1 and confirm
    Then the task item "Open task" is not struck through
    And the annotation sidebar shows a task entry "Mark as not done"
