# CleanScreen

**Resume screening you can't trick.** CleanScreen scores the resume a person actually sees, with identity removed, checks what applicants claim against their references, and explains every decision. Built on all nine [Clocked](https://clocked.rezolve.ai) endpoints for the Clocked Build Challenge.

**Live demo: [cleanscreen.vercel.app](https://cleanscreen.vercel.app)** · no sign-up · every applicant in the demo is fictional

![CleanScreen home page](docs/hero.png)

## The problem

Applicants have learned that an AI reads their resume first, and some write for the AI instead of the recruiter.

- **1% of 200,000 real resumes** submitted through a hiring platform contained hidden instructions aimed at AI screeners ([Duke University, 2026](https://today.duke.edu/2026/08/tricking-ai-job-hunt)). More than 90% of that hidden text is not an obvious "hire me" but invisible keywords and claims.
- **67% of HR leaders** say AI-generated applications are slowing hiring down ([Robert Half, 2026](https://www.staffingindustry.com/news/global-daily-news/67-of-hr-leaders-say-ai-generated-applications-slow-hiring)).
- **64% of employers** have hired someone who misrepresented their skills ([Criteria and Lighthouse Research, 2026](https://www.criteriacorp.com/research/2026-lighthouse-research-report)).

Applicant tracking systems were built to parse and rank resumes, not to check them. A screener that reads the raw file can be steered by text no person ever sees.

## What CleanScreen does

1. **Reads the file twice.** Once as a person sees the rendered page, once as a text extractor reads it. Anything only the machine can read (white text, microscopic text, text off the page or under a shape, metadata) is flagged and classified.
2. **Scores it blind.** Name, contact details, age, location and family status are removed. Each job requirement is judged on the visible, anonymised resume, with the passage that proves it.
3. **Checks the story.** Claims are verified against references and credential records, the resume against the cover letter and against other applicants, and take-home code is inspected before anything runs it.
4. **Hands over a decision a person can act on.** One plain sentence, the evidence, a requirements checklist and interview questions aimed at what could not be verified. The policy is enforced in code: a model recommendation never overrides an integrity finding, and a person makes the final call.

In the demo round, one applicant printed a whole senior role in white ink inside their experience section. **An AI reading the raw file scores them 91/100. CleanScreen, scoring the visible page, gives 1/100**, and the UV lamp on the applicant page shows exactly where the hidden role sits.

![Applicants as stamped resume sheets](docs/shortlist.png)

| The UV lamp reveals hidden ink | Claims checked against references |
| --- | --- |
| ![A resume under the UV lamp](docs/uv-lamp.png) | ![Claims contradicted by references](docs/claims.png) |

## How it uses Clocked

Every endpoint changes what the app does or shows. All calls run server-side with the account key.

| Endpoint | What CleanScreen asks it | What changes in the app |
| --- | --- | --- |
| **/injection** | Does the machine-readable text try to instruct, steer or override the AI screener? | Flags the application and highlights the exact passage (spans) on the resume. |
| **/decide** | (1) What is each hidden passage trying to do: instruction to the AI, keyword stuffing or harmless? (2) Is each job requirement met, not met or not shown? (3) The same question on the raw file, as a naive screener would see it. | Classifies hidden text; drives the requirements checklist and the fit score; the counterfactual produces the "an AI would have said 91" comparison. |
| **/pii** | Which spans are names, emails, phones, addresses, locations, dates of birth or family status? | Produces the anonymised copy that every scoring step reads (blind screening). |
| **/extract** | Roles, skills, education and certifications, verbatim with positions. | Builds the structured profile behind the scorecard. |
| **/rerank** | Which resume and reference passages answer each requirement? | Shows the proof behind each requirement verdict. |
| **/grounding** | Is each resume claim supported, contradicted or not stated by the references and credential records? | Contradicted claims become integrity findings with the record that contradicts them. |
| **/compare** | (1) Do resume and cover letter disagree? (2) Are any applicants' resumes copied or templated from each other? | Flags conflicting dates and copied resumes across the applicant pool. |
| **/script** | Is the take-home submission safe to run, and which lines are the problem? | Blocks the grader and shows the offending lines (e.g. reading `~/.aws/credentials` and posting it out). |
| **/fill** | A scorecard: seniority, next-step recommendation, summary and interview questions targeted at unverified claims. | Seniority label, interview questions; the recommendation is kept for reference, while the policy in code makes the decision. |

Every call is recorded with its purpose, model time and credits, and shown on the applicant page under "How this was decided". The demo round of ten applicants used **121 calls and 668 credits** (about **67 credits, or roughly 1.3 cents, per applicant**), with about 15 seconds of total model time.

## How the hidden-text detection works

Detection is visual, not a list of tricks. Each PDF page is rendered with MuPDF and every run of text is located on the bitmap: a run that leaves no ink where it should be is hidden, whatever produced it (white on white, colour matched to a background, invisible render mode, covered by a shape). Runs smaller than 4 pt or mostly outside the page are flagged too, and the Subject and Keywords metadata fields are read as hidden text. Clocked then judges what the hidden text is for.

On a real two-page resume this produced no false alarm: the visible and the machine-readable text were identical.

## The demo round

Ten fictional applicants for a Senior Data Engineer role, each with a different situation:

| Applicant | Situation | Outcome |
| --- | --- | --- |
| A | Strong, honest, references confirm the claims | Interview |
| B | A senior role written in white ink | Hidden text (raw file 91, visible page 1) |
| C | Microscopic note telling the AI to rank them first | AI prompt |
| D | Instructions to the AI in the PDF metadata | AI prompt |
| E | Team lead and certification the references contradict | False claims |
| F, G | The same templated resume, sent by two people | Copied |
| H | Resume and cover letter disagree on dates | Conflict |
| I | Take-home code that exfiltrates credentials | Bad code |
| J | Honest career changer, short of the years required | Not a match |

The PDFs are generated by `scripts/generate-demo.mjs`; the saved analysis in `data/demo/report.json` is replayed by the home page, so visitors spend no credits.

## Run it locally

Requires Node.js 20+ and a Clocked API key (a free account plus the hackathon code gives 20,000 credits).

```sh
git clone https://github.com/Loharanontsoanael/cleanscreen.git
cd cleanscreen
npm install
cp .env.example .env.local     # then paste your key after CLOCKED_API_KEY=
npm run dev                    # http://localhost:3000
```

- `/` replays the saved demo round. `/run` screens your own PDFs live.
- Regenerate the fictional resumes: `node scripts/generate-demo.mjs`
- Re-run the analysis on them: `node --env-file=.env.local --conditions=react-server --import tsx scripts/run-demo.ts`
- In development, identical Clocked requests are cached in `.cache/` so iterating spends no credits.

| Variable | Default | Purpose |
| --- | --- | --- |
| `CLOCKED_API_KEY` | (required) | Clocked account key, server-side only |
| `CLOCKED_CONCURRENCY` | `4` | Concurrent Clocked requests |
| `SCREEN_RUNS_PER_HOUR` | `5` | Live screenings per visitor per hour |
| `SCREEN_DISABLED` | unset | Set to `1` to pause live screening |

## Where things live

- `src/lib/forensics.ts`: the person-versus-machine reading of a PDF.
- `src/lib/analysis.ts`: the screening pipeline, the Clocked calls and the decision policy.
- `src/lib/clocked.ts`: the Clocked client wrapper (concurrency, retries, audit trail, dev cache).
- `src/app/api/screen/route.ts`: live screening, streamed as NDJSON.
- `src/components/`: the shortlist, the applicant page and the UV lamp.

## Privacy and limits

- Uploaded resumes are read, screened and forgotten: nothing is stored by CleanScreen. Text is sent to Clocked for analysis.
- CleanScreen recommends; a person decides. Every flag says why and shows the passage behind it.
- Verification checks a claim against the records supplied, not against the outside world. A claim the records don't mention is "not covered", never "false".
- The resume layout on the applicant page is rebuilt from the PDF text; very free-form designs can put a subheading in the wrong place. Detection does not depend on it.

## Credits

Built with [Next.js](https://nextjs.org), [Clocked](https://clocked.rezolve.ai) and its [JavaScript SDK](https://www.npmjs.com/package/clocked-sdk), [MuPDF.js](https://mupdf.com) (AGPL-3.0) for PDF rendering and text positions, [pdf-lib](https://pdf-lib.js.org) for the demo PDFs, [Hugeicons](https://hugeicons.com), and the DM Sans, JetBrains Mono, Caveat and Lato typefaces. Statistics are linked to their sources above. Built with the help of Claude Code.
