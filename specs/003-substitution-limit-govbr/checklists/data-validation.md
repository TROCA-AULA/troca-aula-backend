# Data/Validation Requirements Quality Checklist

**Purpose**: Validate data model and validation requirements quality - testing the requirements, not the implementation
**Created**: 2026-05-16
**Feature**: specs/003-substitution-limit-govbr/spec.md
**Focus**: Data model completeness, field validation, and business rule requirements

## Requirement Completeness

- [ ] CHK001 - Are all required fields for the Schools entity explicitly defined? [Completeness, Spec §FR-001]
- [ ] CHK002 - Is the `substitutionLimitPerSemester` field type specified (integer, range)? [Clarity, Spec §FR-001]
- [ ] CHK003 - Are validation rules for the limit field defined (min, max values)? [Gap]
- [ ] CHK004 - Is the relationship between Schools and EnrollmentRequest documented? [Completeness, Spec §Key Entities]
- [ ] CHK005 - Are all enrollment states that count toward the limit explicitly defined? [Completeness, Spec §Assumptions]

## Requirement Clarity

- [ ] CHK006 - Is "APROVADAS" defined with specific enrollment status values? [Clarity, Spec §Assumptions]
- [ ] CHK007 - Is "semestre letivo atual" defined with specific date range logic? [Ambiguity, Spec §Assumptions]
- [ ] CHK008 - Is the exact meaning of "limite zero (0)" clarified? [Clarity, Spec §FR-004]
- [ ] CHK009 - Are the units specified for `substitutionLimitPerSemester` (e.g., count per semester)? [Clarity, Spec §FR-001]

## Requirement Consistency

- [ ] CHK010 - Do field requirements in spec align with data-model.md? [Consistency]
- [ ] CHK011 - Are business rules consistent between FR-002 and success criteria SC-001? [Consistency, Spec §SC-001]
- [ ] CHK012 - Is the blocking behavior consistent between FR-003 and acceptance scenario 1? [Consistency, Spec §FR-003]

## Scenario Coverage

- [ ] CHK013 - Are requirements defined for the initial state when no enrollments exist? [Coverage]
- [ ] CHK014 - Are concurrent modification scenarios addressed in requirements? [Coverage, Gap]
- [ ] CHK015 - Is the behavior defined when limit is changed mid-semester? [Gap]

## Edge Case Coverage

- [ ] CHK016 - Is behavior defined when `substitutionLimitPerSemester` is NULL? [Edge Case, Spec §FR-004]
- [ ] CHK017 - Are negative value scenarios addressed? [Edge Case, Gap]
- [ ] CHK018 - Is behavior defined when limit is exceeded by 1 vs. by 10? [Edge Case, Clarity]
- [ ] CHK019 - Are requirements for data migration when limit is first added specified? [Edge Case, Gap]

## Non-Functional Requirements

- [ ] CHK020 - Are performance requirements for count query specified? [Performance, Gap]
- [ ] CHK021 - Are database index requirements documented for the limit check query? [Performance, Gap]

## Dependencies & Assumptions

- [ ] CHK022 - Is the assumption about enrollment status "APROVADA" validated against current schema? [Assumption]
- [ ] CHK023 - Are semester boundary detection requirements specified? [Dependency, Gap]
- [ ] CHK024 - Is the relationship between Schools update and existing enrollments defined? [Dependency, Gap]

## Traceability

- [ ] CHK025 - Do all field definitions in Key Entities map to functional requirements? [Traceability]
- [ ] CHK026 - Are acceptance scenarios testable with the defined data model? [Measurability, Spec §Acceptance Scenarios]