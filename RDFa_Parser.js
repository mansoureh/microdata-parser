var fs = require("fs");
var request = require('request');
var mongo = require('mongodb');
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



var fileNameCounter = 0;



var error_warningArray = [];
var parentArray = [];

var errorItem = {};


var isValidType = 0;
var validProp = 0;
var schemasAddress = "schemas/";

var end_itemtype_Cb = 0;
var end_itemprop_Cb = 0;
var end_itemscope_Cb = 0;
///////////////////////////////////////////////////////////
var url = "";
var schemaBase = "http://schema.org/";
var prefixNameOfSchema = "";

var blankNodeCounter = 0;
var sub_blankNodeCounter = 1;

var subject = "";
var predicate = "";
var object = "";

var schemaArray = [];
var arrayItems = {};

var expectedType = "";



function parseSchemasOrg(rowsIndicator) {

    if (rowsIndicator < retrievedResults.length) {
        fileNameCounter++;
        blankNodeCounter = 0;
        schemaArray = [];
        parentArray = [];
        arrayItems = {};
        errorItem = {};
        sub_blankNodeCounter = 1;


        subject = "";
        predicate = "";
        object = "";




        url = retrievedResults[rowsIndicator].url;

        //jsdom.env(url, ["http://code.jquery.com/jquery.js"],
        jsdom.env("test.html", ["http://code.jquery.com/jquery.js"],

        function(errors, window) {

            var $ = window.$;

            var numOfTypeof = $($.find("[typeof]")).length;



            $($.find("[typeof]")).each(function(index, element) {


                var isPrefix = 0;
                var isVocab = 0;
                var hasProperty = 0;

                prefixNameOfSchema = "";


                /// When typeof attribute is in the same tag of vocab attr or prefix attr:
                if (($(this).attr("vocab") && $(this).attr("vocab").match(schemaBase)) || $($(this).closest('[vocab*= "' + schemaBase + '"]')).length) {



                    /* If this itemtype is really related to the schema.org: 
                           typeof attr can be defined like:
                           1- <...  typeof="Blog" --->
                           2- <...  typeof="http://schema.org/Blog" --->
                           or if there is prefix for schema then:
                           3- <...  typeof="schema:Blog" ---> which has been coded in the next "if" (not here)
                        */
                    if ($(this).attr("typeof").match(schemaBase) || $(this).attr("typeof").indexOf(":") == -1) {

                        ///check validity of itemtype:
                        itemtypeCheck($(this).attr("typeof"));

                        if (isValidType) {
                            isPrefix = 0;
                            isVocab = 1;
                            if (!$(this).attr("property")) hasProperty = 0;
                            else hasProperty = 1;
                            getNodeTriples($, this, $(this).attr("typeof"), hasProperty, isPrefix);
                        }
                        else {
                            console.log($(this).attr("typeof") + " is not a valid type of schema.org!");
                            errorItem = {
                                subject: $(this).attr("typeof"),
                                predicate: "<http://purl.org/dc/terms/errors>",
                                object: "is not a valid type of schema.org"
                            };
                            error_warningArray.push(errorItem);
                        }
                    }

                }


                else if (($(this).attr("prefix") && $(this).attr("prefix").match(schemaBase)) || $($(this).closest('[prefix*= "' + schemaBase + '"]')).length) {

                    /*
                        There is a prefix for schema.org and we
                        need to exteract the prefix to match
                        them to typeof and property attributes:
                        */
                    if ($(this).attr("prefix") && $(this).attr("prefix").match(schemaBase)) getSchemaPrefix($(this).attr("prefix"));
                    else if ($($(this).closest('[prefix*= "' + schemaBase + '"]')).length) getSchemaPrefix($(this).closest('[prefix*= "' + schemaBase + '"]').attr("prefix"));

                    if ($(this).attr("typeof").match(prefixNameOfSchema)) {


                        /* it mat like this: <div typeof="schema:BlogPosting"> */
                        var itemtype = $(this).attr("typeof");
                        itemtype = itemtype.substring(itemtype.indexOf(prefixNameOfSchema) + prefixNameOfSchema.length);
                        if (itemtype.indexOf(' ') !== -1) itemtype = itemtype.substring(0, itemtype.indexOf(' '));

                        ///check validity of itemtype:
                        itemtypeCheck(itemtype);

                        if (isValidType) {

                            //<div typeof="schema:BlogPosting">


                            isPrefix = 1;
                            isVocab = 0;
                            if (!$(this).attr("property")) hasProperty = 0;
                            else hasProperty = 1;
                            getNodeTriples($, this, itemtype, hasProperty, isPrefix);
                        }
                        else {
                            console.log($(this).attr("typeof") + " is not a valid type of schema.org!");
                            errorItem = {
                                subject: $(this).attr("typeof"),
                                predicate: "<http://purl.org/dc/terms/errors>",
                                object: "is not a valid type of schema.org"
                            };
                            error_warningArray.push(errorItem);
                        }
                    }
                }
                else {

                    /*
                        In RDFa schema parser it is important to indicate "http://schema.org/"in one of vocab or prefix attributes.
                        In fact using just <... typeof="http://schema.org/Blog" ...> is not enough.
                        */
                    console.log($(this).attr("typeof") + " does not have any vocab or prefix attribute.");
                    errorItem = {
                        subject: $(this).attr("typeof"),
                        predicate: "<http://purl.org/dc/terms/errors>",
                        object: "does not have any vocab or prefix attribute"
                    };
                    error_warningArray.push(errorItem);

                }



                if (index === numOfTypeof - 1) {

                    //writeInFile();
                    end_itemtype_Cb = 1;
                    console.log(schemaArray);
                    writeInFile();

                }



            });


            /* In this case (RDFa) if there is a property out of anyvocab,prefix and itemtype tag, then it will not considered as a schema.org tag?????. */
            //            /*
            //            Check for invalid tags which have property attr but does not
            //            have any itemtype attr and also does not belong to any parent tag.
            //            */
            //            itempropCheck($, function(isValidProp, itemprop) {
            //                
            //                
            //                if (!isValidProp) {
            //                   
            //                    console.log("This "+itemprop+" has not been assigned to any parent!");
            //                    errorItem = {
            //                        subject: itemprop,
            //                        predicate: "<http://purl.org/dc/terms/errors>",
            //                        object: "This "+itemprop+" has not been assigned to any parent"
            //                    };
            //                    error_warningArray.push(errorItem);
            //                }
            //            });
            //            if (end_itemprop_Cb && end_itemtype_Cb) {
            //                writeInFile();
            //            }

        });
    }
}

