var fs = require("fs");
var attorney = require('schema-org/schemas/attorney.json');
var request = require('request');
var mongo = require('mongodb');
//var cheerio = require('cheerio');
var jsdom = require("jsdom");


getHtmlFromDB();
var retrievedResults = [];

function getHtmlFromDB() {

    var db = new mongo.Db('googleResult', new mongo.Server('linus.mongohq.com', 10002, {
        auto_reconnect: true
    }), {
        safe: false
    });
    db.open(function(err, db) {
        db.authenticate("mansoureh", "S2808706", function() {
            var collection = new mongo.Collection(db, 'results');
            collection.find(function(err, cursor) {
                cursor.each(function(err, item) {
                    if (item !== null) {

                        var row = {
                            //experiment: item['experiment'],
                            //searchItem: item['searchItem'],
                            //url: item['url'],
                            html: item['html']
                        };
                        retrievedResults.push(row);
                    }
                    else {
                        db.close();
                        parseSchemasOrg(0);
                    }
                });
            });
        });
    });
}


var html = "";
//function parseSchemasOrg(rowsIndicator) {
//
//    if (rowsIndicator < retrievedResults.length) {
//
//        html = retrievedResults[rowsIndicator].html;
//        fs.writeFile("html.html", html, function(err) {
//                 jsdom.env("html.html", ["http://code.jquery.com/jquery.js"],
//
//                    function(errors, window) {
//
//                        var $ = window.$;
//                        //console.log($);
//                        $("html").children().each(function()  {
//                        
//                        console.log($(this).attr('id'));
//                       // if ($(this).attr('id')
//                         });
//   
//                    });
//
//
//                });
//            }
//        
//    }
var fileNameCounter = 0;
var blackNodeCounter = 0;
var sub_blackNodeCounter = 0;
var schemaArray = [];
var error_warningArray = [];
var parentArray = [];
var arrayItems = {};
var subject = "";
var predicate = "";
var object = "";
var schemaBase = "<http://schema.org/";
var isValidType = 0;
//var isValidProp = 0;

var end_itemtype_Cb = 0
var end_itemprop_Cb = 0


function parseSchemasOrg(rowsIndicator) {

    if (rowsIndicator < retrievedResults.length) {
        fileNameCounter++;
        blackNodeCounter = 0;
        schemaArray = [];
        parentArray = [];
        arrayItems = {};
        sub_blackNodeCounter = 0;


        subject = "";
        predicate = "";
        object = "";
        // request("http://www.atmayoga.com.au", function(err, resp, body) {
        //   if ((err === null) && resp.statusCode === 200) {

        //  html = body;
        //  fs.writeFile("html.html", body, function(err) {

        jsdom.env("html.html", ["http://code.jquery.com/jquery.js"],

        function(errors, window) {

            var $ = window.$;
            var flag = 0;
            var len = $($.find("[itemtype]")).length;

            $($.find("[itemtype]")).each(function(index, element) {
                flag = 0;
                var itemtype = $(this).attr("itemtype");

                ///check validity of itemtype:
                itemtypeCheck(itemtype);
                //checkRules("itemtype", itemtype)
                ///               
                if (isValidType) {

                    var parents = $(this).parents('*');
                    for (var i = 0; i < parents.length; i++) {
                        if ($(parents[i]).attr("itemtype")) {
                            flag = 1;
                            if (!$(this).attr("itemprop")) {
                                /* It means that there is a node with itemtype attr inside another parent 
                           node with itemtype which does not have ant itemprop attr and it is a conflict...
                           We have two way to solve that:
                           1 - Consider the node as a independent parent continue the code based on this consideration.
                           2 - Take it as a faulty node and do not do any further process just
                           
                           ------ Anyway I should add a tripple as an error:
                         
                           arrayItems = {
                               node:'' ,
                               subject: "<b/s???>",
                               predicate: "<http://purl.org/dc/terms/errors>",
                               object: "error ....."
                           };
                           schemaArray.push(arrayItems); 
                           */
                            }

                        }
                    }


                    if (!flag) { ////It is a root
                        subject = "<b" + blackNodeCounter + ">";
                        blackNodeCounter++;
                        predicate = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>";
                        object = itemtype;
                        arrayItems = {
                            node: '',
                            subject: subject,
                            predicate: predicate,
                            object: object,
                        };
                        schemaArray.push(arrayItems);
                        getProperties($, this, subject);
                    }

                    else {
                        var findParent = 0;
                        for (var j = 0; j < schemaArray.length; j++) {

                            if ($(schemaArray[j].node).is($(this))) {
                                findParent = 1;
                                subject = schemaArray[j].object;
                                predicate = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>";
                                object = $(this).attr("itemtype");

                                arrayItems = {
                                    node: "",
                                    subject: subject,
                                    predicate: predicate,
                                    object: object,
                                };
                                schemaArray.push(arrayItems);
                                getProperties($, this, subject);
                            }

                        }
                        if (!findParent) {
                            /* There has been something wrong with the parent eg. type does not exist in schema.org or etc.
                     So this node and children would not include in our triples...
                     */

                            console.log($(this).attr("itemtype") + " There has been something wrong with the parent eg. type does not exist in schema.org");
                        }
                    }

                }
                else {
                    console.log(itemtype + " is not a valid type of schema.org!");
                    var errorItem = {
                        subject: itemtype,
                        predicate: "<http://purl.org/dc/terms/errors>",
                        object: "is not a valid type of schema.org"
                    };
                    error_warningArray.push(errorItem);
                }

                if (index === len - 1) {
                    
                    //writeInFile();
                    end_itemtype_Cb =1;
                    console.log(schemaArray);
                }

            });
            
            
            ///Check for invalid tags which have itemprop attr but does not
            ///have any itemtype attr and also does not belong to any parent tag.
            itempropCheck($, function(isValidProp, itemprop) {
                if (!isValidProp) {
                    console.log("This itemprop has not been assigned to any parent!");
                    var errorItem = {
                        subject: itemprop,
                        predicate: "<http://purl.org/dc/terms/errors>",
                        object: "This itemprop has not been assigned to any parent"
                    };
                    error_warningArray.push(errorItem);
                }


            });
            
            if(end_itemprop_Cb && end_itemtype_Cb){
                writeInFile();
            }

        });
    }
}

