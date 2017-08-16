var replace = require("replace2");
 
replace({
  //regex: "FreedoX:\s'\.\.\/\.\.\/Source\/'",
  regex: "googleapis",
  replacement: "useso",
  paths: ['./Documentation'],
  recursive: true,
  silent: false,
});
