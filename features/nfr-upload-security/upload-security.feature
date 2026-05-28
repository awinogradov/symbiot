@P3 @NFR-3
Feature: Upload security
  POST /api/upload enforces an extension whitelist, mints UUID temp names so
  the user-supplied filename never reaches the filesystem, and only writes
  under ~/.symbiot/uploads. GET /api/image streams the bytes back.

  Scenario: A valid PNG is accepted and returns a UUID-v4 id
    Given I open the viewer
    When I POST a PNG to the upload endpoint
    Then the upload response status is 200
    And the upload response carries a canonical UUID v4
    And the uploaded image can be fetched back

  Scenario: An executable is rejected with 400
    Given I open the viewer
    When I POST an executable to the upload endpoint
    Then the upload response status is 400

  Scenario: A traversal filename is neutralized — only the extension is honored
    Given I open the viewer
    When I POST a file with a traversal name to the upload endpoint
    Then the upload response status is 200
    And the upload response carries a canonical UUID v4
