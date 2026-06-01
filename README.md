# Methodist Hymn Book - PowerPoint Importer Pipeline

This project contains a high-performance, automated pipeline designed to parse Xhosa (and other languages) Methodist hymns from PowerPoint slides and output structured React schema JSON datasets for the web application.

---

## 📋 The Pipeline Flow

The workflow is structured as follows:

1. **Place Slides**: Put all raw `.ppt` (legacy binary 97-2003 format) or `.pptx` (modern XML format) files into the `import-source/` directory.
2. **Convert to PPTX**: Batch convert all legacy `.ppt` files to modern `.pptx` slides.
   - **Automatic Mode**: The script automatically detects if LibreOffice is installed (on Windows, macOS, or Linux) and converts `.ppt` files headlessly, saving results into `import-source-converted/`.
   - **Manual Mode**: If LibreOffice is not found, the script gracefully logs step-by-step instructions so you can convert them locally or manually and place them in `import-source-converted/`.
3. **Aggregate Target Files**: The script copies all pre-existing `.pptx` files from `import-source/` to `import-source-converted/` so all targets are processed together.
4. **Parse slides**: The script runs the slide extractor against all `.pptx` files gathered in `import-source-converted/`.
5. **Output Generation**:
   - `public/data/xhosa.json` containing fully structured Hymn verses.
   - `import-report.json` containing total figures, timestamps, and precise scan logs.
   - `manual-review.json` flagging quality alerts (e.g. missing "AMEN" triggers, short lyrics lengths, scripture mismatches) and unresolved legacy `.ppt` formats.

---

## ⚙️ Setup and Prerequisites

### 🪟 Windows Setup (Preferred Option)

To parse legacy `.ppt` slides, **LibreOffice** is used for headless command-line conversion.

#### Method A: Automatic Path Detection (Recommended)
1. Download and run the **LibreOffice Installer** from: [https://www.libreoffice.org/](https://www.libreoffice.org/)
2. Follow the standard installation wizard.
3. Keep the default install location:
   - For 64-bit Windows: `C:\Program Files\LibreOffice`
   - For 32-bit Windows: `C:\Program Files (x86)\LibreOffice`
4. **No extra PATH environment configuration is required!** The import pipeline automatically locates the `soffice.exe` engine inside these paths.

#### Method B: Manual CLI Conversion
If you prefer to convert the files yourself through CMD/Powershell before running the parser:
1. Open Command Prompt (`cmd.exe`) in the project root directory.
2. Run the following command:
   ```cmd
   "C:\Program Files\LibreOffice\program\soffice.exe" --headless --convert-to pptx --outdir import-source-converted import-source\*.ppt
   ```
3. This will instantly batch convert all `.ppt` files in `import-source/` into the `import-source-converted/` directory.

---

### 🍏 macOS & 🐧 Linux Setup

#### macOS
Install LibreOffice easily using Homebrew:
```bash
brew install --cask libreoffice
```
The script will auto-detect the installation path under `/Applications/LibreOffice.app`.

#### Ubuntu / Debian
```bash
sudo apt-get update
sudo apt-get install libreoffice
```

---

## 🚀 How to Run the Pipeline

Once your files or converted slides are placed, you can run the integration with a single command:

```bash
npm run import:hymns
```

*Alternative native execution command:*
```bash
npx tsx scripts/import_hymns.ts
```

---

## 📊 Pipeline Outputs

Upon completion, the pipeline generates:

- **`public/data/xhosa.json`**: An array of clean hymn records conforming to the React component schema:
  ```json
  [
    {
      "bookId": "xhosa",
      "hymnNumber": 11,
      "hymnCode": "X11",
      "title": "Bulelani kuYehova",
      "lyrics": "VERSE 1\nBulelani kuYehova...\n\nVERSE 2\n...",
      "author": "Traditional Methodist",
      "category": "General Worship"
    }
  ]
  ```
- **`import-report.json`**: Statistics on scanned items, successes, and failures.
- **`manual-review.json`**: Actionable flags containing details on slide formatting, un-matched scripture chapters, or missing terminal AMENs, making quality auditing simple.
