import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

const DB_NAME = 'BlurredImageDB';
const STORE_NAME = 'images';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

async function saveBlurredImage(dataURL) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ dataURL });
}

// Example usage for PDF/image uploads
window.saveBlurredCanvas = async function(canvas) {
    const dataURL = canvas.toDataURL('image/png');
    await saveBlurredImage(dataURL);
};

document.addEventListener('DOMContentLoaded', () => {
    const exportMenuBtn = document.getElementById('exportButton');
    const exportPopup = document.getElementById('exportPopup');
    const exportAllBtn = document.getElementById('exportAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const closeTabBtn = document.getElementById('closeTabBtn');

    if (exportMenuBtn && exportPopup) {
        exportMenuBtn.addEventListener('click', () => {
            exportPopup.style.display = (exportPopup.style.display === 'none' || !exportPopup.style.display) ?
                'block' :
                'none';
        });
    }
    closeTabBtn.addEventListener('click', () => {
        exportPopup.style.display = 'none';
    });
    if (exportAllBtn) {
        exportAllBtn.onclick = async() => {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = async() => {
                const images = request.result;
                if (!images.length) {
                    alert('No saved images found.');
                    return;
                }

                const zip = new JSZip();
                images.forEach((img, i) => {
                    zip.file(`page-${i + 1}.png`, img.dataURL.split(',')[1], { base64: true });
                });

                const blob = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'blurred_pages.zip';
                link.click();
            };
        };
    }

    if (clearAllBtn) {
        clearAllBtn.onclick = async() => {
            const confirmClear = confirm('Are you sure you want to clear all saved images?');
            if (!confirmClear) return;

            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.clear();

            alert('All saved blurred images have been cleared.');
        };
    }
});
export { openDB };
