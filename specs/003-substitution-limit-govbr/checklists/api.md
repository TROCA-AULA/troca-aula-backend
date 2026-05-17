# API Requirements Quality Checklist

**Purpose**: Validate API requirements quality - testing the requirements, not the implementation
**Created**: 2026-05-16
**Feature**: specs/003-substitution-limit-govbr/spec.md
**Focus**: API contracts and integration requirements

## Requirement Completeness

- [ ] CHK001 - Are error response formats specified for all failure scenarios? [Completeness, Spec §FR-006]
- [ ] CHK002 - Is the endpoint URL pattern explicitly defined for /auth/login-govbr? [Clarity, Spec §FR-005]
- [ ] CHK003 - Are authentication requirements for protected endpoints documented? [Gap]
- [ ] CHK004 - Is request/response content-type specified for Gov.br endpoint? [Completeness]

## Requirement Clarity

- [ ] CHK005 - Is "erro 401 ou 404" clarified with specific conditions for each? [Ambiguity, Spec §FR-006]
- [ ] CHK006 - Is the exact error message format specified for limit exceeded? [Clarity, Spec §FR-003]
- [ ] CHK007 - Are HTTP status codes explicitly defined for each scenario? [Clarity, Spec §FR-006]

## Requirement Consistency

- [ ] CHK008 - Do error handling requirements align between P1 and P2? [Consistency]
- [ ] CHK009 - Are API naming conventions consistent with existing endpoints? [Consistency, Spec §FR-005]

## Scenario Coverage

- [ ] CHK010 - Are timeout/performance requirements defined for the enrollment check? [Gap]
- [ ] CHK011 - Are rate limiting requirements specified for the Gov.br endpoint? [Gap]
- [ ] CHK012 - Are concurrent request scenarios addressed? [Coverage, Gap]

## Edge Case Coverage

- [ ] CHK013 - Is fallback behavior defined when Schools record is deleted? [Edge Case, Gap]
- [ ] CHK014 - Are requirements for NULL substitutionLimitPerSemester explicitly documented? [Clarity, Spec §FR-004]
- [ ] CHK015 - Is behavior defined when enrollment count query fails? [Exception Flow, Gap]

## Non-Functional Requirements

- [ ] CHK016 - Are logging requirements for the Gov.br endpoint specified? [Security, Gap]
- [ ] CHK017 - Is input validation defined for the token parameter? [Security, Gap]

## Dependencies & Assumptions

- [ ] CHK018 - Is the assumption of PostgreSQL availability validated? [Assumption]
- [ ] CHK019 - Are external API dependencies documented for future Gov.br integration? [Dependency, Spec §Assumptions]

## Traceability

- [ ] CHK020 - Do all functional requirements map to acceptance scenarios? [Traceability]
- [ ] CHK021 - Are success criteria measurable without implementation details? [Measurability, Spec §SC-001 to SC-004]