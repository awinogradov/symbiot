@P1 @UC1
Feature: Attach an image to a comment via the composer
  The reviewer selects text, opens the Comment composer, attaches an image
  via the file picker, and saves. The image preview appears in the composer
  and the comment entry retains the image reference.

  Scenario: Attach a PNG to a Comment
    Given I open the viewer
    When I select the text "quick brown fox" in the editor
    And I click the Comment toolbar button
    And I attach a PNG via the composer image button
    Then the composer shows an image preview
    When I type "see attached" into the comment composer
    And I press Enter in the comment composer
    And I click Request changes
    Then the recorded feedback contains "see attached"