function itemtypeCheck(schemaType) {
    schemaType = schemaType.substring(schemaType.lastIndexOf('/') + 1);
    schemaType = schemaType.toLowerCase();
    isValidType = fs.existsSync(schemasAddress + schemaType + '.json');
}

function getSchemaPrefix(prefix) {
    prefix = prefix.substring(0, prefix.indexOf(schemaBase)).trim();
    prefixNameOfSchema = prefix.substring(prefix.lastIndexOf(' ')).trim();
}

function getNodeTriples($, element, itemtype, hasProperty, isPrefix) {

    var itemidval = "";
    var subUrl = "";

    object = itemtype;
    if (!itemtype.match(schemaBase)) object = schemaBase + itemtype;
    if (!hasProperty) {
        subject = "<RDFa" + blankNodeCounter + ">";
        blankNodeCounter++;
        predicate = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>";

        /* Get resource of the node*/
        if ($(element).attr("resource")) getResourceAttr($(element).attr("resource"), subject, null);

        arrayItems = {
            node: '',
            subject: subject,
            predicate: predicate,
            object: object,
        };
        schemaArray.push(arrayItems);
        getProperties($, element, subject, itemtype, isPrefix);

    }
    /*
        Now we are going to find sub_blanknodes("typeof" attributes) 
        which are specified by being beside "property" attribute:
      */
    else {

        var findParent = 0;
        for (var j = 0; j < schemaArray.length; j++) {

            if ($(schemaArray[j].node).is($(element))) {
                findParent = 1;
                subject = schemaArray[j].object;
                predicate = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>";
               
                /* Get resource of the node*/
                if ($(element).attr("resource")) getResourceAttr($(element).attr("resource"), subject, null);



                arrayItems = {
                    node: "",
                    subject: subject,
                    predicate: predicate,
                    object: object,
                };
                schemaArray.push(arrayItems);
                getProperties($, element, subject, itemtype, isPrefix);
            }

        }
        if (!findParent) {
            /* 
            There has been something wrong with the parent eg. type does not exist in schema.org or 
            it is a faulty node.
            So this node and children would not be included in our triples...
            */
            console.log(itemtype + " There has been something wrong with the parent eg. type does not exist in schema.org");
        }

    }


}

