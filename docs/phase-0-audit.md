# OpthaEdge Phase 0 audit and target architecture

Audit date: 2026-08-04  
Scope: supplied repository, both ONNX artifacts, current browser UI, and `POST /api/predict`  
Status: Phase 0 audit complete; first safety-hardening loop implemented. This is not a production-readiness approval.

## Executive finding

The repository is a small research prototype, not yet a patient-care platform. It has two server-side ONNX inference paths and a polished single-screen client UI. It has no authentication, authorization, database, object storage, patient/examination records, audit trail, image-quality model, clinician workflow, or longitudinal data model.

Both included artifacts load successfully and declare the tensor shapes expected by the code. Their graphs end in linear/Gemm outputs, and synthetic inference produces unconstrained values, supporting the current use of softmax on logits. The artifacts do not contain training provenance, verified class order, validated preprocessing, threshold selection, calibration, intended-use evidence, or performance metrics. The application must therefore remain research-only and blocked from clinical deployment until those records are supplied and independently reviewed.

## Current architecture

- Next.js 16.2.1 App Router with one client-rendered page.
- A Node.js Route Handler accepts multipart uploads and invokes local server code.
- Sharp resizes and normalizes images in two separate preprocessing functions.
- ONNX Runtime Node lazily creates one cached CPU session per artifact.
- Binary output is decoded as two logits; severity output is decoded as five logits.
- Results exist only in browser memory and are discarded on refresh.
- No external service, database, identity provider, or telemetry integration exists.
- The disconnected disease-classification component had no model or API path and was removed in the first hardening loop.

## Verified artifact facts

| Mode | Artifact | SHA-256 | Declared input | Declared output | Graph output | Runtime status |
|---|---|---|---|---|---|---|
| Binary DR | `retinal_binary_model.onnx` | `dfc49e28bb3927ec47691320a12ae95d9af86b64bc16dd1240d56903d798f0d0` | float32 `[batch,3,224,224]` | float32 `[batch,2]` | Gemm logits | Loads and runs |
| DR severity | `inceptionv3.onnx` | `a75ff338af12bb31b66e05403b4b8ab989ea7c2213aa42447642d6b348028836` | float32 `[batch,3,299,299]` | float32 `[batch,5]` | Gemm logits | Loads and runs |

These facts do not establish clinical validity. The class names and order still come from repository assumptions, not embedded artifact metadata or a supplied training record.

## Clinical taxonomy and model-support matrix

| Clinical group | Condition or task | Fundus-photo role | Supplied validated model | Product state |
|---|---|---|---|---|
| Image safety | Retinal image / gradability assessment | Required before disease inference | No | Unavailable; do not claim gradability |
| Diabetic retinal disease | Binary DR screening | Potential screening input | Artifact supplied, validation package absent | Research-only; blocked pending validation |
| Diabetic retinal disease | Five-level DR severity | Potential grading input | Artifact supplied, validation package absent | Research-only; blocked pending validation |
| Diabetic retinal disease | Suspected diabetic macular edema | Fundus may raise suspicion; OCT/exam may be needed | No | Unavailable |
| Diabetes-associated eye condition | Cataract | Primarily a lens condition; fundus photo alone is not a reliable diagnostic modality | No | Unavailable |
| Diabetes-associated eye condition | Open-angle glaucoma | Requires comprehensive assessment; fundus alone is insufficient | No | Unavailable |
| Diabetes-related complication | Neovascular glaucoma | Requires clinical examination and pressure assessment | No | Unavailable |
| Broader ocular disease | AMD, hypertensive retinopathy, optic-disc change, vein occlusion, myopic degeneration, other abnormalities | Task-dependent | No | Unavailable |
| Explainability | Lesion localization / segmentation / Grad-CAM | Approximate influence only when technically validated | No evidence supplied | Unavailable |

