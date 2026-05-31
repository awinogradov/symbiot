@P1 @UC1
Feature: Gemini CLI plan-review round trip
  symbiot-gemini run-hook intercepts a Gemini AfterAgent turn, opens the viewer,
  and emits a Gemini-shaped decision from the reviewer's choice — proving the
  server contract is agent-agnostic end to end.

  Scenario: Approve returns control to Gemini
    Given the gemini AfterAgent hook is reviewing a plan
    When I open the gemini review
    And I click Approve
    Then the gemini hook approves and exits without blocking

  Scenario: Request changes blocks the Gemini turn
    Given the gemini AfterAgent hook is reviewing a plan
    When I open the gemini review
    And I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Please expand the test plan" into the comment composer
    And I press Enter in the comment composer
    And I click Request changes
    Then the gemini hook emits a block decision
