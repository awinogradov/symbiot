Feature: Plan-review hotkey gating
  The plan-review hotkeys (Mod+Enter, c, i, r, d) must stay quiet when a
  modal dialog steals focus — pressing a hotkey while the Settings dialog is
  open must not approve / submit / open a composer behind the dialog.

  Scenario: Mod+Enter is suppressed while the Settings dialog is open
    Given I open the viewer
    When I open the Settings dialog
    And I press "Mod+Enter"
    Then the Settings dialog is still visible
    And no approval has been recorded

  Scenario: Mod+Enter routes to submit once annotations exist
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I type "Should this be a wolf?" into the comment composer
    And I press Enter in the comment composer
    And I press "Mod+Enter"
    Then the submission was recorded
