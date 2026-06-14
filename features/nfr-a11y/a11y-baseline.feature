@NFR-5
Feature: WCAG AA accessibility baseline — axe-core scan
  Lock today's clean a11y state in place so the next icon button or modal can
  not regress us silently. Each scenario opens a viewer surface (shell, sidebar,
  inline composer, settings menu, global composer) and runs axe-core with the
  WCAG 2.0/2.1 A and AA tag sets, asserting zero Critical or Serious findings.
  Minor / Moderate violations are recorded in the attached JSON but are
  intentionally non-blocking — see docs/06-a11y.md for the policy.

  Scenario: the viewer shell has no Critical or Serious WCAG AA violations
    Given I open the viewer
    Then the page has no Critical or Serious WCAG AA violations

  Scenario: the inline comment composer has no Critical or Serious WCAG AA violations
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And the comment composer is visible in the viewport
    Then the page has no Critical or Serious WCAG AA violations

  Scenario: the annotation sidebar has no Critical or Serious WCAG AA violations
    Given I open the viewer in annotate mode
    And I have at least one annotation persisted
    Then the page has no Critical or Serious WCAG AA violations

  Scenario: the Settings menu has no Critical or Serious WCAG AA violations
    Given I open the viewer
    When I open the Settings menu
    Then the page has no Critical or Serious WCAG AA violations

  Scenario: the global comment composer has no Critical or Serious WCAG AA violations
    Given I open the viewer in annotate mode
    When I open the global comment composer
    And the global comment composer is visible in the viewport
    Then the page has no Critical or Serious WCAG AA violations