The UI must never group cataract, glaucoma, AMD, hypertension, or myopia as forms of diabetic retinopathy. Diabetes can increase the risk of cataract and open-angle glaucoma, while neovascular glaucoma can occur as a complication of diabetic retinopathy; these are distinct clinical concepts.

## Priority risks

### Clinical and model risks

1. **Unverified labels and thresholds:** the code assumes binary order `[No DR, DR]`, severity order `[No DR, Mild, Moderate, Severe, Proliferative]`, and a binary threshold of 0.5.
2. **Unverified preprocessing:** the implemented resize/crop and normalization are plausible but are not tied to a supplied training/export specification.
3. **No quality gate:** any decodable JPEG/PNG, including a non-retinal or clinically ungradable image, can reach inference.
4. **No calibration or uncertainty protocol:** maximum softmax probability is not calibrated clinical confidence and cannot determine referral urgency.
5. **No validation evidence:** dataset composition, sensitivity, specificity, precision, recall, F1, AUROC, QWK, confidence intervals, subgroup performance, and external validation are unknown.
6. **No laterality, patient, consent, examination, or model-history association:** results cannot safely support care or longitudinal comparison.
7. **No clinician-approved referral protocol:** the application cannot assign clinical urgency from model output alone.

### Security and privacy risks

1. The prediction endpoint is public and has no authentication, authorization, ownership check, rate limit, quota, or abuse protection.
2. There is no tenant boundary or patient-resource authorization model.
3. There is no database, secure object storage, retention policy, deletion/export workflow, backup, or recovery process.
4. There is no append-only audit trail or signed-review amendment history.
5. Server logs are not governed for health information; future code must avoid filenames, patient identifiers, and clinical payloads in logs and analytics.
6. Regulatory compliance must not be claimed without formal legal, security, privacy, and operational assessment.

### Engineering risks

1. The entire UI is one client component, with no role-aware application shell or server-side data-access boundary.
2. There was no automated test harness before this loop.
3. Model loading assumes local disk and a single Node process; it needs resource, concurrency, timeout, and deployment planning.
4. There is no health/readiness check that actually loads artifacts; a static “ready” badge was misleading.
5. No production monitoring, structured error taxonomy, model drift monitoring, or rollback procedure exists.

## Target production architecture

```text
Browser
  -> Next.js web/BFF (OIDC session, CSRF/origin controls, DTO validation)
      -> server-only authorization and data-access layer
          -> PostgreSQL (transactional clinical records and audit references)
          -> S3-compatible encrypted object storage (originals and derived assets)
          -> append-only audit/event sink
      -> isolated Node inference service/worker
          -> immutable, approved model registry
          -> per-model preprocessing and output decoder
          -> quality gate before disease inference
```

Recommended properties:

- Managed PostgreSQL with encrypted backups, point-in-time recovery, migrations, and organization-scoped keys.
- OIDC/OAuth 2.1 identity with MFA support; secure, HTTP-only, SameSite cookies; short sessions and revocation.
- RBAC for administrator, screener, clinician reviewer, and read-only/auditor roles, plus resource-level organization and patient authorization on every server operation.
- A `server-only` data-access layer that returns minimal DTOs and owns all database/environment access.
- Private object storage with KMS-managed encryption, content hashes, malware scanning, short-lived signed access, and separate original/derived prefixes.
- A private inference worker so ONNX CPU/memory limits, queues, timeouts, and model rollouts are isolated from the web process.
- Immutable model-version records keyed by artifact digest. New model versions create new predictions; they never rewrite old predictions.
- Structured logs with request correlation IDs and no patient data. Audit events are separate from operational logs.
- A deployment environment with a Node.js runtime; the Edge runtime is unsuitable for `onnxruntime-node`, Sharp, and local artifact access.

Vendor selection for identity, database, storage, region, and deployment remains an owner decision based on jurisdiction, data residency, contracts, budget, and the formal risk assessment.

## Proposed normalized data model

### Identity and authorization

