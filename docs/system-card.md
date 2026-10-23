# CleanScreen system card

What CleanScreen is for, how it decides, how well it works, and where it should not be trusted. Written for the people who would deploy it, review its output or be screened by it.

## Intended use

CleanScreen helps a person screen job applications. For each applicant it answers three questions, with the evidence for each answer:

1. Does the file say something to an AI that it does not show a person (hidden text, instructions to the screener, disguised characters)?
2. On the visible, anonymised resume, is each job requirement met, not met or not shown?
3. Does the story hold together against the documents supplied (references, credential records, the cover letter, the other applicants, take-home code)?

It then routes the application: **interview**, **closer look**, **not a match** or **integrity finding**. Every route is a recommendation to a person, with its reasons. CleanScreen sends nothing to applicants and takes no action on its own.

**Not intended for:** rejecting applicants without a person reviewing the decision; ranking applicants against each other for a final hiring decision; judging anything other than the written application (personality, culture fit, video or voice); screening where no person is accountable for the outcome.

## How it decides

The decision is code, not a model: `decide()` in `src/lib/policy.ts`, with every threshold in `THRESHOLDS` in the same file. Clocked's endpoints supply the evidence and its probabilities; the rule reads them.

| Route | When |
| --- | --- |
| Integrity finding | Hidden text classed as an instruction to the AI or keyword stuffing; an `/injection` verdict; a claim contradicted by the records at 80% or more; a cover letter that conflicts with the resume; malicious take-home code; text copied from another applicant; disguised characters. |
| Not a match | A must-have requirement judged not met with 80% confidence or more, and no integrity finding. |
| Interview | Every must-have met with 60% confidence or more, nothing uncertain, every applicable check completed. |
| Closer look | Everything else, with the reason: an unsure verdict, a must-have not shown, a near-miss injection score, hidden text of unclear purpose, a possible contradiction, suspicious code, hidden keywords shared with other applicants (likely a template), or a check that could not run. |

The `/fill` scorecard also produces a recommendation; it is shown for reference and never overrides the rule.

## What it reads, and what it sends

- **The resume PDF** is rendered with MuPDF and read twice: as a person sees the page and as a text extractor reads it. Only the visible text, anonymised by `/pii`, is used to judge requirements. The full machine-readable text is checked for instructions to the AI.
- **Clipped documents** (cover letter, references, credential records, take-home code) are read as text; a PDF document is read for its visible text only.
- **Sent to Clocked:** the texts above, and for the downloadable copies the PDF itself. Clocked's handling of that data is governed by its own terms.
- **Stored by CleanScreen:** nothing. Live uploads are screened in memory and forgotten; the browser keeps the files until the page is closed so the PDF copies can be built on request. Exports (CSV, audit report) are generated in the browser and leave out names.

## Evaluation

- **Manipulation benchmark** (`scripts/benchmark.ts`, results in `data/benchmark/results.json`): 37 of 37 attacks caught (eleven hiding methods with three payloads each, look-alike letters, three visible instructions) and 0 false alarms on 12 honest resumes designed to look suspicious (white text on a dark sidebar, light grey dates, 7 pt footers, ordinary metadata, Russian and Arabic text with direction marks, stray zero-width spaces, prompt-engineering skills).
- **One real resume** (two pages, not published): no false alarm; the visible and the machine-readable text matched.
- **Demo round:** ten fictional applicants, each with one situation; every one is routed as intended.
- **Tests:** 57 automated tests cover detection, the decision rule, failure handling, the PDF copies and the exports, without calling Clocked.

These numbers come from generated resumes. They show that each known technique is caught and that common honest designs are not flagged; they are not an estimate of accuracy on real applicant pools, which would need a labelled sample of real resumes.

## Known limitations

- **Text-layer lies inside embedded fonts.** A font can draw "Java" while its text layer says "Python". CleanScreen catches the cases that leave a trace in the characters (tag characters, zero-width characters, direction controls, Cyrillic or Greek look-alikes) but does not compare the drawn glyphs with the text layer, so a font that maps ordinary Latin letters to other Latin letters is not detected.
- **Scans are refused**, not read: a resume without a text layer is rejected with a reason rather than passed through OCR. Text inside images is not examined.
- **Language.** Instructions to Clocked are in English, and the benchmark is in English. Resumes in other languages are read, but their accuracy has not been measured.
- **Verification is only as good as the records.** A claim is checked against the documents supplied, not the outside world. A claim the records do not mention is "not covered", never "false".
- **Layout.** The resume shown on the applicant page is rebuilt from the PDF text; unusual designs can put a heading in the wrong place. Detection and scoring do not depend on it.
- **Limits per round:** 10 resumes of up to 10 pages and 3 MB; 8 requirements; 3 references per applicant.

## Fairness

- Names, contact details, addresses, locations, dates of birth and personal status (marital status, children, age, gender, nationality, religion) are removed by `/pii` before any requirement is judged or any scorecard is written.
- **Proxies remain.** School names, employers, clubs, career gaps, graduation years and gendered wording can still carry information about a protected characteristic. CleanScreen does not remove them.
- CleanScreen has **not been audited for disparate impact** on real applicant populations. Where the law requires a bias audit before an automated tool is used in hiring (for example New York City's Local Law 144), that audit has to happen first.
- The integrity checks look at the file, not the person: a flag means "a person should look at this", never "this applicant is dishonest". Shared hidden keywords are routed as a likely template rather than an accusation for that reason.

## Human oversight

- Every route is explained in plain language, with the passage, record or line of code behind it.
- Uncertainty is surfaced rather than resolved by the machine: an unsure verdict goes to a person.
- A failed check is named on the applicant page and keeps the application from going straight to interview.
- The audit report records the requirements, the rule, each decision with its reasons, and every Clocked call (endpoint, purpose, credits).

## Regulation

Hiring is one of the uses the EU AI Act classes as high-risk, and US jurisdictions including New York City, Illinois and Colorado regulate automated hiring decisions. CleanScreen is not a compliance product and does not make anyone compliant. It is built to support the obligations these rules share: a person in control of each decision, explanations a reviewer can check, records of how a decision was reached, and no automatic rejection.

## Contact

Issues and questions: [github.com/Loharanontsoanael/cleanscreen/issues](https://github.com/Loharanontsoanael/cleanscreen/issues).
