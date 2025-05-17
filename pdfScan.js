import * as pdfjsLib from './pdfjs-5.2.133-dist/build/pdf.mjs';
window.processPdf = processPdf;
window.extractTextFromPdf = extractTextFromPdf;
window.smartAnonymize = smartAnonymize;
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjs-5.2.133-dist/build/pdf.worker.mjs';

window.singleBlurredCanvas = null;
window.extractedTextUR = null;

const container = document.getElementById('pdfScanContainer');
container.style.overflowY = 'auto';

async function detectFacesAndExtract(canvas) {
    console.log("running detectFacesAndExtract");
    const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions());
    const ctx = canvas.getContext('2d');
    const faces = [];

    for (const det of detections) {
        const box = det.box;
        const faceImageData = ctx.getImageData(box.x, box.y, box.width, box.height);

        const offCanvas = document.createElement('canvas');
        offCanvas.width = box.width;
        offCanvas.height = box.height;
        const offCtx = offCanvas.getContext('2d');
        offCtx.putImageData(faceImageData, 0, 0);

        offCtx.filter = 'blur(6px)';
        offCtx.drawImage(offCanvas, 0, 0);

        const blurredImageData = offCtx.getImageData(0, 0, box.width, box.height);
        ctx.putImageData(blurredImageData, box.x, box.y);

        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = box.width;
        faceCanvas.height = box.height;
        const faceCtx = faceCanvas.getContext('2d');
        faceCtx.putImageData(faceImageData, 0, 0);

        const faceDataUrl = faceCanvas.toDataURL('image/png');
        faces.push(faceDataUrl);

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
    }

    return faces;
}

async function extractTextFromPdf(file) {
    const typedarray = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument(typedarray);
    const pdf = await loadingTask.promise;
    console.log("running extractTextFromPdf");

    let textContent = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const text = await page.getTextContent();
        const textItems = text.items.map(item => item.str).join(' ');
        textContent += textItems + '\n';
    }

    console.log('Extracted text:', textContent);
    window.extractedTextUR = textContent;
    return textContent;
}

function smartAnonymize(text) {
    // Use compromise.js to find names
    const doc        = nlp(text);
    const people     = doc.people().normalize();
    const peopleList = people.out('array');

    // Find IINs, cards, emails
    const iinMatches    = [...text.matchAll(/\b\d{12}\b/g)].map(m => m[0]);
    const cardMatches   = [...text.matchAll(/\b\d{16,20}\b/g)].map(m => m[0]);
    const emailRegex    = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const emailMatches  = [...text.matchAll(emailRegex)].map(m => m[0]);

    // Redact names first
    people.replaceWith("Person", { keepCase: false });
    let updated = doc.text();

    // Redact IINs & cards & emails
    updated = updated
      .replace(/\b\d{12}\b/g, "|REDACTED|")
      .replace(/\b\d{16,20}\b/g, "XXX-XXXX")
      .replace(emailRegex, "[email redacted]");

    // Collect every distinct word to draw boxes around
    const redactedWords = [
      ...new Set([
        ...peopleList,
        ...iinMatches,
        ...cardMatches,
        ...emailMatches
      ])
    ];

    return {
      redactedText: updated,
      redactedWords
    };
}


async function processPdf(file) {
    const typedarray = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument(typedarray);
    const pdf = await loadingTask.promise;
    console.log("running processPdf");

    container.querySelectorAll('canvas, img, button').forEach(el => el.remove());

    const originalText = await extractTextFromPdf(file);
    const { redactedText, redactedWords } = smartAnonymize(originalText);
    console.log("🔍 Redacted words list:", redactedWords);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.2 });

        const rawCanvas = document.createElement('canvas');
        const rawCtx = rawCanvas.getContext('2d');
        rawCanvas.width = viewport.width;
        rawCanvas.height = viewport.height;
        await page.render({ canvasContext: rawCtx, viewport }).promise;

        const blurCanvas = document.createElement('canvas');
        const blurCtx = blurCanvas.getContext('2d');
        blurCanvas.width = viewport.width;
        blurCanvas.height = viewport.height;
        await page.render({ canvasContext: blurCtx, viewport }).promise;

        const faces = await detectFacesAndExtract(blurCanvas);

        const textContent = await page.getTextContent();

        for (const item of textContent.items) {
            const str = item.str.trim();
            for (const word of redactedWords) {
                if (str.toLowerCase().includes(word.toLowerCase())) {
                    const tx = pdfjsLib.Util.transform(
                        pdfjsLib.Util.transform(viewport.transform, item.transform), [1, 0, 0, -1, 0, 0]
                    );
                    const [x, y] = [tx[4], tx[5]];
                    const fontSize = Math.abs(item.transform[3]);

                    blurCtx.fillStyle = 'black';
                    blurCtx.fillRect(x, y - 10, item.width + 100, fontSize + 5);
                    console.log(`🟥 Redacted: "${str}" at x=${x}, y=${y}, w=${item.width}, h=${fontSize}`);
                    break;
                }
            }
        }

        blurCanvas.style.width = '100%';
        blurCanvas.style.marginBottom = '10px';
        container.appendChild(blurCanvas);
        window.singleBlurredCanvas = blurCanvas;

        // ✅ Wait for canvas updates to flush before saving
        await new Promise(resolve => requestAnimationFrame(resolve));

        saveBlurredCanvas(blurCanvas); // <- ✅ Your custom save function

        const faceContainer = document.createElement('div');
        faceContainer.style.display = 'none';
        faceContainer.classList.add('face-container');
        faceContainer.style.gap = '10px';
        faceContainer.style.flexWrap = 'wrap';
        faceContainer.style.marginBottom = '20px';

        faces.forEach(faceUrl => {
            const img = document.createElement('img');
            img.src = faceUrl;
            img.style.maxWidth = '120px';
            img.style.border = '2px solid red';
            img.style.borderRadius = '4px';
            faceContainer.appendChild(img);
        });

        container.appendChild(faceContainer);

        if (faces.length > 1) {
            const btn = document.createElement('button');
            btn.textContent = `Download the ${faces.length} faces separately`;
            btn.onclick = () => {
                faces.forEach((faceUrl, i) => {
                    const a = document.createElement('a');
                    a.href = faceUrl;
                    a.download = `face_${pageNum}_${i + 1}.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                });
            };
            container.appendChild(btn);
        }
    }
}

document.getElementById('extractFaces').addEventListener('change', (e) => {
    const show = e.target.checked;
    document.querySelectorAll('.face-container').forEach(container => {
        container.style.display = show ? 'flex' : 'none';
    });
});

document.getElementById('pdfInput').addEventListener('change', async(e) => {
    await loadModels();
    await processPdf(e.target.files[0]);
});