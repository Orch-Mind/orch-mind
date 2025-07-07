// Test file for webSearch functionality
// This file can be used to test the webSearch method in the browser console

console.log("🔍 Testing webSearch functionality...");

// Test if webSearch is available
if (window.electronAPI && window.electronAPI.webSearch) {
  console.log("✅ webSearch method is available");

  // Test search
  window.electronAPI
    .webSearch(["test query"], { maxResults: 3 })
    .then((results) => {
      console.log("✅ webSearch test successful:", results);
    })
    .catch((error) => {
      console.error("❌ webSearch test failed:", error);
    });
} else {
  console.error("❌ webSearch method is not available");
  console.log("Available methods:", Object.keys(window.electronAPI || {}));
}
