## ADDED Requirements

### Requirement: Administrators can assign roles to users
The system SHALL allow authorized administrators to view users and assign an application role to each user, except where self-modification is explicitly blocked.

#### Scenario: Administrator updates another user's role
- **WHEN** an authorized administrator selects a different role for another user
- **THEN** the system SHALL save the new role assignment
- **AND** the user list SHALL reflect the updated role

#### Scenario: User cannot modify their own role when self-edit is blocked
- **WHEN** an administrator views their own user row
- **THEN** the system SHALL show that their own role cannot be changed

### Requirement: Roles define page access permissions
The system SHALL store page-level access permissions by role and use them to control navigation visibility and page entry.

#### Scenario: Navigation hides pages not allowed by role
- **WHEN** a signed-in user lacks access to a page according to their role permissions
- **THEN** that page SHALL not appear in the main navigation

#### Scenario: Direct page access is blocked by role permissions
- **WHEN** a user reaches a page they do not have permission to access
- **THEN** the system SHALL show an access denied state instead of the page content

### Requirement: Roles define action permissions separately from page access
The system SHALL distinguish between access to a page and permission to perform actions on that page.

#### Scenario: User can open a page but cannot perform restricted actions
- **WHEN** a user has page access but lacks the required action permission
- **THEN** restricted action buttons SHALL be hidden or disabled

#### Scenario: Role permission settings can toggle action capabilities
- **WHEN** an administrator updates action permissions for a role
- **THEN** users assigned to that role SHALL see the updated action availability after data refresh

### Requirement: Permission settings can be managed by role
The system SHALL provide a role permissions view where authorized administrators can configure page access and action permissions for each role.

#### Scenario: Administrator switches between roles in permission settings
- **WHEN** an administrator selects a role in the role permission settings view
- **THEN** the system SHALL display the page access and action permission toggles for that role

#### Scenario: Fixed permissions cannot be turned off
- **WHEN** a role contains a non-editable required permission
- **THEN** the system SHALL display it as fixed and prevent editing
