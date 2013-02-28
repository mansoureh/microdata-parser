var parse = require('schema-parser').parse;

var testurl = '';
var expectedResult = {};
expectedResult.errors = [];
expectedResult.schema = [];

parse(testurl, function cb (err, results){
    console.log(results);
    //compare results with expected results and report
    
    });