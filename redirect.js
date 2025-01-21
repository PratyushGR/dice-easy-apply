document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("startButton");
    const applyButton = document.getElementById("applyButton");

    // URL to redirect to
    const targetURL = "https://www.dice.com/jobs?q=devops&location=United%20States&page=1&pageSize=1000&filters.postedDate=ONE&filters.employmentType=CONTRACTS&filters.easyApply=true&language=en";

    // Add click event listener to the "Start" button
    startButton.addEventListener("click", () => {
        chrome.tabs.create({ url: targetURL });
    });

    // Add click event listener to the "Apply" button
    applyButton.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                chrome.storage.local.get(
                    ["savedData", "avoidData", "searchData", "locationData"],
                    (data) => {
                        // Prepare data for the background script
                        chrome.runtime.sendMessage({
                            action: "PRINT_DATA",
                            data: {
                                currentUrl: activeTab.url,
                                positions: data.savedData || [],
                                avoidKeywords: data.avoidData || [],
                                searchKeywords: data.searchData || [],
                                locations: data.locationData || []
                            }
                        });
                    }
                );
            } else {
                console.error("No active tab found.");
            }
        });
    });
});