function getProperties($, element, pSubject, itemtype, isPrefix) {

    var atLeastOneProp = 0;
    var property = "";

    $($(element).find("[property]")).each(function() {



        var parent = $(this).parent().closest('[typeof]');
        var node;
        if (parent) {

            if (parent.is($(element))) {

                property = $(this).attr("property");

                /*
                  isPrefix variable is for indicating that is there any prefix for schema.org or not, therefore :
                  Just properties will be added to the array that are matched to the schema.org: 
                  If vocab = "http://schema.org/":
                  then means that properties without any prefix can be added. 
                  Otherwise if prefix= "schema: http://schema.org/"
                  then properties with value of containing "schema:" can be added to the triples array.
                */

                if ((!isPrefix && $(this).attr("property").indexOf(":") == -1) || (isPrefix && $(this).attr("property").match(prefixNameOfSchema))) {


                    if (isPrefix && $(this).attr("property").match(prefixNameOfSchema)) {

                        property = property.substring(property.indexOf(prefixNameOfSchema) + prefixNameOfSchema.length);

                        if (property.indexOf(' ') !== -1) property = property.substring(0, property.indexOf(' '));
                    }

                    propValidityCheck(property, itemtype);

                    if (validProp) {
                        
                        node = $(this);
                        if ($(this).attr("typeof")) {
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
                        
                        var typeodProperty = $(this).attr("typeof");
                        if(!typeodProperty.match(schemaBase)) typeodProperty = schemaBase + typeodProperty ;
                        
                       
                        ExpectedType_Validation(expectedType, typeodProperty, property,$(this).attr("resource"), function(isValidExpectedType, itemtype, itemprop, itemid) {

                            if (isValidExpectedType) {
                                
                                atLeastOneProp = 1;
                                subject = pSubject;
                                predicate ="<" + schemaBase + itemprop + ">";
                                object = "<sRDF" + sub_blankNodeCounter + ">".trim();
                                sub_blankNodeCounter++;
                                arrayItems = {
                                    node: node,
                                    subject: subject,
                                    predicate: predicate,
                                    object: object,
                                };

                                schemaArray.push(arrayItems);
                            }
                            else {

                                console.log(itemtype + " is not a valid expected-type for this property: " + itemprop);
                                errorItem = {
                                    subject: itemtype,
                                    predicate: "<http://purl.org/dc/terms/errors>",
                                    object: itemtype + " is not a valid expected-type for this property: " + itemprop
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
                             predicate = "<" + schemaBase + property + ">";
                             object = object.trim();
                             arrayItems = {
                                 node: node,
                                 subject: subject,
                                 predicate: predicate,
                                 object: object,
                             };
                             schemaArray.push(arrayItems);   
                             
                             /* Get resource of the property*/
                             if ($(this).attr("resource")) getResourceAttr($(this).attr("resource"), null, object);
                        }


                       

                    }
                    else {

                        console.log("The " + $(this).attr("property") + " doesnt not belong to " + parent.attr("typeof"));
                        errorItem = {
                            subject: $(this).attr("property"),
                            predicate: "<http://purl.org/dc/terms/errors>",
                            object: "The " + $(this).attr("property") + " doesnt not belong to " + parent.attr("typeof")
                        };
                        error_warningArray.push(errorItem);
                    }
                }

            }
        }





    });
    propExistCheck(atLeastOneProp, $(element).attr("typeof"));
}


function getResourceAttr(itemidval, subject, object)
{
    var thisSubject = subject;
    if (object !== null) thisSubject = object;
    /* Get resource of tag*/


    var subUrl = url;
    if (url.lastIndexOf("/") === url.length - 1) subUrl = subUrl.substring(0, subUrl.length - 1);
    if (itemidval.indexOf("www") === -1) itemidval = subUrl + itemidval;

    arrayItems = {
        node: "",
        subject: thisSubject,
        predicate: "http://www.w3.org/2002/07/owl#sameAs",
        object: itemidval,
    };
    schemaArray.push(arrayItems);
}

//Issue
//function itempropCheck($, callback) {
//
//    var numOfProperty = $($.find("[itemprop]")).length;
//    
//
//
//    $($.find("[property]")).each(function(index, element) {
//
//
//        if (!$(this).attr("typeof")) {
//            var isValidProp = 0;
//            var vocabParents = $(this).parents('[vocab*= "' + schemaBase + '"]');
//            var prefixParents = $(this).parents('[prefix*= "' + schemaBase + '"]');
// 
//            var typeofParents = $(this).parents("[typeof]");
// 
//
//            if (vocabParents.length !== 0) {
//                
//               
//                for (var i = 0; i < typeofParents.length; i++) {
//                    if ($(typeofParents[i]).attr("typeof").indexOf(":") == -1 && $(this).attr("property").indexOf(":") == -1) {
//                        isValidProp = 1;
//                    }
//
//                }
//
//            }
//
//            else if (prefixParents.length !== 0) {
//
//                
//                var closest = $(this).closest('[prefix*= "' + schemaBase + '"]').attr("prefix")
//                closest = closest.substring(0, closest.indexOf(schemaBase)).trim();
//                var prefixName = closest.substring(closest.lastIndexOf(' ')).trim();
//                
//               
//                if ($(this).attr('property').match(prefixName)) {
//                    if ($(this).parents('[typeof*= "' + prefixName + '"]').length) isValidProp = 1;
//                }
//            }
//
// console.log("______________ "+isValidProp)
//            callback(isValidProp, $(this).attr("property"));
//            if (index === numOfProperty - 1) {
//                //writeInFile();
//                end_itemprop_Cb = 1;
//
//            }
//        }
//    });
//}

function propValidityCheck(property, itemtype) {

    try {
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
                    if (property === type[props1].name) {
                        validProp = 1;
                        expectedType = type[props1].type;
                    }
                }
            }
            if (properties) {
                for (var types2 in properties) {
                    if (property === properties[types2].name) {
                        validProp = 1;
                        expectedType = properties[types2].type;
                    }
                }
            }
        }
    }
    catch (error) {
        console.log("There is an error in propValidityCheck method: " + error)

    }

}

function getExceptions($, targetNode) {

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

function writeInFile() {

    if (schemaArray.length !== 0) {
        var fileName = "./rdfa" + fileNameCounter + ".txt";
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




//  
//            $($.find("[vocab]")).each(function(index, element) {
//                
//                var vocabVal = $(this).attr("vocab");
//                
//                ///Find Schema.org in vocab value:
//                if(vocabVal.match(schemaBase)){
//                    
//                    ///Find typeof atrrs:
//                    $($(this).parent().find("[typeof]")).each(function(index, element){
//                        
//                        // If typeof attr is on the top:
//                        
//                        if (($(this).attr("vocab") && $(this).attr("vocab").match(schemaBase)) || ($(this).attr("prefix") && $(this).attr("prefix").match(schemaBase))) {
//                            
//                            // 
//                            if($(this).attr("prefix").match(schemaBase)){
//                                
//                                getSchemaPrefix($(this).attr("prefix"));
//                              
//                            }
//                            else if($(this).attr("vocab").match(schemaBase)) {
//                                
//                                
//                            }            
//                        }
//                        else{
//                            
//                            if(!$(this).attr("property")){
//                                
//                            }
//                        }
//          
//                        
//                    });
//                    
//                    
//                    
//                    
////                    if($(this).attr("typeof")) {
////                        //This will be a parnt node for all other ones:
////                        getSubNodes($(this).attr("typeof"));
////                    }
////                    
////                 console.log("hey");
//                }
//                else{
//                    
//                }
//            });
//        });
//    }
//}
