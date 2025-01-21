chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "PRINT_DATA") {
        const { data } = message;

        console.log("Received data:", data);

        // Get the active tab in the current window
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    args: [data],
                    function: processInputs
                }).then((result) => {
                    const ids = result[0].result; // Collect IDs returned from the script
                    if (ids && ids.length > 0) {
                        console.log(`Collected ${ids.length} IDs:`, ids);
                        navigateUrlsInSameTab(ids, activeTab.id, data.positions);
                    } else {
                        console.log("No IDs found.");
                    }
                }).catch((error) => {
                    console.error("Error executing script:", error);
                });
            } else {
                console.error("No active tab found. Cannot execute script.");
            }
        });
    }
});

// Function to process inputs in the active tab and extract IDs
function processInputs(data) {
    console.log("Processing in active tab:");

    const canDoApplication = data.currentUrl.startsWith("https://www.dice.com/jobs") ? "Yes" : "No";
    console.log(`Current URL: ${data.currentUrl}`);
    console.log(`Can Do Application: ${canDoApplication}`);

    if (canDoApplication === "Yes") {
        console.log("Fetching IDs of specified <a> elements...");

        // Get all <a> elements matching the criteria
        const links = document.querySelectorAll('a[data-cy="card-title-link"]');
        const ids = Array.from(links)
            .map((link) => link.id)
            .filter((id) => id); // Collect non-empty IDs

        return ids;
    }

    return [];
}

function navigateUrlsInSameTab(ids, tabId, positions) {
    const baseUrl = "https://www.dice.com/job-detail/";
    let index = 0;

    const processNextUrl = () => {
        if (index < ids.length) {
            const url = `${baseUrl}${ids[index]}`;
            console.log(`Navigating to: ${url}`);

            chrome.tabs.update(tabId, { url }, () => {
                const delay = Math.floor(Math.random() * 15000) + 4000; // Random delay between 1 and 5 seconds
                console.log(`Waiting for ${delay}ms before extracting job description...`);

                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        function: extractJobDescription
                    }).then((results) => {
                        if (results && results[0]?.result) {
                            const jobDescription = results[0].result;
                            console.log(`Job Description for ${url}:`);
                            console.log(jobDescription);

                            // Find the position with the maximum keyword count
                            const bestPosition = findMaxKeywordPosition(jobDescription, positions);
                            if (bestPosition) {
                                console.log(`Best-matching position for ${url}: "${bestPosition.title}"`);
                                console.log(`Associated file path: ${bestPosition.filePath}`);

                                // Click the Easy Apply button
                                clickEasyApply(tabId);
                            }
                        } else {
                            console.log(`No job description found for ${url}.`);
                        }

                        // Move to the next URL
                        index++;
                        processNextUrl();
                    }).catch((error) => {
                        console.error(`Error extracting job description for ${url}:`, error);

                        // Move to the next URL even if extraction fails
                        index++;
                        processNextUrl();
                    });
                }, delay);
            });
        } else {
            console.log("Finished navigating all URLs.");
        }
    };

    // Start processing URLs
    processNextUrl();
}

// Function to extract the job description
function extractJobDescription() {
    const jobDescriptionDiv = document.querySelector('div[data-testid="jobDescriptionHtml"]');
    return jobDescriptionDiv ? jobDescriptionDiv.innerText.trim() : null;
}

// Function to click the Easy Apply button
function clickEasyApply(tabId) {
    chrome.scripting.executeScript({
        target: { tabId },
        function: attemptEasyApply
    }).catch((error) => {
        console.error("Error clicking Easy Apply button:", error);
    });
}

// Function to find and click Easy Apply button in Shadow DOM
function attemptEasyApply() {
    console.log("Attempting to find Easy Apply button in shadow DOM...");
    try {
        const shadowHost = document.querySelector("apply-button-wc.hydrated");
        if (!shadowHost) {
            console.log("Shadow host element not found.");
            return;
        }

        const shadowRoot = shadowHost.shadowRoot;
        const easyApplyButton = shadowRoot.querySelector("button.btn.btn-primary");

        if (easyApplyButton && easyApplyButton.innerText.toLowerCase().includes("easy apply")) {
            easyApplyButton.click();
            console.log("Successfully clicked Easy Apply button. Waiting for 5 minutes...");
            setTimeout(() => {
                console.log("5 minutes wait completed.");
            }, 5 * 60 * 1000); // Wait for 5 minutes
        } else {
            console.log("Easy Apply button not found - job might already be applied to.");
        }
    } catch (error) {
        console.error("Error finding Easy Apply button in shadow DOM:", error);
    }
}

// Function to find the position with the maximum keyword count
function findMaxKeywordPosition(jobDescription, positions) {
    let maxCount = -1;
    let bestPosition = null;

    positions.forEach((position) => {
        const totalKeywords = position.keywords.reduce((count, keyword) => {
            const regex = new RegExp(`\\b${keyword.trim()}\\b`, 'gi'); // Match whole words, case-insensitive
            const matches = jobDescription.match(regex);
            return count + (matches ? matches.length : 0);
        }, 0);

        console.log(`Total keyword count for "${position.title}": ${totalKeywords}`);

        if (totalKeywords > maxCount) {
            maxCount = totalKeywords;
            bestPosition = position;
        }
    });

    return bestPosition;
}



