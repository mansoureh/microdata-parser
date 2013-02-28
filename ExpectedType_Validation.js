var schematype = require('schema.org-type-ancestry').schema;


function ExpectedType_Validation(expectedType, itemtype, itemprop, itemid, callback) {
    var isValidExpectedType = 0;
    if (Array.isArray(expectedType)) {
        for (var item in expectedType) {

            if ('http://schema.org/' + expectedType[item] == itemtype || schematype[itemtype].superClassSet['http://schema.org/' + expectedType[item]]) {
                isValidExpectedType = 1;

            }
        }
    }
    else {
        if ('http://schema.org/' + expectedType == itemtype || schematype[itemtype].superClassSet['http://schema.org/' + expectedType]) isValidExpectedType = 1;
    }





    console.log(expectedType, itemtype, isValidExpectedType);
    callback(isValidExpectedType, itemtype, itemprop, itemid);

}

module.exports = ExpectedType_Validation;