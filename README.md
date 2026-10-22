# CleanScreen

Resume screening you can't trick. Built on [Clocked](https://clocked.rezolve.ai) for the Clocked Build Challenge.

Applicants now hide text in their resumes that only an AI can read: white text, microscopic text, instructions in the file's metadata. CleanScreen scores the resume a person actually sees, with identity removed, checks claims against references, and explains why each application needs a closer look.

> Work in progress. A full write-up, the demo link and setup instructions are coming.

## Run it locally

```sh
npm install
cp .env.example .env.local   # then add your Clocked API key
npm run dev
```

The demo round in `data/demo` is entirely fictional. Regenerate it with `node scripts/generate-demo.mjs`, and re-run the analysis with
`node --env-file=.env.local --conditions=react-server --import tsx scripts/run-demo.ts`.
