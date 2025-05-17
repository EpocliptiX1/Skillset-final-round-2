let currentMode = 'text-legacy';
let chatHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Init] Chat app initialized');
    
    document.querySelectorAll('.chatbot-sidebar li').forEach(item => {
        item.addEventListener('click', () => {
            currentMode = item.dataset.action;
            document.querySelector('.chatbot-sidebar li.active')?.classList.remove('active');
            item.classList.add('active');
            updateUIForMode();
        });
    });

    document.getElementById('sendBtn').addEventListener('click', handleUserInput);
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
});

function updateUIForMode() {
    const fileInput = document.getElementById('fileInput');
    const chatInput = document.getElementById('chatInput');
    
    if (currentMode === 'image' || currentMode === 'pdf') {
        fileInput.style.display = 'inline-block';
        chatInput.style.display = 'none';
        fileInput.accept = currentMode === 'image' ? 'image/*' : '.pdf';
    } else {
        fileInput.style.display = 'none';
        chatInput.style.display = 'inline-block';
        chatInput.placeholder = currentMode.includes('text') 
            ? 'Paste your text here...' 
            : 'Enter your message...';
    }
}

function smartAnonymize(input, scramble = false) {
    console.log('[Beta] Original text:', input);
    const doc = nlp(input);
    const people = doc.people().normalize();
    const nameMap = {};
    const redactedWords = [];

    if (scramble && typeof faker !== 'undefined') {
        people.forEach(p => {
            const original = p.text();
            if (!nameMap[original]) {
                nameMap[original] = faker.name.fullName();
            }
        });
    }

    let redacted = input;
    people.forEach(p => {
        const name = p.text();
        const replacement = scramble ? nameMap[name] : '███';
        const regex = new RegExp(`\b${name}\b`, 'gi');
        redactedWords.push(name);
        redacted = redacted.replace(regex, replacement);
    });

    console.log('[Beta] Redacted text:', redacted);
    return { redactedText: redacted, redactedWords };
}

function anonymizeText(text) {
    const input = text != null ? text : document.getElementById("textInput").value;
    console.log('[Legacy] Original text:', input);

    const iinMatches  = (input.match(/\b\d{12}\b/g) || []).length;
    const cardMatches = (input.match(/\b\d{16,20}\b/g) || []).length;
    const nameMatches = (input.match(/\b([A-ZА-ЯЁ][a-zа-яё]+)\s+([A-ZА-ЯЁ][a-zа-яё]+)\b/g) || []).length;

    let redacted = input
        .replace(/\b\d{12}\b/g, "|REDACTED|")
        .replace(/\b\d{16,20}\b/g, "XXX-XXXX")
        .replace(/\b([A-ZА-ЯЁ][a-zа-яё]+)\s+([A-ZА-ЯЁ][a-zа-яё]+)\b/g, "|REDACTED|");

    console.log('[Legacy] Redacted text:', redacted);
    document.getElementById("output").value = redacted;
    document.getElementById("simpleRedactCount").innerText =
        `Redacted items: ${iinMatches + cardMatches + nameMatches}`;

    return redacted;
}

