// imageBlur.js

let lastImage = null; // Store the last uploaded image
let lastDetections = []; // Store the last detections

// Load models from the "models" folder
async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('models');
    console.log("Models loaded!");
}

// Handle image upload and detect faces
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    lastImage = await loadImageFromFile(file);
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = lastImage.width;
    canvas.height = lastImage.height;
    ctx.drawImage(lastImage, 0, 0);

    lastDetections = await faceapi.detectAllFaces(lastImage, new faceapi.TinyFaceDetectorOptions());

    applyBlur();
}

// Apply blur using current blurIntensity value
function applyBlur() {
    if (!lastImage || !lastDetections.length) return;

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const blurValue = document.getElementById('blurIntensity').value;

    // Redraw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(lastImage, 0, 0);

    lastDetections.forEach(detection => {
        const { x, y, width, height } = detection.box;

        const faceImage = ctx.getImageData(x, y, width, height);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.putImageData(faceImage, 0, 0);
        tempCtx.filter = `blur(${blurValue}px)`;
        tempCtx.drawImage(tempCanvas, 0, 0);

        ctx.drawImage(tempCanvas, x, y);

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
    });
    saveBlurredCanvas(canvas); // canvas must be the one with the blurred result

}

// Utility: Load image from File object
function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

// Download blurred canvas image
function downloadBlurredImage() {
    const canvas = document.getElementById('canvas');
    const link = document.createElement('a');
    link.download = 'blurred-image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Setup event listeners on DOM load
window.addEventListener('DOMContentLoaded', () => {
    loadModels();
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    document.getElementById('blurIntensity').addEventListener('input', applyBlur);
});