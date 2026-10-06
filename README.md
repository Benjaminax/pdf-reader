# PDF Book Reader

A web-based PDF reader that lets you read documents **like a real book**: horizontal double-page layout with a realistic page-turning effect. Built with [React](https://react.dev/), [PDF.js](https://mozilla.github.io/pdf.js/), and [React PageFlip](https://github.com/Nodlik/react-pageflip).

---

## Features

- **Book-like experience** — horizontal double-page view with smooth page-flip animation.
- **Load PDFs from your device** — drag & drop or pick a file from the file explorer.
- **Load PDFs from a public URL** — paste any direct link to a **public** PDF and read it instantly (the server must allow cross-origin requests).
- **Google Drive support** — paste a public Google Drive sharing link (`https://drive.google.com/file/d/FILE_ID/view`) and the app will try to fetch the PDF via a CORS proxy. If the proxy fails, download the file manually and upload it from your device.
- **Responsive layout** — automatically switches to single-page vertical mode on narrow screens.
- **Zoom & fit modes** — zoom in/out or fit to screen / fit to width.
- **Thumbnail sidebar** — quickly jump to any page.
- **Progress memory** — remembers the last page you read for each document (stored locally in the browser).
- **Keyboard navigation** — use the `←` and `→` arrow keys to turn pages.
- **PWA ready** — can be installed as a standalone app on desktop and mobile.

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (recommended)
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/Daniel-VergaraM/PDF-Reader
cd PDFReader

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

The app will be served at `http://localhost:5173` (or the next available port).

### Production build

```bash
npm run build
```

The static files will be generated in the `dist/` folder and can be served with any static web server.

### Preview production build

```bash
npm run preview
```

---

## How to use

1. **Open the app** — you will see the upload screen.
2. **Choose a PDF** in one of three ways:
   - **Local file**: drag & drop a PDF onto the dropzone, or click it to open the file picker.
   - **Public URL**: paste a direct link to a public PDF (e.g. `https://example.com/sample.pdf`) in the URL field and press **Load**.
   - **Google Drive**: paste a public Google Drive link (e.g. `https://drive.google.com/file/d/FILE_ID/view`) in the URL field and press **Load**. If it fails due to CORS restrictions, download the PDF manually and upload it from your device.
3. **Read** — the PDF opens in the book viewer. Use the toolbar or arrow keys to navigate.
4. **Close** — click the back arrow in the toolbar to return to the upload screen and choose another PDF.

> **Note about URLs:** the remote server must serve the PDF with the proper `Access-Control-Allow-Origin` header (CORS). If the server blocks cross-origin requests, the browser will not be able to load the file. The app only works with **public** URLs; it does not handle authentication or private links.

---

## Tech stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool & dev server |
| pdfjs-dist | PDF parsing & rendering |
| react-pageflip | Page-flip animation component |
| CSS custom properties | Theming & responsive layout |

---

## Project structure

```
PDFReader/
├── public/              # Static assets (icons, manifest)
├── scripts/             # Build helpers (icons, smoke test)
├── src/
│   ├── components/
│   │   ├── UploadScreen.jsx   # Landing screen (file drop + URL input)
│   │   ├── Reader.jsx         # Book viewer & state management
│   │   ├── Toolbar.jsx        # Top toolbar
│   │   ├── PageCanvas.jsx     # Single page renderer
│   │   └── ThumbnailSidebar.jsx
│   ├── lib/
│   │   ├── pdf.js             # PDF loading (File or URL)
│   │   └── progress.js        # localStorage progress helpers
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── Dockerfile
└── docker-compose.yml
```

---

## Docker

You can also run the app inside a container:

```bash
docker compose up --build
```

The container serves the built application on port `80` by default.

---

## Browser support

- Chrome / Edge (recommended)
- Firefox
- Safari
- Any modern browser with ES modules and `ResizeObserver` support.

---

## License

This project is open source. Feel free to fork and adapt it to your needs.
