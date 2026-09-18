# Markdown to PDF

A browser-based tool that turns GitHub-flavored Markdown into a clean, paginated PDF. Everything runs client-side — nothing is uploaded anywhere.

## Getting started locally

Requires [Node.js](https://nodejs.org/).

```bash
npm install
npm run dev
```

Then open the URL printed in the terminal (usually `http://localhost:5173`).

To build the static site (output goes to `dist/`):

```bash
npm run build
npm run preview   # serve the built dist/ locally to sanity-check it
```
