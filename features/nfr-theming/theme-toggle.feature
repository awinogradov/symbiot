@NFR-9
Feature: Settings — Theme toggle persists explicit user choice
  The Settings menu hosts a System/Light/Dark radio group. Explicit choices
  persist across reloads via localStorage["symbiot.theme"]; System mode
  follows the OS preference and is never persisted. Selecting a theme closes
  the menu (Radix default), so scenarios assert directly after choosing.

  @smoke
  Scenario: Switching to Dark persists across reloads
    Given I open the viewer
    When I open the Settings menu
    And I choose the "Dark" theme
    Then the html has the dark class
    When I reload the viewer
    Then the html has the dark class

  @smoke
  Scenario: System mode follows OS dark preference
    Given the OS color scheme is "dark"
    And I open the viewer
    When I open the Settings menu
    And I choose the "System" theme
    Then the html has the dark class

  Scenario: Explicit Light overrides OS dark across reloads
    Given the OS color scheme is "dark"
    And I open the viewer
    When I open the Settings menu
    And I choose the "Light" theme
    Then the html does not have the dark class
    When I reload the viewer
    Then the html does not have the dark class

  Scenario: Explicit Light overrides OS dark in prose colors
    Given the OS color scheme is "dark"
    And I open the viewer
    When I open the Settings menu
    And I choose the "Light" theme
    Then the prose body text uses the light-theme color

  Scenario: Escape closes the Settings menu without changing the theme
    Given I open the viewer
    When I open the Settings menu
    And I close the Settings menu
    Then the html does not have the dark class
