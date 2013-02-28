var fs = require("fs");
//var attorney = require('schema-org/schemas/attorney.json');
var request = require('request');
var mongo = require('mongodb');
//var cheerio = require('cheerio');
var jsdom = require("jsdom");
var ExpectedType_Validation = require('./ExpectedType_Validation');


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
                            url: item['url'],
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
var blankNodeCounter = 0;
var sub_blankNodeCounter = 0;
var schemaArray = [];
var error_warningArray = [];
var parentArray = [];
var arrayItems = {};
var errorItem = {};
var subject = "";
var predicate = "";
var object = "";
var schemaBase = "<http://schema.org/";
var isValidType = 0;
var validProp = 0;
var schemasAddress = "schemas/";

var end_itemtype_Cb = 0;
var end_itemprop_Cb = 0;
var end_itemscope_Cb = 0;

var url = "";
var expectedType = "";


function parseSchemasOrg(rowsIndicator) {

    if (rowsIndicator < retrievedResults.length) {
        fileNameCounter++;
        blankNodeCounter = 0;
        schemaArray = [];
        parentArray = [];
        arrayItems = {};
        errorItem = {};
        sub_blankNodeCounter = 0;


        subject = "";
        predicate = "";
        object = "";
        expectedType = "";

        url = retrievedResults[rowsIndicator].url;
        // request("http://www.atmayoga.com.au", function(err, resp, body) {
        //   if ((err === null) && resp.statusCode === 200) {

        //  html = body;
        //  fs.writeFile("html.html", body, function(err) {

        // jsdom.env("html.html", ["http://code.jquery.com/jquery.js"],
        jsdom.env("html.html", ["http://code.jquery.com/jquery.js"],
        //jsdom.env(url, ["http://code.jquery.com/jquery.js"],

        function(errors, window) {

            var $ = window.$;
            var flag = 0;
            var len = $($.find("[itemtype]")).length;

            $($.find("[itemtype]")).each(function(index, element) {

                flag = 0;
                var itemtype = $(this).attr("itemtype");

                /////check  itemtype and itemscope: ////
                if (!$(this).is('[itemscope]')) {
                    console.log(itemtype + " does not have itemscope attr.");
                    errorItem = {
                        subject: itemtype,
                        predicate: "<http://purl.org/dc/terms/warnings>",
                        object: "The node with itemtype attr does not have itemscope attr."
                    };
                    error_warningArray.push(errorItem);
                }


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
                           |
                           |
                           V
                           In the second thought we are going to follow the second way means that it sould be considered as a faulty node.
                           So I should add a tripple as an error:
                           */
                                errorItem = {
                                    node: '',
                                    subject: "<b/s???>" + itemtype,
                                    predicate: "<http://purl.org/dc/terms/errors>",
                                    object: "This node is a child node without any itemprop attr."
                                };
                                console.log(itemtype + " :This node is a child node without any itemprop attr.");
                                error_warningArray.push(errorItem);

                            }

                        }
                    }

                    if (!flag) { ////It is a root
                        subject = "<b" + blankNodeCounter + ">";
                        blankNodeCounter++;
                        predicate = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>";
                        object = itemtype;


                        /* Get itemid of the node*/
                        if ($(this).attr("itemid")) getItemidAttr($(this).attr("itemid"), subject);

                        arrayItems = {
                            node: '',
                            subject: subject,
                            predicate: predicate,
                            object: object,
                        };
                        schemaArray.push(arrayItems);
                        getProperties($, this, subject);
                    }

                    else { ////It is a child
                        var findParent = 0;
                        for (var j = 0; j < schemaArray.length; j++) {

                            if ($(schemaArray[j].node).is($(this))) {
                                findParent = 1;
                                subject = schemaArray[j].object;
                                predicate = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>";
                                object = $(this).attr("itemtype");


                                /* Get itemid of the node*/
                                if ($(this).attr("itemid")) getItemidAttr($(this).attr("itemid"), subject);



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
                            /* There has been something wrong with the parent eg. type does not exist in schema.org or 
                            it is a faulty node.
                     So this node and children would not be included in our triples...
                     */

                            console.log($(this).attr("itemtype") + " There has been something wrong with the parent eg. type does not exist in schema.org");
                        }
                    }

                }
                else {
                    console.log(itemtype + " is not a valid type of schema.org!");
                    errorItem = {
                        subject: itemtype,
                        predicate: "<http://purl.org/dc/terms/errors>",
                        object: "is not a valid type of schema.org"
                    };
                    error_warningArray.push(errorItem);
                }

                if (index === len - 1) {

                    //writeInFile();
                    end_itemtype_Cb = 1;
                    console.log(schemaArray);
                }

            });


            ///Check for invalid tags which have itemprop attr but does not
            ///have any itemtype attr and also does not belong to any parent tag.
            itempropCheck($, function(isValidProp, itemprop) {
                if (!isValidProp) {
                    console.log("This itemprop has not been assigned to any parent!");
                    errorItem = {
                        subject: itemprop,
                        predicate: "<http://purl.org/dc/terms/errors>",
                        object: "This itemprop has not been assigned to any parent"
                    };
                    error_warningArray.push(errorItem);
                }


            });

            ///Check for combination of itemscope and itemtype:
            ///itemscope should not come without itemtype:
            itemscopeCheck($, function(isValidScope, tagName) {

                if (!isValidScope) {
                    console.log("This node does not have any itemtype attr besides its itemscope");
                    errorItem = {
                        subject: tagName,
                        predicate: "<http://purl.org/dc/terms/errors>",
                        object: "This node does not have any itemtype attr besides its itemscope."
                    };
                    error_warningArray.push(errorItem);
                }


            });
            if (end_itemprop_Cb && end_itemtype_Cb && end_itemscope_Cb) {
                writeInFile();
            }

        });
    }
}


