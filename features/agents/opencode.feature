@P1 @UC1
Feature: OpenCode plugin plan-review round trip
  The symbiot OpenCode plugin saves the assistant's response on session.idle, opens
  the viewer, and delivers the reviewer's feedback into the next turn — proving the
  fire-and-forget workaround survives the session boundary without blocking the host.

  Scenario: Reviewer feedback reaches the next OpenCode turn
    Given the opencode plugin is reviewing an idle session
    When I open the opencode review
    And I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Please expand the test plan" into the comment composer
    And I press Enter in the comment composer
    And I click Request changes
    Then the opencode plugin saves the response to the inbox
    And the opencode plugin injects the feedback into the next turn
