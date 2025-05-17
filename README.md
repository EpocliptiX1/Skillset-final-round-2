The repo contains my presentation, the video (1min one) and the whole project.

here is another small overview :
Technologies Used
Frontend Framework: Pure HTML/CSS/JavaScript (no frameworks)

**Key Libraries:

PDF.js for PDF processing

face-api.js for face detection

Compromise.js for NLP text processing

Faker.js for generating fake data

JSZip for creating zip archives

Storage: IndexedDB for local storage of processed images

Modules: ES6 modules for code organization
=========
Privacy & Security Implementation
followed several important rules for a privacy-focused application:

Local Processing:

All processing happens client-side (no server calls)

Sensitive data never leaves the user's browser

Confirmed by examining all JavaScript files

Data Handling:

Implemented proper redaction for:

Personal names (using NLP)

IIN numbers (12-digit numbers)

Credit card numbers (16-20 digits)

Email addresses

Provided both redaction (blacking out) and scrambling (replacement with fake data) options

Authentication:

Local account system stores credentials only in localStorage

Allows export of account data as JSON

Clear warning before sign-out about data loss

GDPR Compliance Indicators:

Hero section badges mention "GDPR Ready"

All processing stays local as promised

No evidence of analytics or tracking

File Handling:

Images and PDFs processed entirely in browser

Face detection and blurring happens client-side

Option to export processed files

=========================
Implementation Details
Text Anonymization:

Two modes (legacy pattern matching and smart NLP-based)

Proper handling of Cyrillic and Latin characters

Counts of redacted items displayed

Image Processing:

Face detection with adjustable blur intensity

Canvas-based processing

Download options for processed images

PDF Processing:

Text extraction and redaction

Face detection in PDF pages

Multi-page handling

Download options per page

Chat Interface:

Unified interface for all processing types

Conversation history maintained

Clear mode switching
