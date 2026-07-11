@P1 @UC5
Feature: Iterate on a draft revision
  When the agent re-opens the viewer with a refined revision (same slug, so a
  predecessor exists on disk), the session leads with the inline diff between
  the previous version and the revision; Back to editing returns the author to
  the editable surface.

  Scenario: A reopened revision leads with the inline diff
    Given I open the draft iterate viewer
    Then the diff editor is visible
    When I click the sidebar history tab
    And I click the back to editing button
    Then the draft editor is visible
