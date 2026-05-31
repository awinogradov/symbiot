@P1 @UC1
Feature: Copilot CLI plan-review round trip
  symbiot-copilot run-hook intercepts a Copilot agentStop turn, reads the turn's
  transcript, opens the viewer, and emits a Copilot-shaped decision from the
  reviewer's choice — proving the server contract is agent-agnostic end to end.

  Scenario: Approve returns control to Copilot
    Given the copilot agentStop hook is reviewing a plan
    When I open the copilot review
    And I click Approve
    Then the copilot hook approves and exits without blocking

  Scenario: Request changes blocks the Copilot turn
    Given the copilot agentStop hook is reviewing a plan
    When I open the copilot review
    And I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Please expand the test plan" into the comment composer
    And I press Enter in the comment composer
    And I click Request changes
    Then the copilot hook emits a block decision
