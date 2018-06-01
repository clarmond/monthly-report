// Intialization
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const zpad = require('zpad');

// Read config file
var config = require("./config.json");

// Define day and month names
// TODO:Change to use date-and-time module: https://www.npmjs.com/package/date-and-time
const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Get current month or year (or offset from command line)
let d = new Date();
let currentMonth = d.getMonth() + 1;
let currentYear = d.getFullYear();
if (!(process.argv[2] === undefined)) {
	let offset = process.argv[2];
	if (isNaN(offset)) {
		console.error("Invalid offset.  Must be an integer between 1-12.");
		process.exit();
	}
	offset = Math.abs(offset);
	if (offset > 12) {
		console.error("Invalid offset.  Must be less than 13 months");
		process.exit();
	}
	currentMonth = currentMonth - offset;
	if (currentMonth < 1) {
		currentMonth = currentMonth + 12;
		currentYear--;
	}
}
let currentMonthName = monthName[currentMonth - 1];

// Define output file
let outputFile = config.outputDir + "/" + currentYear.toString() + zpad(currentMonth, 2).toString() + ".html";

// Connect to database
let db = new sqlite3.Database(config.databaseLocation, (err) => {
	if (err) {
		console.error(err.message);
	}
});

// entries is an object of all entries to display
let entries = {};

// entryKeys is an array of unique keys for the entries object
let entryKeys = [];

// uniqueTags is an object of all unique tags found in the entries
let uniqueTags = {};

// Build SQL to query database for the entries for the given month
// Note: I'm not sure why but I have to add 31 years for the time to come out right
let sql = `
	select
		e.z_pk as pk,
		e.ztext as text,
		strftime('%w', date(datetime(e.zcreationdate, 'unixepoch', 'localtime'), '+31 year')) as day_of_week,
		strftime('%d', date(datetime(e.zcreationdate, 'unixepoch', 'localtime'), '+31 year')) as day_of_month,
		strftime('%H:%M', datetime(e.zcreationdate, 'unixepoch', 'localtime')) as local_time,
		tn.zname AS tag
	from
		zentry e,
		z_7tags te,
		ztag tn
	where
		zgregorianyear = ?
	and
		zgregorianmonth = ?
	and
		e.zjournal = ?
	and
		e.z_pk = te.z_7entries
	and
		te.z_30tags1 = tn.z_pk
	order by
		zcreationdate, tag
`;
db.each(sql, [currentYear, currentMonth, config.workJournal], (err, row) => {
	if (err) {
		console.error(err.message);
		process.exit();
	}
	let pk = row.pk;
	if (entryKeys.indexOf(pk) === -1) {
		entryKeys.push(pk);
	}
	if (entries[pk] == undefined) {
		entries[pk] = {};
	}
	// Create entries, formatting the text along the way.
	entries[pk].text = row.text;
	// Format markdown
	entries[pk].text = entries[pk].text.replace(/^# (.+)/mg, "<h3>$1</h3>");
	entries[pk].text = entries[pk].text.replace(/^## (.+)/mg, "<h4>$1</h4>");
	entries[pk].text = entries[pk].text.replace(/^### (.+)/mg, "<h5>$1</h5>");
	entries[pk].text = entries[pk].text.replace(/\`</g, "&lt;");
	entries[pk].text = entries[pk].text.replace(/>\`/g, "&gt;`");
	entries[pk].text = entries[pk].text.replace(/\`([^`\n]+)\`/g, "<code class='solo'>$1</code>");
	entries[pk].text = entries[pk].text.replace(/\```([^`]+)\```/g, "<code class='solo'>$1</code>");
	entries[pk].text = entries[pk].text.replace(/<code class='solo'>\n/, "<code class='solo'>");
	entries[pk].text = entries[pk].text.replace(/\*\*(.+)\*\*/g, "<strong>$1</strong>");
	entries[pk].text = entries[pk].text.replace(/^\- /mg, "&bullet; ");
	entries[pk].text = entries[pk].text.replace(/^(\s+)\- /mg, "$1&bullet; ");
	let dayOfMonth = row.day_of_month.toString();
	entries[pk].timeStamp = dayName[row.day_of_week] + ", " + currentMonthName + " " + dayOfMonth.replace(/^0/, "") + " " + row.local_time;
	if (entries[pk].tags === undefined) {
		entries[pk].tags = [];
	}
	if (entries[pk].tags.indexOf(row.tag) === -1) {
		if (!(row.tag === "Work")) {
			entries[pk].tags.push(row.tag);
		}
	}
	uniqueTags[row.tag] = row.tag;
	}, (err, rowsRetrieved) => {
		if (err) {
			console.error(err.message);
			process.exit();
		}
		printHTMLHeader();
		printEntries();
		console.log(outputFile)
	}
);

/**
 * Print HTML header
*/
function printHTMLHeader() {
	let fileContent = fs.readFileSync('header-template.html');
	let htmlHeader = eval(fileContent.toString());
	fs.writeFile(outputFile, htmlHeader, (err) => {
		if (err) {
			console.error(err.message);
		}
	});
	return true;
}

/**
 * Print entries
*/
function printEntries() {
	let count = 0;
	let tagClass = {};
	for (tag in uniqueTags) {
		count++;
		tagClass[tag] = `tag${count}`;
	}
	for (let i = 0; i < entryKeys.length; i++) {
		let entry = entries[entryKeys[i]];
		let sectionText = "<div class='entry'>\n";
		for (let j = 0; j < entry.tags.length; j++) {
			let currentTag = entry.tags[j];
			let cssClass = tagClass[currentTag];
			sectionText += `<span class='tag ${cssClass}'>${currentTag}</span>`;
		}
		sectionText += `<h2>${entry.timeStamp}</h2>\n`;
		sectionText += `<pre>${entry.text}</pre>\n`;
		sectionText += "</div>\n";
		fs.appendFile(outputFile, sectionText, (err) => {
			if (err) {
				console.error("ERROR", err);
				process.exit(1);
			}
		});
	}
}
