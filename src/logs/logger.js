//create a logger to log messages and rewarding results into a file
const fs = require("fs");
const path = require("path");

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, "..", "output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const logFilePath = path.join(outputDir, "rewarding.log");
// log info such as message, rewarded files and errors
const logInfo = (rewardingResults) => {
  const timestamp = new Date().toISOString();

  // Find the longest message to determine column width
  const longestMessage = rewardingResults.reduce((max, result) => {
    const message = result.message || "Successfully rewarded";
    return Math.max(max, message.length);
  }, 0);

  // Calculate column widths with proper padding
  const fileIdWidth = 10;
  const messageWidth = Math.max(longestMessage + 4, 50); // Ensure minimum width of 50 for messages
  const statusWidth = 10;
  const txHashWidth = 66; // Standard Ethereum transaction hash length

  // Create table header with proper alignment
  const tableHeader = `
=== Rewarding Results (${timestamp}) ===
┌${"─".repeat(fileIdWidth)}┬${"─".repeat(messageWidth)}┬${"─".repeat(
    statusWidth
  )}┬${"─".repeat(txHashWidth)}┐
│ File ID  │ Message${" ".repeat(
    messageWidth - 8
)}│ Status   │ Transaction Hash${" ".repeat(txHashWidth - 16)}│
├${"─".repeat(fileIdWidth)}┼${"─".repeat(messageWidth)}┼${"─".repeat(
  statusWidth
  )}┼${"─".repeat(txHashWidth)}┤`;

  // Create table rows
  const tableRows = rewardingResults
    .map((result) => {
      const message = result.message || "-";
      const txHash = result.txHash || "-";
      // Ensure message fits within the column width
      const paddedMessage = message.padEnd(messageWidth - 2);
      return `│ ${result.fileId
        .toString()
        .padEnd(fileIdWidth - 2)} │ ${paddedMessage} │ ${result.status.padEnd(
        statusWidth - 2
      )} │ ${txHash.padEnd(txHashWidth - 2)} │`;
    })
    .join("\n");

  // Create table footer
  const tableFooter = `
└${"─".repeat(fileIdWidth)}┴${"─".repeat(messageWidth)}┴${"─".repeat(
    statusWidth
  )}┴${"─".repeat(txHashWidth)}┘
  `;

  const logEntry = `${tableHeader}\n${tableRows}${tableFooter}\n\n`;

  // Append to the log file
  fs.appendFileSync(logFilePath, logEntry);

  // Also log to console for immediate feedback
  console.log(logEntry);
};

module.exports = { logInfo };
