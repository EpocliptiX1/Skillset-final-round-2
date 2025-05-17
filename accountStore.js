import { openDB } from './exportControls.js'; // Make sure exportControls.js exports openDB
import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

window.addEventListener("DOMContentLoaded", () => {
  const accountBtn       = document.getElementById("account-btn");
  const accountPanel     = document.getElementById("account-panel");
  const signupBtn        = document.getElementById("signup-btn");
  const signinKeyBtn     = document.getElementById("signin-key-btn");
  const signupForm       = document.getElementById("signup-form");
  const submitSignup     = document.getElementById("submit-signup");
  const accountLoggedIn  = document.getElementById("account-logged-in");
  const accountInfo      = document.getElementById("account-info");
  const downloadKeyBtn   = document.getElementById("download-key");
  const signoutBtn       = document.getElementById("signout-btn");
  const exportImagesBtn  = document.getElementById("export-images");

  let accountData = null;

  // 1) properly show/hide by toggling the same "hidden" class
  accountBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    accountPanel.classList.toggle("hidden");
    console.log("account-panel hidden =", accountPanel.classList.contains("hidden"));
  });

  // click outside to close
  window.addEventListener("click", (e) => {
    if (!accountPanel.contains(e.target) && e.target !== accountBtn) {
      accountPanel.classList.add("hidden");
    }
  });

  // Sign-up
  signupBtn.addEventListener("click", () => {
    signupForm.classList.remove("hidden");
  });
  submitSignup.addEventListener("click", () => {
    const un = document.getElementById("signup-username").value;
    const pw = document.getElementById("signup-password").value;
    if (!un||!pw) return alert("Fill both fields");
    accountData = {username:un,password:pw};
    localStorage.setItem("accountData", JSON.stringify(accountData));
    showLoggedInView();
  });

  // Sign in with key
  signinKeyBtn.addEventListener("click", () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".json";
    inp.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      accountData = JSON.parse(await file.text());
      localStorage.setItem("accountData", JSON.stringify(accountData));
      showLoggedInView();
    };
    inp.click();
  });

  // Download JSON key
  downloadKeyBtn.addEventListener("click", () => {
    if (!accountData) return;
    const blob = new Blob([JSON.stringify(accountData)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "account-key.json";
    a.click();
  });

  // Export saved images
  exportImagesBtn?.addEventListener("click", async () => {
    const db = await openDB();
    const tx = db.transaction("images","readonly");
    const store = tx.objectStore("images");
    const req = store.getAll();
    req.onsuccess = async () => {
      const imgs = req.result;
      if (!imgs.length) return alert("No saved images");
      const zip = new JSZip();
      imgs.forEach((img,i) => zip.file(`page-${i+1}.png`, img.dataURL.split(',')[1], {base64:true}));
      const blob = await zip.generateAsync({type:"blob"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "blurred_images.zip";
      a.click();
    };
  });

  // Sign out
  signoutBtn.addEventListener("click", async () => {
    const ok = confirm(
      "Before signing out, download your login key and export images.\n\nProceed to sign out?"
    );
    if (!ok) return;
    await clearSavedImages();
    localStorage.removeItem("accountData");
    accountData = null;
    resetAccountPanel();
  });

  function showLoggedInView() {
    signupForm.classList.add("hidden");
    document.getElementById("account-initial").classList.add("hidden");
    accountLoggedIn.classList.remove("hidden");
    accountInfo.textContent = `Logged in as ${accountData.username}`;
  }
  function resetAccountPanel() {
    accountLoggedIn.classList.add("hidden");
    signupForm.classList.add("hidden");
    document.getElementById("account-initial").classList.remove("hidden");
  }
  async function clearSavedImages() {
    const db = await openDB();
    const tx = db.transaction("images","readwrite");
    tx.objectStore("images").clear();
  }

  // restore session
  const saved = localStorage.getItem("accountData");
  if (saved) {
    accountData = JSON.parse(saved);
    showLoggedInView();
  }
});
