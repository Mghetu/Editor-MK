# Editor-MK

Static Canva-like browser editor built with React + TypeScript + Fabric.js for GitHub Pages.

## Features
- Text, image, and simple table objects.
- Multi-page documents with add/duplicate/delete and page switching.
- Template workflow using `public/templates/manifest.json` with JSON plus a preview URL (data URI or image file).
- Image crop mode with rectangle/circle masking, presets, custom width/height, apply/cancel.
- Exports: current page PNG/JPG and all pages ZIP.
- Snapshot undo/redo and Ctrl/Cmd hotkeys.

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Templates
Drop `*.json` files in `public/templates/` and set each manifest `preview` to either a hosted image path or a data URI.
No code changes required.
