@P1 @UC1
Feature: Codex CLI plan-review round trip
  symbiot-codex run-hook intercepts a Codex Stop turn, opens the viewer, and
  emits a Codex-shaped decision from the reviewer's choice — proving the server
  contract is agent-agnostic end to end.

  Scenario: Approve returns control to Codex
    Given the codex Stop hook is reviewing a plan
    When I open the codex review
    And I click Approve
    Then the codex hook approves and exits without blocking

  Scenario: Request changes blocks the Codex turn
    Given the codex Stop hook is reviewing a plan
    When I open the codex review
    And I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Please expand the test plan" into the comment composer
    And I press Enter in the comment composer
    And I click Request changes
    Then the codex hook emits a block decision
