## ADDED Requirements

### Requirement: Users can mark all notifications as read
The system SHALL allow a user to mark all of their unread notifications as read from the notification center.

#### Scenario: Mark all unread notifications as read
- **WHEN** a user chooses the mark-all-read action in the notification center
- **THEN** all unread notifications owned by that user SHALL be updated to read
- **AND** the unread badge SHALL update to zero if no unread notifications remain

#### Scenario: Mark all read action is safe when there is nothing unread
- **WHEN** a user opens the notification center with no unread notifications
- **THEN** the mark-all-read action SHALL be hidden or disabled

### Requirement: Notification center shows consistent feedback after bulk actions
The system SHALL reflect bulk notification updates immediately in the UI.

#### Scenario: Notification list updates after mark all read
- **WHEN** the mark-all-read action completes
- **THEN** each affected notification SHALL appear as read without requiring a manual page refresh
