var replace = require("replace2");
 
replace({
  //regex: "FreedoX:\s'\.\.\/\.\.\/Source\/'",
  regex: "FreedoX:\\s'\\.\\.\\/\\.\\.\\/Source\\/'",
  replacement: "FreedoX:'../API'",
  paths: ['./dist/GBIM360/Viewer/scripts/fdviewer.js'],
  recursive: false,
  silent: false,
});

replace({
  regex: "txf3\.wilddogio",
  replacement: "fd1-1-0.wilddogio",
  paths: ['./dist/GBIM360/Viewer/scripts/fdmodel.js'],
  recursive: false,
  silent: false,
});

replace({
  regex: "\\.\\.\\/\\.\\.\\/dist\\/GBIM360\\/API\\/FreedoX\\.js",
  replacement: "../API/FreedoX.js",
  paths: ['./dist/GBIM360/Examples/'],
  recursive: true,
  silent: false,
});

var fs = require('fs');
var VERSION = fs.readFileSync('./VERSION', 'utf-8');
console.log("VERSION: " + VERSION);

replace({
  regex: "\\[FDVERSION\\]",
  replacement: VERSION,
  paths: ['./dist/GBIM360/Documentation/index.html'],
  recursive: false,
  silent: false,
});

replace({
  regex: "（注：请将FDVERSION换成对应的版本号。下同。）",
  replacement: "",
  paths: ['./dist/GBIM360/Documentation/index.html'],
  recursive: false,
  silent: false,
});