function getItemidAttr(itemidval, subject) {

    var subUrl = url;
    if (url.lastIndexOf("/") === url.length - 1) subUrl = subUrl.substring(0, subUrl.length - 1);
    if (itemidval.indexOf("www") === -1) itemidval = subUrl + itemidval;
    arrayItems = {
        node: "",
        subject: subject,
        predicate: "http://www.w3.org/2002/07/owl#sameAs",
        object: itemidval,
    };
    schemaArray.push(arrayItems);
}


function getProperties($, element, pSubject) {

    var atLeastOneProp = 0;
    $($(element).find("[itemprop]")).each(function() {
        var parent = $(this).parent().closest('[itemtype]');
        var node;
        if (parent) {

            if (parent.is($(element))) {

                // propValidityCheck(this,$(this).attr("itemprop"), $(parent).attr("itemtype"),function(validProp) {
                propValidityCheck($(this).attr("itemprop"), $(parent).attr("itemtype"));
                if (validProp) {

                    node = $(this);
                   
                    if ($(this).attr("itemtype")) {

                        /*Checking for expected type:
                        Rule: 
                        There is a itemtype along with itemprop 
                        which should be matched with expected-type 
                        of mentioned itemprop based on schema.org. 
                        Also this itemtype can be one of children or 
                        grandchildren of expected-type. Therefore, 
                        ExpectedType_Validation module will check the 
                        itemtype to indicate that expected-type is one 
                        of its ancestors or not. 
                        */
                        ExpectedType_Validation(expectedType,$(this).attr("itemtype"),$(this).attr("itemprop"), null, function(isValidExpectedType,itemtype,itemprop, itemid) {

                            if (isValidExpectedType) {
                                atLeastOneProp = 1;
                                subject = pSubject;
                                predicate = schemaBase + itemprop + ">";
                                object = "<s" + sub_blankNodeCounter + ">".trim();
                                sub_blankNodeCounter++;
                                arrayItems = {
                                    node: node,
                                    subject: subject,
                                    predicate: predicate,
                                    object: object,
                                };

                                //console.log(subject, predicate, object);
                                schemaArray.push(arrayItems);
                            }
                            else {
                                
                                 console.log(itemtype + " is not a valid expected-type for this property: "+ itemprop);
                                 errorItem = {
                                     subject: itemtype,
                                     predicate: "<http://purl.org/dc/terms/errors>",
                                     object: itemtype + " is not a valid expected-type for this property: "+ itemprop
                                 };
                                 error_warningArray.push(errorItem);

                            }
                        });
                    }
                    else {
                        atLeastOneProp = 1;
                        node = '';
                        var targetNode = $(this)
                        getExceptions($, targetNode);
                        subject = pSubject;
                        predicate = schemaBase + $(this).attr("itemprop") + ">";
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
                else {
                    console.log("The " + $(this).attr("itemprop") + " doesnt not belong to " + parent.attr("itemtype"));
                    errorItem = {
                        subject: $(this).attr("itemprop"),
                        predicate: "<http://purl.org/dc/terms/errors>",
                        object: "The " + $(this).attr("itemprop") + " doesnt not belong to " + parent.attr("itemtype")
                    };
                    error_warningArray.push(errorItem);
                }
                //  });
            }
        }

    });
    propExistCheck(atLeastOneProp, $(element).attr("itemtype"));
}

function getExceptions($, targetNode) {

    //     if ($(targetNode).attr("href")) object = $(targetNode).attr("href");
    //     else if ($(targetNode).attr("src")) object = $(targetNode).attr("src");
    //     else

    // console.log("tagname :   " + $(targetNode)[0].tagName)  
    if ($(targetNode)[0].tagName === "TIME") {

        if ($(targetNode).attr("datetime")) object = $(targetNode).attr("datetime");
        else object = $(targetNode).text();
    }
    else if ($(targetNode)[0].tagName === "META") {

        if ($(targetNode).attr("content")) object = $(targetNode).attr("content");
        else object = $(targetNode).text();

    }
    else if ($(targetNode)[0].tagName === "LINK") {

        if ($(targetNode).attr("href")) object = $(this).attr("href");
        else object = $(targetNode).text();
    }
    else if ($(targetNode)[0].tagName === "IMG") {

        if ($(targetNode).attr("src")) {
            object = $(targetNode).attr("src");
        }
        else object = $(targetNode).text();
    }

    else object = $(targetNode).text();

};

///////CHECK RULES///////////
//function propValidityCheck(elem,itemprop,itemtype,callback) {
//    var validProp =0;
//    
//    var schemaType = itemtype.substring(itemtype.lastIndexOf('/') + 1).toLowerCase();
//    console.log(schemaType +"   "+itemprop);
//    fs.readFile(schemasAddress + schemaType + '.json', 'utf8', function(error, filecontents) {
//        if (error) console.log("Error in reading the file:  " + error);
//       else {
//            var content = JSON.parse(filecontents);
//            var bases = content["bases"];
//            var properties = content["properties"];
//            var type;
//            for (var types in bases) {
//                type = content.bases[types];
//                for (var props in type) {
//                    if (itemprop === type[props].name) {
//                        validProp = 1;
//                        console.log(type[props].name);
//                    }
//                }
//            }
//             if (properties) {
//                 for (var types2 in properties) {
//                     if (itemprop === properties[types2].name) validProp = 1;
//                 }
//             }
//        
//            
//            callback(validProp);
//        }
//    });
//}


function propValidityCheck(itemprop, itemtype) {
    validProp = 0;
    var schemaType = itemtype.substring(itemtype.lastIndexOf('/') + 1).toLowerCase();
    var filecontents = fs.readFileSync(schemasAddress + schemaType + '.json', 'utf8');
    if (filecontents) {
        var content = JSON.parse(filecontents);
        var bases = content["bases"];
        var properties = content["properties"];
        var type;
        for (var types1 in bases) {
            type = content.bases[types1];
            for (var props1 in type) {
                if (itemprop === type[props1].name) {
                    validProp = 1;
                    expectedType = type[props1].type;
                }
            }
        }
        if (properties) {
            for (var types2 in properties) {
                if (itemprop === properties[types2].name) {
                    validProp = 1;
                    expectedType = properties[types2].type;
                }
            }
        }


    }

}

function propExistCheck(atLeastOneProp, itemtype) {
    if (!atLeastOneProp) {
        /* warning: The parentnode doesnt have any property! */
        console.log("The parentnode doesnt have any property!");
        errorItem = {
            subject: itemtype,
            predicate: "<http://purl.org/dc/terms/warnings>",
            object: "The parentnode doesnt have any property"
        };
        error_warningArray.push(errorItem);
    }
}

function itemtypeCheck(schemaType) {
    schemaType = schemaType.substring(schemaType.lastIndexOf('/') + 1);
    schemaType = schemaType.toLowerCase();
    isValidType = fs.existsSync(schemasAddress + schemaType + '.json');
}

function itempropCheck($, callback) {

    var len = $($.find("[itemprop]")).length;

    $($.find("[itemprop]")).each(function(index, element) {

        if (!$(this).attr("itemtype")) {
            var parents = $(this).parents('[itemtype]');
            var isValidProp = 0;

            if (parents.length !== 0) isValidProp = 1;

            callback(isValidProp, $(this).attr("itemprop"));
            if (index === len - 1) {
                //writeInFile();
                end_itemprop_Cb = 1;

            }
        }

        //        if (!$(this).attr("itemtype")) {
        //            var parents = $(this).parents('*');
        //            var isValidProp = 0;
        //            for (var i = 0; i < parents.length; i++) {
        //                if ($(parents[i]).attr("itemtype")) isValidProp = 1;
        //            }
        //            callback(isValidProp, $(this).attr("itemprop"));
        //            if (index === len - 1) {
        //                //writeInFile();
        //                end_itemprop_Cb = 1;
        //
        //            }
        //        }
    });
}

function itemscopeCheck($, callback) {
    var len = $($.find("[itemscope]")).length;
    var isValidScope = 0;
    $($.find("[itemscope]")).each(function(index, element) {
        if ($(this).attr("itemtype")) isValidScope = 1;
        callback(isValidScope, $(this)[0].tagName);
        if (index === len - 1) {
            end_itemscope_Cb = 1;
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
