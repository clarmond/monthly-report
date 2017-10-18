// Intialization
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const databaseLocation = "/Users/carmond/Library/Group Containers/5U8NS4GX82.dayoneapp2/Data/Documents/DayOne.sqlite";
const outputFile = "/Users/carmond/monthly-report-test.html";
const workTag = 11;

// Define day and month names
// TODO:Change to use date-and-time module: https://www.npmjs.com/package/date-and-time
const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Get current month or year (or offset from command line)
let d = new Date();
let currentMonth = d.getMonth() + 1;
let currentYear = d.getFullYear();
let currentMonthName = monthName[currentMonth - 1];
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
console.log("Month: ", currentMonth);
console.log("Year: ", currentYear);

// Connect to database
let db = new sqlite3.Database(databaseLocation, (err) => {
	if (err) {
		console.error(err.message);
	}
	//console.log('Connected to database');
});

let db2 = new sqlite3.Database(databaseLocation, (err) => {
	if (err) {
		console.error(err.message);
	}
	//console.log('Connected to database');
});

// Get entries for current month
let entries = {};
let entryKeys = [];
let uniqueTags = {};

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
		z_6tags te,
		ztag tn
	where
		zgregorianyear = ?
	and
		zgregorianmonth = ?
	and
		e.z_pk in (
			select
				z_6entries AS z_pk
			from
				z_6tags
			where
				z_30tags1 = ?
		)
	and
		e.z_pk = te.z_6entries
	and
		te.z_30tags1 = tn.z_pk
	order by
		zcreationdate, tag
`;
db.each(sql, [currentYear, currentMonth, workTag], (err, row) => {
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
	entries[pk].text = row.text;
	entries[pk].text = entries[pk].text.replace(/\`</g, "`&lt;");
	entries[pk].text = entries[pk].text.replace(/>\`/g, "&gt;`");
	entries[pk].text = entries[pk].text.replace("<code type=", "<code class=");
	entries[pk].text = entries[pk].text.replace(/\`([^\`]+)?\`/g, "<code class='solo'>$1</code>");
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
		console.log("Total rows retrieved", rowsRetrieved);
		//console.log(entries);
		printHTMLHeader();
		printEntries();
	}
);

/**
 * Print HTML header
*/
function printHTMLHeader() {
	console.log("printHTMLHeader() - Start");
	let fileContent = fs.readFileSync('header-template.html');
	let htmlHeader = eval(fileContent.toString());
	fs.writeFile(outputFile, htmlHeader);
	console.log("printHTMLHeader() - Exit");
	return true;
}

/**
 * Print entries
*/
function printEntries() {
	console.log("printEntries() - Start");
	console.log("Number of entries: ", entryKeys.length);
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
	console.log("printEntries() - Exit");
}