- `organizations`: tenant/clinic boundary, status, retention policy reference.
- `users`: identity-provider subject and lifecycle status; no password storage when using OIDC.
- `roles`, `permissions`, `role_permissions`.
- `organization_memberships`: user, organization, role, validity interval.

### Patient record

- `patients`: organization-scoped stable internal key, status, archive timestamp.
- `patient_identifiers`: typed identifiers, issuer, encrypted value/hash, validity interval; unique within issuer and organization.
- `patient_demographics`: name, date of birth, clinically relevant biological sex, language.
- `patient_contacts`: contact type, value, preference, verification state.
- `consent_records`: purpose, captured/revoked timestamps, policy version, actor, evidence object key.
- `medical_histories`: diabetes type and diagnosis date, ocular history, surgery/treatment/family history, symptoms, medications, allergies; versioned rather than overwritten.
- `risk_factors`: smoking and other structured factors with observed/effective dates.
- `clinical_measurements`: typed HbA1c, glucose, blood-pressure, and lipid observations with unit, observed time, source, and entering clinician.
- `clinical_documents`: metadata and encrypted object key; binaries stay out of the database.
- `clinician_notes`: author, scope, timestamp, amendment chain, and sensitivity classification.

### Screening and model evidence

- `examinations`: patient, organization, time, status, capture context, consent snapshot, creator.
- `eye_images`: examination, laterality, original object key, content hash, MIME, dimensions, source/device, capture time; originals are immutable.
- `image_quality_assessments`: image, method/model version, gradable status, reason codes, scores, timestamp.
- `model_versions`: immutable registry snapshot including artifact digest, task, exact labels, preprocessing, thresholds, calibration, validation data/metrics, limitations, intended use, and approval state.
- `predictions`: examination/image/model version, task, raw-output object/reference, decoded outcome, uncertainty state, inference time, created time; immutable.
- `prediction_probabilities`: prediction, exact label key/order, raw score, calibrated probability when available.
- `lesion_findings`: only for a validated localization/segmentation task; method and model version required.
- `explainability_assets`: derived object key, method/version, limitations, source prediction.

### Review and care journey

- `clinician_reviews`: prediction/examination, reviewer, agreement state, assessment, referral urgency, reason, signed timestamp, lock state.
- `review_amendments`: append-only amendment to a signed review with author, reason, timestamp.
- `clinician_diagnoses`: clinician-entered diagnosis and coding system, visibly separate from model output.
- `referrals`, `treatments`, `care_plans`, `follow_ups`, `appointments`: status histories, responsible actor, due/completed timestamps, and links to the examination/review.

### Education and governance

- `educational_articles`, `article_versions`, `medical_sources`, `article_source_links`, `medical_reviews`.
- `audit_events`: organization, actor, action, resource type/id, timestamp, request correlation ID, outcome, and minimal safe metadata; append-only.

Every patient-bearing table must carry or derive an organization boundary. Authorization must be checked in server code even if database row-level security is also used. Sensitive and administrative fields should be returned through separate minimal DTOs.

## Clinical content sources reviewed for this audit

| Source | Organization | Publication/update year | URL | Access date | Use in audit | Medical review state |
|---|---|---:|---|---|---|---|
| Diabetic Retinopathy | National Eye Institute | 2025 | https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/diabetic-retinopathy | 2026-08-04 | DR, DME, diabetes-associated cataract/glaucoma distinctions | Requires named clinician approval before production publication |
| Macular Edema | National Eye Institute | 2025 | https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/macular-edema | 2026-08-04 | DME and need for OCT/other examination | Requires named clinician approval before production publication |
| Glaucoma | National Eye Institute | 2025 | https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/glaucoma | 2026-08-04 | Modality limitations and urgent angle-closure symptoms | Requires named clinician approval before production publication |
| Cataracts | National Eye Institute | 2025 | https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/cataracts | 2026-08-04 | Lens anatomy and examination-based diagnosis | Requires named clinician approval before production publication |
| Vision Loss and Diabetes | CDC | 2024 | https://www.cdc.gov/diabetes/diabetes-complications/diabetes-and-vision-loss.html | 2026-08-04 | Taxonomy, risk reduction, examinations, sudden visual changes | Requires named clinician approval before production publication |

