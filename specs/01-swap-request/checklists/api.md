---

description: "API Requirements Quality Checklist for Sistema de Troca de Aulas"
created: 2026-05-14
focus: API Contracts & Endpoints
depth: Standard
audience: PR Reviewer

---

## Requirement Completeness

- [ ] CHK001 - Are all HTTP methods (POST, GET, PATCH) explicitly specified for each endpoint? [Completeness, Spec §Endpoints]
- [ ] CHK002 - Are all 6 endpoints (create, list, get, accept, reject, cancel) defined with full contract details? [Completeness, Spec §Contracts]
- [ ] CHK003 - Are error response formats specified for each failure scenario (400, 401, 403, 404, 500)? [Completeness, Spec §Error Codes]
- [ ] CHK004 - Is pagination specified for list endpoints? [Gap]
- [ ] CHK005 - Are query parameter validation requirements documented? [Completeness, Spec §GET /swap-requests]

---

## Requirement Clarity

- [ ] CHK006 - Is "type" filter (created/received) explicitly defined with allowed values? [Clarity, Spec §GET Query Params]
- [ ] CHK007 - Are HTTP status codes aligned with spec (201 for creation, 200 for updates)? [Clarity, Spec §Contracts]
- [ ] CHK008 - Is the response wrapper format ("data", "message", "statusCode") consistently specified? [Consistency, Spec §Response Format]
- [ ] CHK009 - Are date/time formats (ISO 8601) explicitly specified for all temporal fields? [Clarity, Spec §Response]

---

## Requirement Consistency

- [ ] CHK010 - Do accept/reject/cancel endpoints use consistent PATCH method? [Consistency, Spec §Endpoints]
- [ ] CHK011 - Are authorization requirements consistent across all endpoints? [Consistency, Spec §Headers]
- [ ] CHK012 - Is the id parameter format consistent (path param vs query param)? [Consistency, Spec §Contracts]

---

## Acceptance Criteria Quality

- [ ] CHK013 - Are success criteria defined for conflict detection (what constitutes "conflito de horário")? [Gap]
- [ ] CHK014 - Is the order of precedence for accept/reject/cancel operations specified? [Clarity, Spec §FR-003]
- [ ] CHK015 - Can "solicitação aceita" acceptance criteria be objectively verified? [Measurability, Spec §SC-002]

---

## Scenario Coverage

- [ ] CHK016 - Are requirements defined for scenario when class no longer exists? [Exception Flow, Gap]
- [ ] CHK017 - Are requirements specified for when target professor is deleted? [Exception Flow, Gap]
- [ ] CHK018 - Are concurrent acceptance scenarios addressed (two professores aceitam simultaneamente)? [Coverage, Gap]
- [ ] CHK019 - Is timeout/failure during accept operation handled in requirements? [Recovery, Gap]

---

## Edge Case Coverage

- [ ] CHK020 - Is fallback behavior defined when classId does not exist? [Edge Case, Spec §Error Codes]
- [ ] CHK021 - Are requirements specified for self-swap (requesterId = targetId)? [Edge Case, Gap]
- [ ] CHK022 - Is duplicate swap request handling defined (same class, same day)? [Edge Case, Gap]
- [ ] CHK023 - Are requirements for swap requests on classes with no schedule defined? [Edge Case, Gap]

---

## Non-Functional Requirements

- [ ] CHK024 - Are performance requirements for swap creation specified? [Gap]
- [ ] CHK025 - Is authorization logic (who can accept whose request) explicitly defined? [Completeness, Spec §FR-007]
- [ ] CHK026 - Are logging requirements for sensitive operations defined? [Gap]

---

## Dependencies & Assumptions

- [ ] CHK027 - Is the assumption that Users exist before creating SwapRequest validated? [Assumption]
- [ ] CHK028 - Are external notification requirements (if any) documented? [Dependency, Spec §Assumptions]
- [ ] CHK029 - Is JWT token format/validation requirement documented? [Consistency, Spec §Headers]

---

## Ambiguities & Conflicts

- [ ] CHK030 - Does "professor替代" have clear identification rules? [Ambiguity, Spec §FR-007]
- [ ] CHK031 - Are there conflicting requirements between FR-001 (criar solicitação) and FR-006 (apenas associado)? [Conflict]
- [ ] CHK032 - Is "conflito de horário" mathematically defined (same day + overlapping time)? [Clarity, Spec §FR-002]
- [ ] CHK033 - Is the behavior when requester is also the target clear? [Ambiguity, Edge Case]

---

## Traceability

- [ ] CHK034 - Are all functional requirements (FR-001 to FR-007) mapped to endpoints? [Traceability]
- [ ] CHK035 - Are success criteria (SC-001 to SC-003) verifiable against API contracts? [Traceability, Spec §Success Criteria]

---

## Summary

**Checklist Type**: API Requirements Quality  
**Total Items**: 35  
**Focus Areas**: API Contracts, Error Handling, Edge Cases  
**Coverage Gaps Identified**: 11  
**Ambiguities Identified**: 3  
**Conflicts Identified**: 1  
**Created**: 2026-05-14  
**Purpose**: Validate requirements completeness/clarity for SwapRequest API