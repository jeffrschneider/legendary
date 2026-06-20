/**
 * Email notifier for new contact-form submissions.
 *
 * The Cloud Function appends rows to this Sheet via the Sheets API. Apps Script
 * onEdit/onChange triggers do NOT fire for API writes, so we poll on an hourly
 * time-driven trigger and email any rows we haven't notified on yet. Email is
 * sent natively via MailApp — no SendGrid, no SMTP, no API keys.
 *
 * Setup: paste this into Extensions > Apps Script on the Sheet, then run
 * installTrigger() once and authorize it.
 */

var SHEET_NAME = 'Submissions';
var NOTIFY_TO = 'jeffrschneider@gmail.com';
var LAST_ROW_KEY = 'lastNotifiedRow';

function checkForNewSubmissions() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return;

    var lastRow = sheet.getLastRow();
    var props = PropertiesService.getScriptProperties();
    var lastNotified = Number(props.getProperty(LAST_ROW_KEY) || 1); // row 1 = header

    if (lastRow <= lastNotified) return; // nothing new

    var numRows = lastRow - lastNotified;
    // Columns A-C: Timestamp, Email, Message
    var rows = sheet.getRange(lastNotified + 1, 1, numRows, 3).getValues();

    rows.forEach(function (row) {
        var timestamp = row[0];
        var email = row[1];
        var message = row[2];
        if (!email && !message) return;

        MailApp.sendEmail({
            to: NOTIFY_TO,
            replyTo: email,
            subject: 'New legendary.ai inquiry — ' + email,
            body: 'New contact form submission:\n\n' +
                  'Time: ' + timestamp + '\n' +
                  'Email: ' + email + '\n\n' +
                  'Message:\n' + message + '\n',
        });
    });

    props.setProperty(LAST_ROW_KEY, String(lastRow));
}

/**
 * Run once to install the hourly time-driven trigger.
 */
function installTrigger() {
    ScriptApp.getProjectTriggers().forEach(function (t) {
        if (t.getHandlerFunction() === 'checkForNewSubmissions') {
            ScriptApp.deleteTrigger(t);
        }
    });
    ScriptApp.newTrigger('checkForNewSubmissions')
        .timeBased()
        .everyHours(1)
        .create();
}
