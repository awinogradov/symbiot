@P1 @UC1
Feature: Approve the plan
  The reviewer opens the viewer, clicks Approve, and the hook IPC receives an approve decision.

  Scenario: Smoke — approve a plan end-to-end
    Given I open the viewer
    When I click Approve
    Then the recorded decision is "approve"
