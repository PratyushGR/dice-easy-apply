document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("startButton");

    startButton.addEventListener("click", () => {
        const url = "https://www.dice.com/jobs?q=devops&location=United%20States&page=1&pageSize=1000&filters.postedDate=ONE&filters.employmentType=CONTRACTS&language=en";
        chrome.tabs.create({ url });
    });
});
