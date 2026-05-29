@diagnostics
Feature: Diagnostics — Browser tab title reflects the plan
  The browser tab title mirrors the top-bar context (Symbiot · {project}) and
  appends the plan's first H1 so reviewers can tell multiple open review tabs
  apart. When the plan has no H1, the title collapses to the project context.

  Scenario: The tab title appends the plan heading
    Given I open the viewer
    Then the browser tab title includes the plan heading

  Scenario: The tab title collapses when the plan has no heading
    Given I open a plan with no heading
    Then the browser tab title shows only the project context
