// Required Dependencies
const NotificationProvider = require("./notification-provider");
const axios = require("axios");
const { setSettings, setting } = require("../util-server");
const { getMonitorRelativeURL } = require("../../src/util");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

// Extend dayjs with UTC and timezone plugins for proper time formatting
// This ensures that dayjs can handle time zone conversions and UTC time correctly.
dayjs.extend(utc);
dayjs.extend(timezone);

// Global configuration object for controlling log levels and compact logs
// Each key represents a different log level, and the value determines whether
// logs for that level are enabled or disabled.
const logLevelsEnabled = {
    debug: false, // Set to true to enable debug logs. Default is false.
    info: true, // Set to false to disable info logs. Default is true.
    warn: true, // Set to false to disable warning logs. Default is true.
    error: true, // Set to false to disable error logs. Default is true.
    compactLogs: true, // Set to true to enable compact logs by default
};

/**
 * Gets the corresponding color code for the specified log level.
 * @param {string} logLevel - The log level (e.g., 'DEBUG', 'INFO', 'WARN', 'ERROR').
 * @returns {string}        - The color code for the given log level, or white if unknown.
 *
 * Colors are used for styling the logs based on their severity:
 * - DEBUG: Purple
 * - INFO:  Cyan
 * - WARN:  Yellow
 * - ERROR: Red
 */
function getLogLevelColor(logLevel) {
    const colors = {
        DEBUG: "\x1b[35m",
        INFO: "\x1b[36m",
        WARN: "\x1b[33m",
        ERROR: "\x1b[31m",
    };
    // Return the color for the given log level or default to white if unknown
    return colors[logLevel.toUpperCase()] || "\x1b[37m"; // Default to white
}

/**
 * Logs a debug level message if 'debug' log level is enabled in the configuration.
 * @param {string} message     - The message to be logged.
 * @param {any} additionalInfo - Optional additional information to be logged alongside the message.
 * @returns {void}             - This function does not return any value.
 */
function completeLogDebug(message, additionalInfo = null) {
    // Check if debug logging is enabled
    if (logLevelsEnabled.debug) {
        logMessage("DEBUG", message, additionalInfo);
    }
}

/**
 * Logs an info level message if 'info' log level is enabled in the configuration.
 * @param {string} message     - The message to be logged.
 * @param {any} additionalInfo - Optional additional information to be logged alongside the message.
 * @returns {void}             - This function does not return any value.
 */
function completeLogInfo(message, additionalInfo = null) {
    // Check if info logging is enabled
    if (logLevelsEnabled.info) {
        logMessage("INFO", message, additionalInfo);
    }
}

/**
 * Logs a warn level message if 'warn' log level is enabled in the configuration.
 * @param {string} message     - The message to be logged.
 * @param {any} additionalInfo - Optional additional information to be logged alongside the message.
 * @returns {void}             - This function does not return any value.
 */
function completeLogWarn(message, additionalInfo = null) {
    // Check if warn logging is enabled
    if (logLevelsEnabled.warn) {
        logMessage("WARN", message, additionalInfo);
    }
}

/**
 * Logs an error level message if 'error' log level is enabled in the configuration.
 * @param {string} message     - The message to be logged.
 * @param {any} additionalInfo - Optional additional information to be logged alongside the message.
 * @returns {void}             - This function does not return any value.
 */
function completeLogError(message, additionalInfo = null) {
    // Check if error logging is enabled
    if (logLevelsEnabled.error) {
        logMessage("ERROR", message, additionalInfo);
    }
}

/**
 * Generates and logs a complete log message with timestamp, script name, log level, and optional additional information.
 *
 * The log message includes color formatting for different sections (timestamp, script name, log level) and can include
 * additional information in either compact or indented format, depending on the configuration.
 * @param {string} logLevel    - The log level (e.g., 'DEBUG', 'INFO', 'WARN', 'ERROR').
 * @param {string} message     - The main log message.
 * @param {any} additionalInfo - Optional additional information (e.g., stack trace or context) to include in the log.
 * @returns {void}             - This function does not return any value.
 */
function logMessage(logLevel, message, additionalInfo = null) {
    // Automatically detect the system's time zone using the Intl API
    // This ensures the timestamp is accurate for the system's local time zone.
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Get the current time in a readable format, adjusted for the detected time zone.
    // The format used is ISO 8601, which includes the date, time, and timezone offset.
    const timestamp = dayjs().tz(timezone).format("YYYY-MM-DDTHH:mm:ssZ");

    // Hardcoded script name for the log. This could be dynamically set if needed.
    const scriptName = "SLACK";

    // Define color codes for different parts of the log message to improve readability in the terminal.
    const colors = {
        timestamp: "\x1b[36m", // Cyan for timestamp
        scriptName: "\x1b[38;5;13m", // Bright Purple for script name
        reset: "\x1b[0m", // Reset color to default after each section
        white: "\x1b[37m", // White for log level and other static text
    };

    // Construct the log message with the timestamp, script name, and log level.
    // Each section of the message is colorized based on the defined color codes.
    let logMessage = `${colors.timestamp}${timestamp}${colors.reset} `;
    logMessage += `${colors.white}[${colors.scriptName}${scriptName}${colors.white}]${colors.reset} `;
    logMessage += `${getLogLevelColor(logLevel)}${logLevel}:${
    colors.reset
  } ${message}`;

    // If additional information is provided, include it in the log message.
    if (additionalInfo) {
    // Depending on the 'compactLogs' setting, format the additional info:
    // - If compactLogs is enabled, the additional info will be in a single-line, non-indented format.
    // - If compactLogs is disabled, the additional info will be pretty-printed with indentation for better readability.
        const additionalInfoString = logLevelsEnabled.compactLogs
            ? JSON.stringify(additionalInfo) // Compact format (no indentation)
            : JSON.stringify(additionalInfo, null, 2); // Indented format (pretty print)

        // Append the additional information to the log message.
        logMessage += ` | Additional Info: ${additionalInfoString}`;
    }

    // Output the constructed log message to the console.
    // This message includes the log level, timestamp, script name, main message, and any additional info.
    console.log(logMessage);
}
