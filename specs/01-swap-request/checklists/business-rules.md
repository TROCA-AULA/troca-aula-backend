---

description: "Business Rules Requirements Quality Checklist for Sistema de Troca de Aulas"
created: 2026-05-14
focus: Business Logic & Validation
depth: Standard
audience: PR Reviewer

---

## Requirement Completeness

- [ ] CHK036 - Are all business rules (creation, acceptance, rejection, cancellation) explicitly defined? [Completeness, Spec §FR-001 to FR-007]
- [ ] CHK037 - Are state transition rules (PENDING → APPROVED/REJECTED/CANCELLED) documented? [Completeness, Gap]
- [ ] CHK038 - Is authorization matrix specifying who can perform which action defined? [Completeness, Spec §FR-006, FR-007]
- [ ] CHK039 - Are validation rules for classId referencing existing Classes documented? [Completeness, Spec §FR-006]

---

## Requirement Clarity

- [ ] CHK040 - Is "professor associated to class" criteria explicitly defined (createdByd, registredById)? [Clarity, Spec §FR-006]
- [ ] CHK041 - Is "conflict detection algorithm" defined with specific logic? [Clarity, Spec §FR-002]
- [ ] CHK042 - Are status transition conditions clear for all 4 states? [Clarity, Spec §Data Model]
- [ ] CHK043 - Is the rule "only PENDING can be cancelled" explicitly stated? [Clarity, Spec §US4]

---

## Requirement Consistency

- [ ] CHK044 - Do acceptance rules align with rejection rules (both require targetId = current user)? [Consistency, Spec §US2]
- [ ] CHK045 - Are validation rules consistent between create and accept operations? [Consistency, Gap]
- [ ] CHK046 - Is the constraint "one swap per class" documented? [Consistency, Gap]

---

## Acceptance Criteria Quality

- [ ] CHK047 - Can "conflict detection works correctly" be objectively measured? [Measurability, Spec §SC-002]
- [ ] CHK048 - Are acceptance criteria for "full swap flow" defined (creation → accept → approved)? [Completeness, Spec §SC-003]
- [ ] CHK049 - Is "less than 30 seconds" for swap creation measurable? [Measurability, Spec §SC-001]

---

## Scenario Coverage

- [ ] CHK050 - Is the scenario where target already has a class at the same time covered? [Coverage, Spec §Conflict Detection]
- [ ] CHK051 - Are requirements for partial swap (swap half of a class) defined? [Coverage, Gap]
- [ ] CHK052 - Is multi-day swap scenario addressed in requirements? [Coverage, Gap]

---

## Edge Case Coverage

- [ ] CHK053 - Is swapping with yourself (requesterId = targetId) handled? [Edge Case]
- [ ] CHK054 - Are recursive swaps (A→B→C) handled? [Edge Case, Gap]
- [ ] CHK055 - Is swap request expiration logic defined? [Edge Case, Gap]
- [ ] CHK056 - Are class deletion scenarios while swap is pending covered? [Edge Case, Gap]

---

## Summary

**Checklist Type**: Business Rules Quality  
**Total Items**: 21 (continuing from api.md)  
**Focus Areas**: Validation, Authorization, State Machine  
**Coverage Gaps Identified**: 7  
**Created**: 2026-05-14  
**Purpose**: Validate business rules requirements quality