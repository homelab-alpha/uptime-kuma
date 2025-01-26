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

class Slack extends NotificationProvider {
    name = "slack";

    /**
     * Validates the configuration object for Slack notifications to ensure all required fields are present.
     * Throws an error if required fields are missing. Sets a default icon if no custom icon is provided.
     * @param {object} notification - The Slack notification configuration object.
     * @throws {Error}              - Throws an error if any required fields are missing or invalid.
     * @returns {void}              - This function does not return any value.
     */
    validateNotificationConfig(notification) {
        const requiredFields = [
            {
                field: "slackwebhookURL",
                message: "Slack webhook URL is required for notifications.",
            },
            {
                field: "slackchannel",
                message: "Slack channel is required for notifications.",
            },
            {
                field: "slackusername",
                message: "Slack username is required for notifications.",
            },
        ];

        // Log the start of the validation process
        completeLogDebug(
            "Starting validation of Slack notification configuration",
            {
                notification,
            }
        );

        // Check each required field and log errors if any are missing
        requiredFields.forEach(({ field, message }) => {
            if (!notification[field]) {
                completeLogError(
                    "Missing required field in Slack notification configuration",
                    {
                        field, // Name of the missing field
                        message, // Error message to provide context
                        notification, // Current state of the notification object
                    }
                );
                throw new Error(message); // Halt execution if a field is missing
            }
        });

        // Log success when all required fields are validated
        completeLogDebug(
            "All required fields are present in Slack notification configuration",
            {
                requiredFields: requiredFields.map((field) => field.field),
            }
        );

        // Handle Slack icon emoji: set default or confirm custom
        if (!notification.slackiconemo) {
            // No custom icon provided, setting default icon
            notification.slackiconemo = ":robot_face:";
            completeLogDebug("Default Slack icon emoji set", {
                icon: notification.slackiconemo,
            });
        } else {
            // Custom icon is provided, logging confirmation
            completeLogDebug("Custom Slack icon emoji provided", {
                icon: notification.slackiconemo,
            });
        }
    }