The requested AAO and ADA pages returned access-denied responses during this audit. They remain candidate sources, but no content from them was relied on or represented as reviewed.

## Phased implementation plan

1. **Phase 0 — audit and safety boundary:** complete this audit, registry, strict input/output validation, safe API union, tests, and clinical wording. Obtain the missing model validation package.
2. **Phase 1 — application shell:** add server-rendered navigation and role-aware route groups; keep only the screening interaction as a small client island; add empty states and placeholders explicitly labeled as unavailable, never demonstration statistics unless selected by the owner.
3. **Phase 2 — patient records:** after owner choices for identity/database/storage, add migrations, OIDC session handling, server-only DAL, organization/patient authorization, consent, patient CRUD/archive/search, and audit events using synthetic fixtures.
4. **Phase 3 — examination records:** persist immutable examinations, laterality, original images, quality-assessment state, registry snapshots, prediction outputs, and a left/right timeline. A validated quality model or clinician quality workflow is a blocker for automated gradability.
5. **Phase 4 — expanded AI architecture:** isolate inference, add approval-aware routing, uncertainty/calibration, metrics and monitoring. Additional conditions stay disabled until a complete model evidence package exists.
6. **Phase 5 — education center:** add versioned, sourced content and original accessible SVG diagrams, then route every article through named clinician review.
7. **Phase 6 — care journey:** add clinician review/signing/amendment, referrals, care plans, treatment history, follow-ups, reports, and longitudinal comparison.
8. **Phase 7 — hardening:** threat model, rate limits, upload scanning, accessibility and end-to-end testing, backup/restore drills, security tests, privacy workflows, deployment runbooks, and model-governance approval.

## First implementation loop (completed)

Objective: make the existing inference boundary fail closed on malformed requests and invalid model tensors while preserving both artifact paths.

Implemented:

- One discriminated `ApiResponse` success/error union and removal of unsupported disease prediction types.
- Explicit `binary`/`severity` mode validation; missing or unknown modes no longer default silently.
- JPEG/PNG magic-byte validation, declared/content MIME agreement, empty/size/corruption/dimension checks.
- Exact two-value and five-value output checks plus finite-number validation; no slicing or shape guessing.
- Model registry entries with immutable artifact hashes and explicit unknown validation fields.
- Model/preprocessing metadata attached to every result.
- Generic client-facing inference errors; detailed failures remain server-side.
- Node runtime declaration and server-only boundaries around model code.
- Safer UI wording, removal of the unsupported disease UI implementation, and a prominent professional-review warning.
- Unit tests for file signatures, MIME agreement, output shapes, non-finite values, and decoding.

Not implemented in this loop:

- Retinal-image/quality classification, ungradable clinical state, uncertainty calibration, patient/examination persistence, authentication, authorization, rate limiting, clinician review, referral urgency, or additional diseases.

## Decisions and evidence required before the next clinical-data loop

1. Full model cards/export records for both artifacts: dataset, split, patient-level leakage controls, label definitions/order, preprocessing, output semantics, threshold/calibration, all requested metrics with confidence intervals, subgroup and external validation, limitations, and intended use.
2. Named clinical owner and an approved DR grading/referral/urgency protocol.
3. Quality-model artifact and validation package, or an approved manual gradability workflow.
4. Deployment jurisdiction/data residency and selected OIDC, PostgreSQL, object-storage, KMS, email/SMS, and hosting providers.
5. Retention, export, correction, deletion, research de-identification, incident-response, backup, and recovery policies.
6. Whether the next loop should build the non-persistent application shell first (recommended) or wait until identity/database/storage choices are approved.