async function handleUserInput() {
    const inputEl = document.getElementById('chatInput');
    const fileInput = document.getElementById('fileInput');
    
    if (currentMode === 'image' || currentMode === 'pdf') {
        fileInput.click();
    } else {
        await processText(inputEl.value);
        inputEl.value = '';
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    addMessage('user', `Uploaded ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
    
    try {
        if (currentMode === 'image') {
            await handleImageUpload(event);
            const canvas = document.getElementById('canvas');

            const img = document.createElement('img');
            img.src = canvas.toDataURL();
            img.style.maxWidth = '300px';
            img.style.marginTop = '10px';

            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Download';
            downloadBtn.style.display = 'block';
            downloadBtn.style.margin = '8px auto 0';
            downloadBtn.onclick = () => downloadImage(canvas.toDataURL());

            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.appendChild(img);
            container.appendChild(downloadBtn);

            addMessage('system', 'Image processed:', container);
        } else if (currentMode === 'pdf') {
            await processPdfInChat(file);
        }
    } catch (error) {
        addMessage('system', `Error processing file: ${error.message}`);
    }
}

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
async function processPdfInChat(file) {
    try {
        const typedarray = new Uint8Array(await file.arrayBuffer());
        const loadingTask = pdfjsLib.getDocument(typedarray);
        const pdf = await loadingTask.promise;

        // Create a message container in the chat
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message system';
        messageDiv.innerHTML = '<p>PDF processed:</p>';
        document.getElementById('chatDisplay').appendChild(messageDiv);

        const originalText = await extractTextFromPdf(file);
        const { redactedText, redactedWords } = smartAnonymize(originalText);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.2 });

            // Create canvas directly in chat
            const blurCanvas = document.createElement('canvas');
            const blurCtx = blurCanvas.getContext('2d');
            blurCanvas.width = viewport.width;
            blurCanvas.height = viewport.height;
            
            await page.render({
                canvasContext: blurCtx,
                viewport: viewport
            }).promise;
            // Inside processPdfInChat(), after page.render():
            const faces = await detectFacesAndExtract(blurCanvas);
            if (faces.length > 0) {
                const faceContainer = document.createElement('div');
                faceContainer.style.display = 'flex';
                faceContainer.style.flexWrap = 'wrap';
                faceContainer.style.gap = '10px';
                faces.forEach(faceUrl => {
                    const img = document.createElement('img');
                    img.src = faceUrl;
                    img.style.maxWidth = '100px';
                    faceContainer.appendChild(img);
                });
                messageDiv.appendChild(faceContainer);
            }
            // Process redactions
            const textContent = await page.getTextContent();
            textContent.items.forEach(item => {
                const str = item.str.trim();
                redactedWords.forEach(word => {
                    if (str.toLowerCase().includes(word.toLowerCase())) {
                        const tx = pdfjsLib.Util.transform(
                            pdfjsLib.Util.transform(viewport.transform, item.transform), 
                            [1, 0, 0, -1, 0, 0]
                        );
                        const [x, y] = [tx[4], tx[5]];
                        const fontSize = Math.abs(item.transform[3]);
                        blurCtx.fillStyle = 'black';
                        blurCtx.fillRect(x, y - 10, item.width + 100, fontSize + 5);
                    }
                });
            });

            // Style and add to chat
            blurCanvas.style.width = '100%';
            blurCanvas.style.maxWidth = '600px';
            blurCanvas.style.margin = '10px 0';
            blurCanvas.style.border = '1px solid #ddd';
            messageDiv.appendChild(blurCanvas);

            // Add download button for each page
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = `Download Page ${pageNum}`;
            downloadBtn.style.margin = '5px';
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.download = `redacted-page-${pageNum}.png`;
                link.href = blurCanvas.toDataURL('image/png');
                link.click();
            };
            messageDiv.appendChild(downloadBtn);
        }

        // Scroll to bottom after processing
        const chatDisplay = document.getElementById('chatDisplay');
        chatDisplay.scrollTop = chatDisplay.scrollHeight;

    } catch (error) {
        throw new Error(`PDF processing failed: ${error.message}`);
    }
}
 
async function processText(text) {
    addMessage('user', text);

    try {
        if (currentMode === 'text-legacy') {
            const redacted = anonymizeText(text);
            addMessage('system', `Redacted text: ${redacted}`);
        } else {
            const scramble = document.getElementById('enableScramble')?.checked || false;
            const { redactedText } = smartAnonymize(text, scramble);
            addMessage('system', `Redacted text: ${redactedText}`);
        }
    } catch (error) {
        addMessage('system', `Error: ${error.message}`);
    }
}

function addMessage(role, content, extraData = null) {
    const chatDisplay = document.getElementById('chatDisplay');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    messageDiv.style.margin = '10px';
    messageDiv.style.padding = '15px';
    messageDiv.style.borderRadius = '8px';
    messageDiv.style.background = role === 'user' ? '#e3f2fd' : '#f1f1f1';
    messageDiv.style.maxWidth = '80%';
    messageDiv.style.wordBreak = 'break-word';

    const contentEl = document.createElement('p');
    contentEl.textContent = content;   
    messageDiv.appendChild(contentEl);

    if (extraData instanceof HTMLElement) {
        messageDiv.appendChild(extraData);
    }

    chatDisplay.appendChild(messageDiv);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

function downloadImage(dataUrl) {
    const link = document.createElement('a');
    link.download = `redacted-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
}

// Export globals
window.anonymizeText     = anonymizeText;
window.processPdfInChat  = processPdfInChat;
window.handleFileUpload  = handleFileUpload;
window.addMessage        = addMessage;
