# Manuscript evidence and handoff

Source snapshot: 0099145dc14547c30484798042b029fbf58df1eb, reviewed 2026-09-29. Original tracked source files were not modified. The supplied DOCX was preserved byte-for-byte, SHA256 54ca63886475f4fa961ab69706e36d173ce0dc8c3cf641c258eeae7c3c539a71.

## Verification performed

- `npm.cmd test`: 12 tests passed, 0 failed, 4 source files. Existing suite, not clinical performance.
- `npm.cmd run typecheck`: completed successfully after the sandbox's cache-write restriction was resolved. Initial failure TS5033 was an environment write failure, not a TypeScript diagnostic.
- `npm.cmd run lint`: completed successfully, no reported diagnostics.
- `node docs/research_paper/work/verify_system.mjs`: 9 of 9 local HTTP checks passed. Raw responses and environment information are in `system_verification.json`. Initial evidence-file write was sandbox-blocked; the recorded run completed with authorized file access.
- Both ONNX file SHA256 values matched the source registry. No clinical datasets or patient records were accessed or created. Successful smoke tests used a generated constant-color RGB PNG.

## Primary repository evidence

- `lib/modelRegistry.ts`: tensor contracts, assumed labels, hash identity, missing clinical evidence.
- `lib/preprocessor.ts`: Sharp cover resize, normalization, channel-first tensors.
- `lib/modelLoader.ts`: local files, cached CPU sessions; no runtime hash enforcement.
- `lib/inference.ts` and `lib/outputDecoding.ts`: float32 requirement, element-count and finite-value checks, softmax, threshold and weighted index.
- `app/api/predict/route.ts`: request validation and structured responses; no authentication or approval gate.
- `data/patients.ts`, `lib/auth/`, `lib/patients/validation.ts`: development sessions, authorization and patient transactions.
- `prisma/schema.prisma`, `config/modules.ts`, `app/examinations/page.tsx`, `app/reports/page.tsx`: declared schema and deferred modules.
- `components/ScreeningWorkspace.tsx`: client-only screening state and reset behavior.

## Literature verification

The manuscript's nine references were checked against primary publisher, author or official documentation sources. Key supporting pages:

1. https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/diabetic-retinopathy
2. https://jamanetwork.com/journals/jama/fullarticle/2588763
3. https://jamanetwork.com/journals/jama/fullarticle/2665775
4. https://pmc.ncbi.nlm.nih.gov/articles/6550188/
5. https://www.cv-foundation.org/openaccess/content_cvpr_2016/html/Szegedy_Rethinking_the_Inception_CVPR_2016_paper.html
6. https://proceedings.mlr.press/v70/guo17a.html
7. https://pubs.rsna.org/doi/pdf/10.1148/ryai.240300
8. https://www.bmj.com/content/385/bmj-2023-078378
9. https://onnxruntime.ai/docs/get-started/with-javascript/node.html

## Submission prerequisites for authors

Confirm author details and corresponding author; provide funding, competing-interest and author-contribution declarations, plus any journal-required AI-assistance disclosure. Select a journal accepting systems/implementation work and verify its submission template. Diagnostic-accuracy claims require a separate clinical validation study; the manuscript contains no invented accuracy, training curve or confusion matrix. It is a systems manuscript with technical verification, not a diagnostic-accuracy manuscript.

## Rendering

The packaged `render_docx.py` was attempted. This Windows bundle lacks LibreOffice, so Microsoft Word rendered the original and revised DOCX to 300-dpi page PNGs using the existing Word rendering helper. These render files are internal QA, not additional deliverables. The final package preserves unaffected source parts. Hash and package checks are saved in `package_inventory.json`.
