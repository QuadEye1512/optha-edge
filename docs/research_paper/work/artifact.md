# Manuscript adaptation contract

Reference: c:\Users\Faizan Shaikh\OneDrive - ApexQuants\Documents\Diabetic_Retinopathy_Research_Paper.docx

The source remains unchanged. Its five pages were rendered in Microsoft Word and visually inspected. The bundled renderer was attempted but failed because LibreOffice is absent from the Windows runtime.

Layout authority: US Letter 8.5 by 11 inches, margins top 0.75, bottom 1.0, left/right 907 twips, two equal columns separated by 240 twips. Times New Roman 10 pt normal body, justified paragraphs, centered Roman-numbered major headings, italic lettered subheadings, numbered square-bracket references. The source has no active headers or footers and no embedded figures. Its title uses 24 pt centered text and author blocks use 11 pt.

Editorial changes authorized by journal preparation: replace all substantive body paragraphs and both placeholder tables; replace text-only figure placeholders with original technical diagrams and authentic UI captures; correct scientific terminology; replace unsupported training and dataset claims with implemented system methods; remove fabricated or unavailable results; update bibliography to verified primary sources. Retain all three authors, their affiliation, contact addresses, and guide acknowledgment. Compact the title/author block and use regular-weight body text for readable journal typography. A full-width title block and a full-width UI figure plate are allowed for legibility while retaining two-column scientific text and original page dimensions/margins.

Slots: word/document.xml/body/p[1] title; body paragraphs 2 through 8 author/guide metadata; remaining body paragraphs/tables scientific content, all replaced. No source comments, fields, controls or drawings are intended as substantive instructions. Preserve styles, themes, numbering, font tables, settings, relationships and package parts unless changed explicitly for added figures, new styles or editable body content. Authoring starts from the retained document package; preserve untouched parts byte-for-byte in the final zip.

Target: systems/implementation manuscript with an evidence-grounded abstract, introduction, related work, architecture, inference methods, implementation and data model, technical verification, limitations, prospective evaluation, conclusion and references. Report software checks separately from clinical accuracy. State the model validation gap as a scientific limitation. Do not assert funding, competing-interest, ethics approval or author-contribution declarations not provided by the authors.

Fidelity gates: source SHA256 unchanged; US Letter and margins unchanged; Times New Roman and two-column body retained; no placeholder figures/metrics; all figure/table references resolve; every final rendered page inspected for clipping, oversized blank areas and unreadable content. Source and final hash/package inventories recorded by build script.
