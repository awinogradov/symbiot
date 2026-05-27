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
