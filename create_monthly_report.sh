#!/bin/bash
cd /Users/carmond/journal
output=$(node create_monthly_report.js $1)
open "$output" 
