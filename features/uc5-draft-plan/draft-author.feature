@P1 @UC5
Feature: Author a draft plan
  Draft mode is the edit-first inverse of plan review: the developer writes
  plan markdown directly in the viewer and sends it to the coding agent as a
  persisted revision.

  Scenario: Draft mode presents an editable authoring surface
    Given I open the draft viewer
    Then the draft editor is visible
    And the draft top bar offers Send to agent and Approve
    And the annotation toolbar is not available

  Scenario: Typing lands in the draft document
    Given I open the draft viewer
    When I type "BDD typed this." into the draft editor
    Then the draft editor contains "BDD typed this."

  Scenario: Typed draft text survives a reload via autosave
    Given I open the draft autosave viewer
    When I type "Autosaved sentence." into the draft editor
    And the draft body autosave has flushed
    And I reload the draft viewer page
    Then the draft editor contains "Autosaved sentence."

  Scenario: Send to agent persists the revision and resolves a draft decision
    Given I open the draft viewer
    When I send the draft to the agent
    Then a draft decision is recorded pointing at a persisted revision
    And the submitted screen confirms the draft was sent
