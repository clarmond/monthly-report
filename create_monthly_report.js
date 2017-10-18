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

// Hardcoding these for now.
// TODO:Get from current date or CLI arguments
const currentMonth = 9
const currentYear = 2017
let currentMonthName = monthName[currentMonth - 1];

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
				Z_6TAGS
			where
				z_30tags1 = ?
		)
	order by
		zcreationdate, tag
`;
console.log(sql);
db.each(sql, [currentYear, currentMonth, workTag], (err, row) => {
	if (err) {
		console.error(err.message);
		process.exit();
	}
	let pk = row.pk;
	entries.pk.text = row.text.replace("<code type=", "<code class=");
	entries.pk.text = entries.pk.text.replace(/\`([^\`]+)?\`/g, "<code class='solo'>$1</code>");
	let dayOfMonth = row.day_of_month.toString();
	entries.pk.timeStamp = dayName[row.day_of_week] + ", " + currentMonthName + " " + dayOfMonth.replace(/^0/, "") + " " + row.local_time;
	entries.pk.tags[tag] = tag;
	}, (err, rowsRetrieved) => {
		if (err) {
			console.error(err.message);
			process.exit();
		}
		console.log("Entries retrieved", rowsRetrieved);
	}
);

//db.close((err) => {
//	console.log("db closed");
//	printHTMLHeader();
//	printEntries();
//});

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
	console.log("Number of entries: ", entries.length);
	let count = 0;
	let tagClass = {};
	for (tag in uniqueTags) {
		count++;
		tagClass[tag] = `tag${count}`;
	}
	for (let i = 0; i < entries.length; i++) {
		let entry = entries[i];
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
