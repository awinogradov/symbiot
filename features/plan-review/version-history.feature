Feature: Version history sidebar tab
  When more than one version of a plan is persisted under
  ~/.symbiot/history, the right-hand sidebar gains a "History" tab that lists
  every version with the current one highlighted. With only a single version
  the tab bar stays hidden so the sidebar keeps its single-purpose UX.

  Scenario: History tab appears when a second plan version exists
    Given a second version of the plan exists on disk
    And I open the viewer
    Then the sidebar history tab is visible
    When I click the sidebar history tab
    Then the version browser is visible
    And the current version row is marked active

  Scenario: Re-selecting the active version is a no-op
    Given a second version of the plan exists on disk
    And I open the viewer
    When I click the sidebar history tab
    And I click the current version row
    Then the current version row is marked active
