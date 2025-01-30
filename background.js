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
                        processJobsSequentially(ids, activeTab.id, data.positions);
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

async function processJobsSequentially(ids, tabId, positions) {
    const baseUrl = "https://www.dice.com/job-detail/";

    for (const id of ids) {
        const url = `${baseUrl}${id}`;
        console.log(`Navigating to: ${url}`);

        // Navigate to the job URL
        await navigateToUrl(tabId, url);

        // Extract job description
        await sleep(9000);
        const jobDescription = await extractJobDescription(tabId);
        if (!jobDescription) {
            console.log(`No job description found for ${url}.`);
            continue; // Skip to the next job
        }

        console.log(`Job Description for ${url}:`);
        console.log(jobDescription);

        // Find the best-matching position
        console.log(positions)
        const bestPosition = findBestPosition(jobDescription, positions);
        if (!bestPosition) {
            console.log(`No matching position found for ${url}.`);
            continue; // Skip to the next job
        }
        

        console.log(`Best-matching position for ${url}: "${bestPosition.title}"`);
        console.log(`Associated file path: ${bestPosition.filePath}`);
        await sleep(5000)

        if (bestPosition === positions[0]){
            console.log("The best position is the default position proceeding to perform easy apply");
        // Click the Easy Apply button
            const easyApplyClicked = await clickEasyApply(tabId);
            await sleep(15000);
            if (easyApplyClicked) {
                console.log("Successfully clicked Easy Apply button. Waiting for the next job...");
                await sleep(5000);
                await clickNextButton(tabId);
                await sleep(5000);
                await clickSubmitButton(tabId);
                await sleep[5000]
            } else {
                console.log("Easy Apply button not found or already applied.");
            }
            const currentTab = await getCurrentTabUrl(tabId);
            console.log(`The current tab URL after Easy Apply: ${currentTab}`);
            // Function to get the current URL of a tab
        } else {
            console.log("The best position is not the default one");
        }

    }

    console.log("Finished processing all jobs.");
}

// Function to navigate to a URL
function navigateToUrl(tabId, url) {
    return new Promise((resolve) => {
        chrome.tabs.update(tabId, { url }, () => {
            console.log(`Navigated to: ${url}`);
            resolve();
        });
    });
}

// Function to extract the job description
function extractJobDescription(tabId) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript(
            {
                target: { tabId },
                function: () => {
                    const jobDescriptionDiv = document.querySelector('div[data-testid="jobDescriptionHtml"]');
                    return jobDescriptionDiv ? jobDescriptionDiv.innerText.trim() : null;
                }
            },
            (results) => {
                if (chrome.runtime.lastError) {
                    console.error("Error extracting job description:", chrome.runtime.lastError);
                    reject(null);
                } else {
                    resolve(results && results[0]?.result);
                }
            }
        );
    });
}

// Function to find the best-matching position
function findBestPosition(jobDescription, positions) {
    let maxCount = -1;
    let bestPosition = null;

    positions.forEach((position) => {
        const totalKeywords = position.keywords.reduce((count, keyword) => {
            const regex = new RegExp(`\\b${keyword.trim()}\\b`, 'gi');
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

// Function to click the Easy Apply button
function clickEasyApply(tabId) {
    return new Promise((resolve) => {
        chrome.scripting.executeScript(
            {
                target: { tabId },
                function: () => {
                    console.log("Attempting to find Easy Apply button in shadow DOM...");
                    try {
                        const shadowHost = document.querySelector("apply-button-wc.hydrated");
                        if (!shadowHost) {
                            console.log("Shadow host element not found.");
                            return false;
                        }

                        const shadowRoot = shadowHost.shadowRoot;
                        const easyApplyButton = shadowRoot.querySelector("button.btn.btn-primary");

                        if (easyApplyButton && easyApplyButton.innerText.toLowerCase().includes("easy apply")) {
                            easyApplyButton.click();
                            console.log("Successfully clicked Easy Apply button.");
                            return true;
                        } else {
                            console.log("Easy Apply button not found - job might already be applied to.");
                            return false;
                        }
                    } catch (error) {
                        console.error("Error finding Easy Apply button in shadow DOM:", error);
                        return false;
                    }
                }
            },
            (results) => {
                resolve(results && results[0]?.result);
            }
        );
    });
}

function getCurrentTabUrl(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
                console.error("Error retrieving current tab URL:", chrome.runtime.lastError);
                reject(null);
            } else {
                resolve(tab.url);
            }
        });
    });
}


async function clickNextButton(tabId) {
    try {
        const nextButtonClicked = await clickButton(
            tabId,
            "//span[text()='Next']",
            "xpath",
            "Looking for Next button...",
            "Clicking Next button..."
        );
        if (nextButtonClicked) {
            console.log("Next button clicked successfully.");
            return true;
        } else {
            console.log("Next button not found or could not be clicked.");
            return false;
        }
    } catch (error) {
        console.error("Error while clicking Next button:", error);
        return false;
    }
}

async function clickSubmitButton(tabId) {
    try {
        const submitButtonClicked = await clickButton(
            tabId,
            "button.seds-button-primary.btn-next",
            "css",
            "Looking for Submit button...",
            "Clicking Submit button..."
        );
        if (submitButtonClicked) {
            console.log("Submit button clicked successfully.");
            return true;
        } else {
            console.log("Submit button not found or could not be clicked.");
            return false;
        }
    } catch (error) {
        console.error("Error while clicking Submit button:", error);
        return false;
    }
}

// Shared helper function to click a button
function clickButton(tabId, selector, selectorType, lookingMessage, clickingMessage) {
    return new Promise((resolve) => {
        console.log(lookingMessage);

        chrome.scripting.executeScript(
            {
                target: { tabId },
                args: [selector, selectorType, clickingMessage],
                function: (selector, selectorType, clickingMessage) => {
                    try {
                        let button;
                        if (selectorType === "xpath") {
                            const xpathResult = document.evaluate(
                                selector,
                                document,
                                null,
                                XPathResult.FIRST_ORDERED_NODE_TYPE,
                                null
                            );
                            button = xpathResult.singleNodeValue;
                        } else if (selectorType === "css") {
                            button = document.querySelector(selector);
                        }

                        if (!button) {
                            console.log("Button not found:", selector);
                            return false;
                        }

                        console.log(clickingMessage);
                        button.click();
                        return true;
                    } catch (error) {
                        console.error("Error clicking button:", error);
                        return false;
                    }
                }
            },
            (results) => {
                if (chrome.runtime.lastError) {
                    console.error("Error executing script:", chrome.runtime.lastError.message);
                    resolve(false);
                } else {
                    resolve(results[0]?.result || false);
                }
            }
        );
    });
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