    /**
     * Converts a timezone string to the corresponding continent, country, and local timezone.
     * Retrieves the mapping for a given timezone string from predefined sets of continent names,
     * country names, and local timezones. If the timezone is not found, it returns "Unknown" for all values.
     * @param {string} timezone - The timezone string (e.g., "Europe/Amsterdam").
     * @returns {object}        - An object containing the corresponding continent, country, and local timezone.
     */
    getAllInformationFromTimezone(timezone) {
        const timezoneToInfo = {
            // Europe
            "Europe/Amsterdam": [
                "Europe",
                "Netherlands",
                "Central European Time",
            ],
            "Europe/Andorra": [ "Europe", "Andorra", "Central European Time" ],
            "Europe/Belgrade": [ "Europe", "Serbia", "Central European Time" ],
            "Europe/Berlin": [ "Europe", "Germany", "Central European Time" ],
            "Europe/Brussels": [ "Europe", "Belgium", "Central European Time" ],
            "Europe/Bucharest": [ "Europe", "Romania", "Eastern European Time" ],
            "Europe/Budapest": [ "Europe", "Hungary", "Central European Time" ],
            "Europe/Chisinau": [ "Europe", "Moldova", "Eastern European Time" ],
            "Europe/Copenhagen": [ "Europe", "Denmark", "Central European Time" ],
            "Europe/Dublin": [ "Europe", "Ireland", "Greenwich Mean Time" ],
            "Europe/Helsinki": [ "Europe", "Finland", "Eastern European Time" ],
            "Europe/Istanbul": [ "Europe", "Turkey", "Turkey Time" ],
            "Europe/Kiev": [ "Europe", "Ukraine", "Eastern European Time" ],
            "Europe/Lisbon": [ "Europe", "Portugal", "Western European Time" ],
            "Europe/London": [
                "Europe",
                "United Kingdom",
                "Greenwich Mean Time",
            ],
            "Europe/Luxembourg": [
                "Europe",
                "Luxembourg",
                "Central European Time",
            ],
            "Europe/Madrid": [ "Europe", "Spain", "Central European Time" ],
            "Europe/Minsk": [ "Europe", "Belarus", "Minsk Time" ],
            "Europe/Monaco": [ "Europe", "Monaco", "Central European Time" ],
            "Europe/Moscow": [ "Europe", "Russia", "Moscow Time" ],
            "Europe/Oslo": [ "Europe", "Norway", "Central European Time" ],
            "Europe/Paris": [ "Europe", "France", "Central European Time" ],
            "Europe/Prague": [
                "Europe",
                "Czech Republic",
                "Central European Time",
            ],
            "Europe/Riga": [ "Europe", "Latvia", "Eastern European Time" ],
            "Europe/Rome": [ "Europe", "Italy", "Central European Time" ],
            "Europe/Samara": [ "Europe", "Russia", "Samara Time" ],
            "Europe/Sofia": [ "Europe", "Bulgaria", "Eastern European Time" ],
            "Europe/Stockholm": [ "Europe", "Sweden", "Central European Time" ],
            "Europe/Tallinn": [ "Europe", "Estonia", "Eastern European Time" ],
            "Europe/Tirane": [ "Europe", "Albania", "Central European Time" ],
            "Europe/Vaduz": [
                "Europe",
                "Liechtenstein",
                "Central European Time",
            ],
            "Europe/Vienna": [ "Europe", "Austria", "Central European Time" ],
            "Europe/Vilnius": [ "Europe", "Lithuania", "Eastern European Time" ],
            "Europe/Zurich": [ "Europe", "Switzerland", "Central European Time" ],

            // North America
            "America/Chicago": [
                "North America",
                "United States",
                "Central Standard Time",
            ],
            "America/Denver": [
                "North America",
                "United States",
                "Mountain Standard Time",
            ],
            "America/Detroit": [
                "North America",
                "United States",
                "Eastern Standard Time",
            ],
            "America/Houston": [
                "North America",
                "United States",
                "Central Standard Time",
            ],
            "America/Indianapolis": [
                "North America",
                "United States",
                "Eastern Standard Time",
            ],
            "America/Los_Angeles": [
                "North America",
                "United States",
                "Pacific Standard Time",
            ],
            "America/Mexico_City": [
                "North America",
                "Mexico",
                "Central Standard Time",
            ],
            "America/New_York": [
                "North America",
                "United States",
                "Eastern Standard Time",
            ],
            "America/Regina": [
                "North America",
                "Canada",
                "Central Standard Time",
            ],
            "America/Toronto": [
                "North America",
                "Canada",
                "Eastern Standard Time",
            ],
            "America/Vancouver": [
                "North America",
                "Canada",
                "Pacific Standard Time",
            ],
            "America/Winnipeg": [
                "North America",
                "Canada",
                "Central Standard Time",
            ],

            // South America
            "America/Argentina/Buenos_Aires": [
                "South America",
                "Argentina",
                "Argentina Time",
            ],
            "America/Asuncion": [ "South America", "Paraguay", "Paraguay Time" ],
            "America/Bahia": [ "South America", "Brazil", "Brasilia Time" ],
            "America/Barbados": [
                "South America",
                "Barbados",
                "Atlantic Standard Time",
            ],
            "America/Belize": [
                "South America",
                "Belize",
                "Central Standard Time",
            ],
            "America/Colombia": [ "South America", "Colombia", "Colombia Time" ],
            "America/Curacao": [
                "South America",
                "Curacao",
                "Atlantic Standard Time",
            ],
            "America/Guatemala": [
                "South America",
                "Guatemala",
                "Central Standard Time",
            ],
            "America/Guayaquil": [ "South America", "Ecuador", "Ecuador Time" ],
            "America/Lima": [ "South America", "Peru", "Peru Time" ],
            "America/Panama": [
                "South America",
                "Panama",
                "Eastern Standard Time",
            ],
            "America/Port_of_Spain": [
                "South America",
                "Trinidad and Tobago",
                "Atlantic Standard Time",
            ],
            "America/Santiago": [
                "South America",
                "Chile",
                "Chile Standard Time",
            ],
            "America/Sao_Paulo": [ "South America", "Brazil", "Brasilia Time" ],

            // Asia
            "Asia/Amman": [ "Asia", "Jordan", "Jordan Time" ],
            "Asia/Baghdad": [ "Asia", "Iraq", "Arabian Standard Time" ],
            "Asia/Bahrain": [ "Asia", "Bahrain", "Arabian Standard Time" ],
            "Asia/Bangkok": [ "Asia", "Thailand", "Indochina Time" ],
            "Asia/Beirut": [ "Asia", "Lebanon", "Eastern European Time" ],
            "Asia/Dhaka": [ "Asia", "Bangladesh", "Bangladesh Standard Time" ],
            "Asia/Dubai": [ "Asia", "UAE", "Gulf Standard Time" ],
            "Asia/Hong_Kong": [ "Asia", "Hong Kong", "Hong Kong Time" ],
            "Asia/Irkutsk": [ "Asia", "Russia", "Irkutsk Time" ],
            "Asia/Jakarta": [ "Asia", "Indonesia", "Western Indonesia Time" ],
            "Asia/Kolkata": [ "Asia", "India", "Indian Standard Time" ],
            "Asia/Kuala_Lumpur": [ "Asia", "Malaysia", "Malaysia Time" ],
            "Asia/Kuwait": [ "Asia", "Kuwait", "Arabian Standard Time" ],
            "Asia/Makassar": [ "Asia", "Indonesia", "Central Indonesia Time" ],
            "Asia/Manila": [ "Asia", "Philippines", "Philippine Time" ],
            "Asia/Muscat": [ "Asia", "Oman", "Gulf Standard Time" ],
            "Asia/Novosibirsk": [ "Asia", "Russia", "Novosibirsk Time" ],
            "Asia/Seoul": [ "Asia", "South Korea", "Korea Standard Time" ],
            "Asia/Singapore": [ "Asia", "Singapore", "Singapore Time" ],
            "Asia/Taipei": [ "Asia", "Taiwan", "Taipei Standard Time" ],
            "Asia/Tashkent": [ "Asia", "Uzbekistan", "Uzbekistan Time" ],
            "Asia/Tokyo": [ "Asia", "Japan", "Japan Standard Time" ],
            "Asia/Ulaanbaatar": [ "Asia", "Mongolia", "Ulaanbaatar Time" ],
            "Asia/Yangon": [ "Asia", "Myanmar", "Myanmar Time" ],

            // Australia
            "Australia/Adelaide": [
                "Australia",
                "Australia",
                "Australian Central Standard Time",
            ],
            "Australia/Brisbane": [
                "Australia",
                "Australia",
                "Australian Eastern Standard Time",
            ],
            "Australia/Darwin": [
                "Australia",
                "Australia",
                "Australian Central Standard Time",
            ],
            "Australia/Hobart": [
                "Australia",
                "Australia",
                "Australian Eastern Daylight Time",
            ],
            "Australia/Melbourne": [
                "Australia",
                "Australia",
                "Australian Eastern Daylight Time",
            ],
            "Australia/Sydney": [
                "Australia",
                "Australia",
                "Australian Eastern Daylight Time",
            ],

            // Africa
            "Africa/Addis_Ababa": [ "Africa", "Ethiopia", "East Africa Time" ],
            "Africa/Cairo": [ "Africa", "Egypt", "Eastern European Time" ],
            "Africa/Casablanca": [ "Africa", "Morocco", "Western European Time" ],
            "Africa/Harare": [ "Africa", "Zimbabwe", "Central Africa Time" ],
            "Africa/Johannesburg": [
                "Africa",
                "South Africa",
                "South Africa Standard Time",
            ],
            "Africa/Khartoum": [ "Africa", "Sudan", "Central Africa Time" ],
            "Africa/Lagos": [ "Africa", "Nigeria", "West Africa Time" ],
            "Africa/Nairobi": [ "Africa", "Kenya", "East Africa Time" ],
            "Africa/Tripoli": [ "Africa", "Libya", "Eastern European Time" ],

            // Middle East
            "Asia/Tehran": [ "Asia", "Iran", "Iran Standard Time" ],
            "Asia/Qatar": [ "Asia", "Qatar", "Arabian Standard Time" ],
            "Asia/Jerusalem": [ "Asia", "Israel", "Israel Standard Time" ],
            "Asia/Riyadh": [ "Asia", "Saudi Arabia", "Arabian Standard Time" ],

            // Pacific
            "Pacific/Auckland": [
                "Pacific",
                "New Zealand",
                "New Zealand Standard Time",
            ],
            "Pacific/Fiji": [ "Pacific", "Fiji", "Fiji Time" ],
            "Pacific/Guam": [ "Pacific", "Guam", "Chamorro Standard Time" ],
            "Pacific/Honolulu": [
                "Pacific",
                "Hawaii",
                "Hawaii-Aleutian Standard Time",
            ],
            "Pacific/Pago_Pago": [
                "Pacific",
                "American Samoa",
                "Samoa Standard Time",
            ],
            "Pacific/Port_Moresby": [
                "Pacific",
                "Papua New Guinea",
                "Papua New Guinea Time",
            ],
            "Pacific/Suva": [ "Pacific", "Fiji", "Fiji Time" ],
            "Pacific/Tarawa": [ "Pacific", "Kiribati", "Gilbert Island Time" ],
            "Pacific/Wellington": [
                "Pacific",
                "New Zealand",
                "New Zealand Standard Time",
            ],

            // Other regions
            "Antarctica/Palmer": [ "Other", "Antarctica", "Chile Summer Time" ],
            "Antarctica/Vostok": [ "Other", "Antarctica", "Vostok Time" ],
            "Indian/Chagos": [
                "Other",
                "British Indian Ocean Territory",
                "Indian Ocean Territory Time",
            ],
            "Indian/Mauritius": [ "Other", "Mauritius", "Mauritius Time" ],
            "Indian/Reunion": [ "Other", "Réunion", "Réunion Time" ],
            "Indian/Christmas": [
                "Other",
                "Australia",
                "Australia Western Standard Time",
            ],
            "Indian/Kerguelen": [
                "Other",
                "France",
                "French Southern and Antarctic Time",
            ],
            "Indian/Maldives": [ "Other", "Maldives", "Maldives Time" ],
            "Indian/Seychelles": [ "Other", "Seychelles", "Seychelles Time" ],
        };

        // Retrieve the corresponding information for the given timezone, default to null if not found
        const [ continent = null, country = null, localTimezone = null ] =
            timezoneToInfo[timezone] ?? [];

        // Log the result with detailed information
        if (logLevelsEnabled.debug) {
            const logMessage = `Timezone: ${timezone}, Continent: ${continent}, Country: ${country}, Local Timezone: ${localTimezone}`;
            completeLogDebug(logMessage);
        }

        // Log warning if the timezone is not found
        if (continent === "Unknown" && logLevelsEnabled.warn) {
            completeLogWarn(`Timezone not found in mappings: ${timezone}`);
        }

        return { continent,
            country,
            localTimezone
        };
    }

    /**
     * Formats a UTC time string into a readable local day string.
     * Converts the UTC time to the specified timezone and formats it as the full weekday name.
     * @param {string} utcTime  - The UTC time to be formatted (ISO 8601 string format).
     * @param {string} timezone - The timezone to which the UTC time should be converted (e.g., "Europe/Amsterdam").
     * @returns {string}        - The formatted local day string (e.g., "Monday").
     */
    formatDay(utcTime, timezone) {
        if (!utcTime || !timezone) {
            if (logLevelsEnabled.error) {
                completeLogDebug(
                    "Invalid input: Both utcTime and timezone are required."
                );
            }
            return null;
        }

        return dayjs(utcTime).tz(timezone).format("dddd");
    }
}

module.exports = Slack;
