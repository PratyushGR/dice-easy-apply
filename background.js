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
                }).catch((error) => {
                    console.error("Error executing script:", error);
                });
            } else {
                console.error("No active tab found. Cannot execute script.");
            }
        });
    }
});

// Function to process inputs in the active tab
function processInputs(data) {
    console.log("Processing in active tab:");

    const canDoApplication = data.currentUrl.startsWith("https://www.dice.com/jobs") ? "Yes" : "No";
    console.log(`Current URL: ${data.currentUrl}`);
    console.log(`Can Do Application: ${canDoApplication}`);

    console.log("Positions:");
    data.positions.forEach((position, index) => {
        console.log(`  ${index + 1}. Title: ${position.title}`);
        console.log(`     Keywords: ${position.keywords.join(", ")}`);
        console.log(`     File Path: ${position.filePath}`);
    });

    console.log("Keywords to Avoid:", data.avoidKeywords.join(", "));
    console.log("Search Keywords:", data.searchKeywords.join(", "));
    console.log("Locations:", data.locations.join(", "));
}
