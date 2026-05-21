Feature: Version history inline diff
  When the reviewer selects a non-current plan version in the History tab,
  the editor switches to a read-only `DiffEditor` rendering the inline diff
  between the selected version and its predecessor. A Clean/Raw toggle
  appears above the version list and controls whether unchanged blocks are
  filtered out.

  Scenario: Diff toggle is hidden on the current version
    Given a second version of the plan exists on disk
    And I open the viewer
    When I click the sidebar history tab
    Then the diff mode toggle is not visible

  Scenario: Selecting a historical version reveals the diff editor and toggle
    Given a second version of the plan exists on disk
    And I open the viewer
    When I click the sidebar history tab
    And I select the predecessor version row
    Then the diff editor is visible
    And the diff mode toggle is visible
    And the diff mode is "clean"

  Scenario: Switching to Raw re-shows unchanged blocks
    Given a second version of the plan exists on disk
    And I open the viewer
    When I click the sidebar history tab
    And I select the predecessor version row
    And I click the diff mode raw trigger
    Then the diff editor is in "raw" mode
