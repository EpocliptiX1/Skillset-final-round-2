// Make sure compromise.js is already loaded globally via <script> tag in HTML
// Or import it if it's a module version


// smartAnonymizer.js

// Makes sure compromise.js and faker (if scramble) are loaded globally
function smartAnonymizer() {
    console.log("running smartAnonymize");
    const input    = document.getElementById("smartInput").value;
    const scramble = document.getElementById("enableScramble").checked;

    // NLP for people
    const doc       = nlp(input);
    const people    = doc.people().normalize();
    const nameCount = people.length;

    // Build map for scrambled names
    const nameMap = {};
    if (scramble) {
        people.json().forEach(person => {
            const orig = person.text;
            if (!nameMap[orig]) {
                nameMap[orig] = window.faker.person.fullName();
            }
            doc.replace(orig, nameMap[orig]);
        });
    } else {
        people.replaceWith("Person", { keepCase: false });
    }

    let updated = doc.text();

    // IINs and credit cards
    const iinMatches  = input.match(/\b\d{12}\b/g)      || [];
    const cardMatches = input.match(/\b\d{16,20}\b/g)  || [];

    updated = updated.replace(/\b\d{12}\b/g, () =>
        scramble ? window.faker.string.numeric(12) : "|REDACTED|"
    );
    updated = updated.replace(/\b\d{16,20}\b/g, () =>
        scramble ? window.faker.finance.creditCardNumber() : "XXX-XXXX"
    );

    // EMAILS
    const emailRegex   = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const emailMatches = input.match(emailRegex) || [];

    updated = updated.replace(emailRegex, () =>
        scramble
          ? `${window.faker.internet.userName()}@${window.faker.internet.domainName()}`
          : "[email redacted]"
    );

    // Update UI
    document.getElementById("smartOutput").value = updated;
    document.getElementById("redactCount").innerText =
      `Redacted items: ${nameCount + iinMatches.length + cardMatches.length + emailMatches.length}`;
}

window.smartAnonymize = smartAnonymize;


window.smartAnonymize = smartAnonymize;

/*
function smartAnonymize() {
    let text = document.getElementById("smartInput").value;

    let doc = nlp(text);

    // Normalize people entities (better for lowercase/messy text)
    let people = doc.people().normalize();

    console.log('People detected:', people.json());

    // Count redactions
    let nameCount = people.length;

    // Replace all people mentions with 'Person'
    people.replaceWith("Person", { keepCase: false });

    let updated = doc.text();

    // Count IINs and bank numbers
    const iinMatches = (updated.match(/\b\d{12}\b/g) || []).length;
    const cardMatches = (updated.match(/\b\d{16,20}\b/g) || []).length;

    updated = updated
        .replace(/\b\d{12}\b/g, "|REDACTED|")
        .replace(/\b\d{16,20}\b/g, "XXX-XXXX");

    // Update UI
    document.getElementById("smartOutput").value = updated;
    document.getElementById("redactCount").innerText =
        `Redacted items: ${nameCount + iinMatches + cardMatches}`;
}*/

// text old anonim\\
function anonymizeText(text) {
    if (text == null) {
        text = document.getElementById("textInput").value;
    }
    console.log("Text Anonymized");

    // Count matches
    const iinMatches = (text.match(/\b\d{12}\b/g) || []).length;
    const cardMatches = (text.match(/\b\d{16,20}\b/g) || []).length;
    const nameMatches = (text.match(/\b([A-ZА-ЯЁ][a-zа-яё]+)\s+([A-ZА-ЯЁ][a-zа-яё]+)\b/g) || []).length;

    // Replace patterns
    text = text.replace(/\b\d{12}\b/g, "|REDACTED|");
    text = text.replace(/\b\d{16,20}\b/g, "XXX-XXXX");
    text = text.replace(/\b([A-ZА-ЯЁ][a-zа-яё]+)\s+([A-ZА-ЯЁ][a-zа-яё]+)\b/g, "|REDACTED|");

    // Update output
    document.getElementById("output").value = text;
    document.getElementById("simpleRedactCount").innerText =
        `Redacted items: ${iinMatches + cardMatches + nameMatches}`;
}


function downloadSmartOutput() {
    const text = document.getElementById("smartOutput").value;
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "anonymized.txt";
    link.click();
}