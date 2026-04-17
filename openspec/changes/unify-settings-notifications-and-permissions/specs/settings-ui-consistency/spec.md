## ADDED Requirements

### Requirement: Settings pages use the standard toolbar system
The system SHALL render settings page filter rows, management toolbars, and top-level actions using the same standard toolbar style as task, issue, meeting, and team board pages.

#### Scenario: Settings page shows unified toolbar styling
- **WHEN** a privileged user opens the settings page
- **THEN** the top filter and action area SHALL use the shared rounded container, bordered fields, and aligned action buttons

#### Scenario: Settings page controls remain usable on smaller screens
- **WHEN** the settings page is viewed on a narrow viewport
- **THEN** toolbar controls SHALL wrap without overlapping or clipping labels and actions

### Requirement: Settings management sections use consistent action framing
The system SHALL present settings management sections with consistent action layout, spacing, and grouping so that add, edit, and remove operations match the rest of the product.

#### Scenario: Settings section action area matches product style
- **WHEN** a user views a settings management block such as role management or dropdown management
- **THEN** the action controls SHALL use consistent spacing, field framing, and button alignment with the standard toolbar system
