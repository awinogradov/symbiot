Feature: Settings — Theme toggle persists explicit user choice
  The Settings dialog hosts a System/Light/Dark toggle. Explicit choices
  persist across reloads via localStorage["symbiot.theme"]; System mode
  follows the OS preference and is never persisted.

  Scenario: Switching to Dark persists across reloads
    Given I open the viewer
    When I open the Settings dialog
    And I choose the "Dark" theme
    And I close the Settings dialog
    Then the html has the dark class
    When I reload the viewer
    Then the html has the dark class

  Scenario: System mode follows OS dark preference
    Given the OS color scheme is "dark"
    And I open the viewer
    When I open the Settings dialog
    And I choose the "System" theme
    Then the html has the dark class

  Scenario: Explicit Light overrides OS dark across reloads
    Given the OS color scheme is "dark"
    And I open the viewer
    When I open the Settings dialog
    And I choose the "Light" theme
    And I close the Settings dialog
    Then the html does not have the dark class
    When I reload the viewer
    Then the html does not have the dark class

  Scenario: Explicit Light overrides OS dark in prose colors
    Given the OS color scheme is "dark"
    And I open the viewer
    When I open the Settings dialog
    And I choose the "Light" theme
    And I close the Settings dialog
    Then the prose body text uses the light-theme color
