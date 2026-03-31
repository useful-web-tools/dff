# Text Diff Tool

Browser-based text diff tool for comparing original and updated text.

## What this repo contains

- Side-by-side text diff UI
- Drag and drop support for text files
- Local `jsdiff` bundle in `vendor/diff.min.js`
- Optional Office text extraction endpoint in `extract-text.php`

## Privacy

- Plain text comparison runs in the browser with `jsdiff`
- The page does not post text to your own application server for normal text comparison
- When users drop `docx`, `xlsx`, `pptx`, `odt`, or `rtf`, the file is sent to `extract-text.php` on the same server so the document body can be extracted
- If you want a fully client-side only version, remove Office extraction support from `script.js` and delete `extract-text.php`

## Files

- `index.php`: page entry
- `script.js`: diff rendering and file handling
- `styles.css`: standalone styles
- `vendor/diff.min.js`: local `jsdiff`
- `extract-text.php`: Office and RTF text extraction

## Local run

Serve this directory with PHP.

Example:

```bash
php -S localhost:8000
```

Then open:

```text
http://localhost:8000/index.php
```

## Before publishing

- Set your repository name and description
- Choose and add a license
- Review whether you want to keep `extract-text.php`
- If you publish the hosted page, add a link back to this repository from the live `/diff/` page