function getProperties($, element, pSubject) {


    $($(element).find("[itemprop]")).each(function() {

        var parent = $(this).parent().closest('[itemtype]');
        var node;
        if (parent) {

            if (parent.is($(element))) {
                node = $(this);
                var subject = pSubject;
                var predicate = schemaBase + $(this).attr("itemprop") + ">";
                var object = "";

                if ($(this).attr("itemtype")) {
                    object = "<s" + sub_blackNodeCounter + ">";
                    sub_blackNodeCounter++;
                }
                else {
                    node = '';
                    object = $(this).text();
                }
                object = object.trim();
                arrayItems = {
                    node: node,
                    subject: subject,
                    predicate: predicate,
                    object: object,
                };
                schemaArray.push(arrayItems);
            }
        }
        else { /* warning: The parentnode doesnt have any property! */
        }

    });
}




function checkRules(ruleType, schemaType) {
    //
    //
    //    switch (ruleType) {
    //    case "itemtype":
    //        schemaType = schemaType.substring(schemaType.lastIndexOf('/') + 1);
    //        schemaType = schemaType.toLowerCase();
    //        isValidType = fs.existsSync('node_modules/schema-org/schemas/' + schemaType + '.json');
    //        break;
    //
    //    case "missingProp":
    //        $($.find("[itemprop]")).each(function(index, element) {
    //            var parents = $(this).parents('*');
    //            isValidProp = 0;
    //            for (var i = 0; i < parents.length; i++) {
    //                if ($(parents[i]).attr("itemtype")) isValidProp = 1;
    //            }
    //        });
    //        break;
    //    }
}






function itemtypeCheck(schemaType) {
    schemaType = schemaType.substring(schemaType.lastIndexOf('/') + 1);
    schemaType = schemaType.toLowerCase();
    isValidType = fs.existsSync('node_modules/schema-org/schemas/' + schemaType + '.json');
}

function itempropCheck($, callback) {
    var len = $($.find("[itemprop]")).length;
    
    $($.find("[itemprop]")).each(function(index, element) {
        
        if (!$(this).attr("itemtype")) {
            var parents = $(this).parents('*');
            var isValidProp = 0;
            for (var i = 0; i < parents.length; i++) {
                if ($(parents[i]).attr("itemtype")) isValidProp = 1;
            }

            callback(isValidProp, $(this).attr("itemprop"));
            if (index === len - 1) {
                //writeInFile();
                end_itemprop_Cb = 1;

            }
        }
    });
}




function writeInFile() {

    if (schemaArray.length !== 0) {
        var fileName = "./rdf" + fileNameCounter + ".txt";
        fs.writeFile(fileName, "");
        //        for (var i = 0; i < startArray.length; i++) {
        //
        //            var item = startArray[i].subject + "  " + startArray[i].predicate + "  " + startArray[i].object + "\n";
        //            fs.appendFileSync(fileName, item + "\n");
        //        }
        
        
        for (var i = 0; i < error_warningArray.length; i++) {

            var item = error_warningArray[i].subject + "  " + error_warningArray[i].predicate + "  " + error_warningArray[i].object + "\n";
            fs.appendFileSync(fileName, item + "\n");
        }

        for (var j = 0; j < schemaArray.length; j++) {

            var item1 = schemaArray[j].subject + "  " + schemaArray[j].predicate + "  " + schemaArray[j].object + "\n";
            fs.appendFileSync(fileName, item1 + "\n");

        }
        console.log("done!");
    }
}
