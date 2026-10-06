Feature: Logging in
  Only people with an account get in. Each scenario starts logged out.

  Scenario: The admin logs in and out
    When I log in as the admin
    Then I am on the home page as "admin@example.com"
    When I log out
    Then I see the login form

  Scenario: A wrong password is refused
    When I log in as "admin@example.com" with the password "wrong"
    Then I see the error "Invalid email or password"
