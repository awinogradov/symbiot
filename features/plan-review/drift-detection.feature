Feature: Annotation drift detection
  When a saved draft carries a comment whose captured `originalText` snapshot
  no longer matches any text in the current plan, the walker tags the entry
  `drifted: true` and the sidebar surfaces a red "drifted" badge. When the
  snapshot still matches, no badge appears.

  Scenario: Sidebar surfaces a drift badge when stored anchor text is gone
    Given a draft seeded with a comment whose stored anchor is missing from the plan
    And I open the viewer
    Then the drift badge for the seeded comment is visible

  Scenario: No drift badge when stored anchor still matches the live text
    Given a draft seeded with a comment whose stored anchor matches the plan
    And I open the viewer
    Then the drift badge for the seeded comment is not visible
