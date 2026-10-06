Feature: Deleting the own account
  A user deletes only their own account, after confirming the password.
  Someone must always stay able to add users.

  Scenario: A user deletes their account
    Given the admin has added the user "carol"
    And "carol" logs in with that password
    When I delete my account with my password
    Then I see the login form
    And "carol" can no longer log in

  Scenario: A wrong password keeps the account
    Given the admin has added the user "dave"
    And "dave" logs in with that password
    When I delete my account with the password "wrong"
    Then I see the error "The password is not correct"

  Scenario: The last admin cannot delete the account
    Given I am logged in as the admin
    When I delete my account with my password
    Then I see the error "This is the last account that can add users, so it cannot be deleted"
