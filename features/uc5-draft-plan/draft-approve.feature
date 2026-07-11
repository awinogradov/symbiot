@P1 @UC5
Feature: Approve a draft plan
  Approve ends the iteration loop: the final body is persisted as a version
  and its path travels to the blocking CLI, which hands the agreed plan to the
  coding agent to implement.

  Scenario: Approve persists the final body and hands the plan to the agent
    Given I open the draft viewer
    When I approve the draft
    Then an approve decision is recorded pointing at the persisted plan
    And the submitted screen confirms the plan was approved
