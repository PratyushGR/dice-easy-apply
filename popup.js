document.addEventListener("DOMContentLoaded", () => {
    const sectionsContainer = document.getElementById("sectionsContainer");
    const avoidContainer = document.getElementById("avoidContainer");
    const searchContainer = document.getElementById("searchContainer");
    const locationContainer = document.getElementById("locationContainer");
    const addButton = document.getElementById("addButton");
    const addAvoidButton = document.getElementById("addAvoidButton");
    const addSearchButton = document.getElementById("addSearchButton");
    const addLocationButton = document.getElementById("addLocationButton");
    const collapsibles = document.querySelectorAll(".collapsible");
    const contents = document.querySelectorAll(".content");

    // Toggle collapsible content visibility
    collapsibles.forEach((collapsible, index) => {
        collapsible.addEventListener("click", () => {
            const content = contents[index];
            content.style.display = content.style.display === "block" ? "none" : "block";
        });
    });

    // Load saved data
    chrome.storage.local.get(
        ["savedData", "avoidData", "searchData", "locationData"],
        ({ savedData, avoidData, searchData, locationData }) => {
            if (savedData && savedData.length > 0) {
                savedData.forEach(({ title, keywords, filePath }, index) => {
                    addSection(title, keywords.join(","), filePath, index);
                });
            }
            if (avoidData) addListSection(avoidContainer, avoidData, "avoidData", "Keywords to Avoid");
            if (searchData) addListSection(searchContainer, searchData, "searchData", "Search Keywords");
            if (locationData) addListSection(locationContainer, locationData, "locationData", "Locations");
        }
    );

    // Add new title section
    addButton.addEventListener("click", () => {
        const title = prompt("Enter the title:");
        if (!title) return;
        const keywords = prompt("Enter keywords (comma-separated):");
        if (!keywords) return;
        const filePath = prompt("Enter file path (only .pdf, .doc, .docx):");
        if (!validateFilePath(filePath)) {
            alert("Invalid file type! Only .pdf, .doc, and .docx files are allowed.");
            return;
        }
        saveData({ title, keywords: keywords.split(","), filePath });
    });

    // Add new list item for avoid keywords, search keywords, or locations
    [addAvoidButton, addSearchButton, addLocationButton].forEach((button, index) => {
        const keys = ["avoidData", "searchData", "locationData"];
        button.addEventListener("click", () => {
            const input = prompt(`Enter ${keys[index].replace("Data", "").toLowerCase()} (comma-separated):`);
            if (!input) return;
            saveListData(keys[index], input.split(","));
        });
    });

    // Add a title section
    function addSection(title, keywords, filePath, index) {
        const section = document.createElement("div");
        section.classList.add("section");

        const inputGroup = document.createElement("div");
        inputGroup.classList.add("input-group");

        inputGroup.innerHTML = `
            <label>Title:</label>
            <input type="text" class="title-input" value="${title}">
            <label>Keywords:</label>
            <input type="text" class="keywords-input" value="${keywords}">
            <label>File Path:</label>
            <input type="text" class="filePath-input" value="${filePath}">
            <div class="buttons">
                <button class="button update-button">Update</button>
                <button class="button delete-button">Delete</button>
            </div>
        `;

        inputGroup.querySelector(".update-button").addEventListener("click", () => {
            const newTitle = inputGroup.querySelector(".title-input").value;
            const newKeywords = inputGroup.querySelector(".keywords-input").value.split(",");
            const newFilePath = inputGroup.querySelector(".filePath-input").value;

            if (!validateFilePath(newFilePath)) {
                alert("Invalid file type! Only .pdf, .doc, and .docx files are allowed.");
                return;
            }

            updateData(index, { title: newTitle, keywords: newKeywords, filePath: newFilePath });
        });

        inputGroup.querySelector(".delete-button").addEventListener("click", () => {
            if (confirm(`Are you sure you want to delete "${title}"?`)) deleteData(index);
        });

        section.appendChild(inputGroup);
        sectionsContainer.appendChild(section);
    }

    // Add a list-based section (avoid keywords, search keywords, locations)
    function addListSection(container, data, key, label) {
        container.innerHTML = "";
        const inputGroup = document.createElement("div");
        inputGroup.classList.add("input-group");

        inputGroup.innerHTML = `
            <label>${label}:</label>
            <input type="text" class="list-input" value="${data.join(",")}" readonly>
            <div class="buttons">
                <button class="button update-button">Update</button>
                <button class="button delete-button">Delete</button>
            </div>
        `;

        inputGroup.querySelector(".update-button").addEventListener("click", () => {
            const newData = prompt(`Enter ${label.toLowerCase()} (comma-separated):`);
            if (!newData) return;
            saveListData(key, newData.split(","));
        });

        inputGroup.querySelector(".delete-button").addEventListener("click", () => {
            if (confirm(`Are you sure you want to delete all ${label.toLowerCase()}?`)) saveListData(key, []);
        });

        container.appendChild(inputGroup);
    }

    // Save title data
    function saveData(entry) {
        chrome.storage.local.get("savedData", ({ savedData }) => {
            const data = savedData || [];
            data.push(entry);
            chrome.storage.local.set({ savedData: data }, () => location.reload());
        });
    }

    // Save list data (avoid keywords, search keywords, locations)
    function saveListData(key, data) {
        chrome.storage.local.set({ [key]: data }, () => location.reload());
    }

    // Update title data
    function updateData(index, updatedEntry) {
        chrome.storage.local.get("savedData", ({ savedData }) => {
            savedData[index] = updatedEntry;
            chrome.storage.local.set({ savedData }, () => location.reload());
        });
    }

    // Delete title data
    function deleteData(index) {
        chrome.storage.local.get("savedData", ({ savedData }) => {
            savedData.splice(index, 1);
            chrome.storage.local.set({ savedData }, () => location.reload());
        });
    }

    // Validate file path
    function validateFilePath(filePath) {
        return /\.(pdf|doc|docx)$/i.test(filePath);
    }
});
