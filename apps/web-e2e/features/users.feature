Feature: Managing users
  The admin adds accounts and sees who has started using theirs. Others
  do not manage users.

  Scenario: The admin adds a user, who then logs in
    Given I am logged in as the admin
    When I add the user "anna"
    Then I see the password of "anna" once
    And "anna" is marked as never logged in
    When "anna" logs in with that password on another device
    Then "anna" is marked as active

  Scenario: A user who is not an admin does not manage users
    Given the admin has added the user "bob"
    When "bob" logs in with that password
    Then there is no link to the users page
