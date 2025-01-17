chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message from popup:", message);

    const { data } = message;

    console.log("Data received:", data);

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
});

// Function to process inputs in the content script
function processInputs(data) {
    console.log("Processing in content.js");
    console.log("Data:", data);

    data.forEach(({ title, keywords }) => {
        console.log(`Title: ${title}, Keywords: ${keywords}`);
    });
}
