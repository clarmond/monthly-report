// Define days of the week
const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Hardcoding these for now
const currentMonth = 9
const currentYear = 2017

let currentMonthName = monthName[currentMonth - 1];

// Database intialization
const sqlite3 = require('sqlite3').verbose();
const databaseLocation = "/Users/carmond/Library/Group Containers/5U8NS4GX82.dayoneapp2/Data/Documents/DayOne.sqlite";

// Filesystem intialization
const fs = require('fs');
let outputFile = "/Users/carmond/monthly-report-test.html";

// Connect to database
let db = new sqlite3.Database(databaseLocation, (err) => {
	if (err) {
		console.error(err.message);
	}
	console.log('Connected to database');
});

// Print html
const htmlHeader = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Chad Armond - Monthly Report for ${currentMonthName}, ${currentYear}</title>
<style type="text/css">
body {
	color: #333;
	font-family: Arial;
	font-size: 10pt;
}
a {
	color: #333;
}
h1 {
	text-align: center;
}
h2 {
	border-bottom: 1px solid #bbb;
	margin: 10px 2px;
}
pre {
	white-space: pre-wrap;
}
.solo {
	background-color: #f9f2f4;
	border-radius: 3px;
	color: #c7254e;
	font-family: monospace;
	padding: 1px 4px;
}
.entry {
	background-color: #fafafa;
	border: 1px dashed #aaa;
	padding: 10px;
	border-radius: 10px;
	margin-bottom: 10px;
}
.tag {
	background-color: #ee0;
	font-size: 9pt;
	padding: 2px 6px;
	border-radius: 4px;
}
.tag1 { background-color: #D0F5A9 }
.tag2 { background-color: #F3E2A9 }
.tag3 { background-color: #F5A9A9 }
.tag4 { background-color: #A9F5D0 }
.tag5 { background-color: #A9D0F5 }
.tag6 { background-color: #BCA9F5 }
.tag7 { background-color: #F5BCA9 }
.tag8 { background-color: #F5A9D0 }
.tag9 { background-color: #A9E2F3 }
.tag10 { background-color: #81DAF5 }
.tag11 { background-color: #D0F5A9 }
.tag12 { background-color: #F3E2A9 }
.tag13 { background-color: #F5A9A9 }
.tag14 { background-color: #A9F5D0 }
.tag15 { background-color: #A9D0F5 }
.tag16 { background-color: #BCA9F5 }
.tag17 { background-color: #F5BCA9 }
.tag18 { background-color: #F5A9D0 }
.tag19 { background-color: #A9E2F3 }
.tag20 { background-color: #81DAF5 }
</style>
<link href='https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/atom-one-dark.min.css' rel='stylesheet'/>
<script src='https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/highlight.min.js'/>
<script>hljs.initHighlightingOnLoad();</script>
<link type="text/css" rel="stylesheet" href="http://io.jsc.nasa.gov/syntaxhighlighter/styles/shCore.css" />
<link href="http://io.jsc.nasa.gov/syntaxhighlighter/styles/shThemeDefault.css" rel="stylesheet" type="text/css" />
<script type="text/javascript" src="http://io.jsc.nasa.gov/syntaxhighlighter/scripts/shCore.js"></script>
<script type="text/javascript" src="http://io.jsc.nasa.gov/syntaxhighlighter/scripts/shBrushJScript.js"></script>
<script type="text/javascript" src="http://io.jsc.nasa.gov/syntaxhighlighter/scripts/shBrushXml.js"></script>
<script type="text/javascript" src="http://io.jsc.nasa.gov/syntaxhighlighter/scripts/shBrushPlain.js"></script>
<script type="text/javascript" src="http://io.jsc.nasa.gov/syntaxhighlighter/scripts/shBrushSql.js"></script>
<script type="text/javascript">SyntaxHighlighter.all();</script>
</head>
<body>
<h1>Chad Armond - Monthly Report for ${currentMonthName}, ${currentYear}</h1>
`;
fs.writeFile(outputFile, htmlHeader);

// Get entries for current month
db.serialize(() => {
	let sql = `
		select
			z_pk as pk,
			ztext as text,
			strftime('%w', date(datetime(zcreationdate, 'unixepoch', 'localtime'), '+31 year')) as day_of_week,
			strftime('%d', date(datetime(zcreationdate, 'unixepoch', 'localtime'), '+31 year')) as day_of_month,
			strftime('%H:%M', datetime(zcreationdate, 'unixepoch', 'localtime')) as local_time
		from
			zentry
		where
			zgregorianyear = ${currentYear}
		and
			zgregorianmonth = ${currentMonth}
		and
			z_pk in (
				select
					z_6entries AS z_pk
				from
					Z_6TAGS
				where
					z_30tags1 = 11
			)
		order by
			zcreationdate
	`;
	db.each(sql, (err, row) => {
		if (err) {
			console.error(err.message);
		}
		let sectionText = "<div class='entry'>\n";
		let entryText = row.text.replace("<code type=", "<code class=");
		entryText = entryText.replace(/\`([^\`]+)?\`/g, "<code class='solo'>$1</code>");
		let dayOfMonth = row.day_of_month.toString();
		let timeStamp = dayName[row.day_of_week] + ", " + currentMonthName + " " + dayOfMonth.replace(/^0/, "") + " " + row.local_time
		sectionText += `<h2>${timeStamp}</h2>\n`;
		sectionText += `<pre>${entryText}</pre>\n`;
		sectionText += "</div>\n";
		console.log(sectionText)
		fs.appendFile(outputFile, sectionText, (err) => {
			if (err) {
				console.error(err);
				process.exit(1);
			}
		});
	});
});

db.close((err) => {
	if (err) {
		console.error(err.message);
	}
	console.log('Close the database connection.');
});
