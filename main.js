/**
 *
 * bacnet adapter
 *
 *
 *  file io-package.json comments:
 *
 *  {
 *      "common": {
 *          "name":         "bacnet",                // name has to be set and has to be equal to adapters folder name and main file name excluding extension
 *          "version":      "0.0.2",                    // use "Semantic Versioning"! see http://semver.org/
 *          "title":        "Roth Bacnet Adapter",// Adapter title shown in User Interfaces
 *          "authors":  [                               // Array of authord
 *              "name <fabian.siebold@gmail.com>"
 *          ]
 *          "desc":         "Roth Bacnet adapter",   // Adapter description shown in User Interfaces. Can be a language object {de:"...",ru:"..."} or a string
 *          "platform":     "Javascript/Node.js",       // possible values "javascript", "javascript/Node.js" - more coming
 *          "mode":         "schedule",                   // possible values "daemon", "schedule", "subscribe"
 *          "materialize":  true,                       // support of admin3
 *          "schedule":     "0 0/5 * * *"                 // cron-style schedule. Only needed if mode=schedule
 *          "loglevel":     "info"                      // Adapters Log Level
 *      },
 *      "native": {                                     // the native object is available via adapter.config in your adapters code - use it for configuration
 *          "ipAddress": "0.0.0.0",
 *      }
 *  }
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */ 
'use strict';
var exec = require('child_process').exec;

// you have to require the utils module and call adapter function
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
const bacnet =    require(__dirname + '/lib/bacnet'); // Get bacnet adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.bacnet.0
const adapter = new utils.Adapter('bacnet');

/*Variable declaration, since ES6 there are let to declare variables. Let has a more clearer definition where 
it is available then var.The variable is available inside a block and it's childs, but not outside. 
You can define the same variable name inside a child without produce a conflict with the variable of the parent block.*/
let pollingInterval;
var objList;



// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
		adapter.setState("info.connection", {val: false, ack: true});
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
//    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) 
	{
        adapter.log.info('Value changed by user! (ID:' + id + "  VAL:" + state.val + ")");

		// Wurde der Wert vom BO geändert?
		if (id == "bacnet.0.1000.4.0.present_value")
		{
			let writeObjList  = __dirname + "/exec/bacwp " + adapter.config.deviceId + " 4 0 85 8 -1 9 1";

			exec(writeObjList, function(err, stdout, stderr) 
			{
				if (err) 
				{
					adapter.log.error(err);
					return;
				}
			});
		}
		else
		{
			adapter.log.error('object' + id + ' is not writable');
		}
	}
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    adapter.log.info("Bacnet: START ADAPTER data:", adapter.common);
	adapter.setState("info.connection", {val: false, ack: true});
    main();
//	getData();
});

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('Device-Id: '       + adapter.config.deviceId);
    adapter.log.info('Polling-Intervall: ' + adapter.config.pollingInterval);

	getObjList();

	if (!adapter.config.pollingInterval)
	{
        adapter.log.warn("adapter.config.pollingInterval not set");
		adapter.config.pollingInterval = 5
	}

	if (adapter.config.pollingInterval < 5)
	{
		adapter.config.pollingInterval = 5
	}
	
	if (!pollingInterval) {
		pollingInterval = setInterval(function () {
			getDynamicObjData();
		}, adapter.config.pollingInterval * 1000);
	}
	
    // in this bacnet all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');
/*
    // examples for the checkPassword/checkGroup functions
    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw ioboker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });
*/


}

if(typeof String.prototype.replaceAll === "undefined") {
    String.prototype.replaceAll = function(match, replace) {
       return this.replace(new RegExp(match, 'g'), () => replace);
    }
}

// convert the bacrpm string to a json string
function bacstr2Json(bacStr)
{
//    adapter.log.info("bacstr2Json Input: " + bacStr);
	// "\r    =>  ",\r
	// )\r    =>  ",\r
	// : (    =>  : "
	// (      =>  "
	// )      =>  "
	// {"     =>  ["
	// }     =>  
	// add } at the end of string
	
	// Search for all "xxx, xxx" and remove the ,
	bacStr = bacStr.replace(/((description: ")[\u0020A-Za-z0-9_-]+),/g,'$1');

		
	bacStr = bacStr.replaceAll(", ",', "instance": ');
	bacStr = bacStr.replace(/["][\r\n]/g,'", ');
	bacStr = bacStr.replace(/[)][\r\n]/g,'}, ');
	bacStr = bacStr.replace(/[:] [(]/g,':{"object_type":');
	bacStr = bacStr.replace(/[(]/g,'{"object_type":');
	bacStr = bacStr.replace(/[)]/g,'}');
	bacStr = bacStr.replace(/[:] [{]/g,': [');
	bacStr = bacStr.replace(/[}][}]/g,'}]');

	bacStr = bacStr.replaceAll('object-name',   '"object_name"');
	bacStr = bacStr.replaceAll('description',   '"description"');
	bacStr = bacStr.replaceAll('object-identifier','"object_identifier"');

	bacStr = bacStr.replace(/(present-value: )[A-Za-z0-9,_-]+/g, '$&,');
	bacStr = bacStr.replace(/(present-value: )[A-Za-z0-9_-]+/g, '$&,');
	bacStr = bacStr.replace(/(low-limit: )[A-Za-z0-9,_-]+/g, '$&,');
	bacStr = bacStr.replace(/(low-limit: )[A-Za-z0-9_-]+/g, '$&,');
	bacStr = bacStr.replace(/(high-limit: )[A-Za-z0-9,_-]+/g, '$&,');
	bacStr = bacStr.replace(/(high-limit: )[A-Za-z0-9_-]+/g, '$&,'); 
	bacStr = bacStr.replaceAll(',,', '.');
	bacStr = bacStr.replaceAll('present-value', '"present_value"');
	bacStr = bacStr.replaceAll('low-limit',     '"low_limit"');
	bacStr = bacStr.replaceAll('high-limit',    '"high_limit"');

	bacStr = bacStr.replaceAll('low limit', 'low_limit');
	bacStr = bacStr.replaceAll('high limit', 'high_limit');
	bacStr = bacStr.replace(/(event-state: )[\u0020A-Za-z0-9_-]+/g, '$&",');
	bacStr = bacStr.replaceAll('event-state: ', '"event_state": "');
	bacStr = bacStr.replaceAll('out-of-service','"out_of_service"');
	bacStr = bacStr.replaceAll('FALSE','false,');
	bacStr = bacStr.replaceAll('TRUE','true,');
	bacStr = bacStr.replaceAll('inactive.','0,');
	bacStr = bacStr.replaceAll('active.','1,');
	bacStr = bacStr.replace(/(reliability: )[A-Za-z0-9_-]+/g, '$&",');
	bacStr = bacStr.replaceAll('reliability: ', '"reliability": "');

	bacStr = bacStr.replace(/[,][\r\n]+[}]/g,'}');
	bacStr = bacStr.replace(/[.][\r\n]/g,', ');
	
	bacStr = bacStr.replaceAll('object-list','"object_list"');
	
	bacStr = bacStr.replaceAll('analog-input',  '0');
	bacStr = bacStr.replaceAll('analog-output', '1');
	bacStr = bacStr.replaceAll('analog-value',  '2');
	bacStr = bacStr.replaceAll('binary-input',  '3');
	bacStr = bacStr.replaceAll('binary-output', '4');
	bacStr = bacStr.replaceAll('binary-value',  '5');
	bacStr = bacStr.replaceAll('calendar',  '6');
	bacStr = bacStr.replaceAll('command',   '7');
	bacStr = bacStr.replaceAll('device',    '8');
	bacStr = bacStr.replaceAll('event-enrollment', '9');
	bacStr = bacStr.replaceAll('file',   '10');
	bacStr = bacStr.replaceAll('group',  '11');
	bacStr = bacStr.replaceAll('loop',   '12');
	bacStr = bacStr.replaceAll('multi-state-input',  '13');
	bacStr = bacStr.replaceAll('multi-state-output', '14');
	bacStr = bacStr.replaceAll('notification-class', '15');
	bacStr = bacStr.replaceAll('program',   '16');
	bacStr = bacStr.replaceAll('schedule',  '17');
	bacStr = bacStr.replaceAll('averaging', '18');
	bacStr = bacStr.replaceAll('multi-state-value',  '19');

	
	bacStr = bacStr.replace(/[0-9]+ #[0-9]+/g, ',');
	
	bacStr = bacStr.replace(/(object-type: )[A-Za-z0-9_-]+/g, '$&');
	bacStr = bacStr.replace('object-type: ','"object_type": ');
	//bacStr = bacStr.replace(/(object-type: )[A-Za-z0-9_-]+/g, '$&"');
	bacStr = bacStr.replaceAll('proprietary ','');

	bacStr =  bacStr.substring(bacStr.indexOf('{')-1);

	bacStr = '{"objects": [' + bacStr + ']}'
/*
    adapter.log.info("bacstr2Json Output: " + bacStr);
    adapter.log.info("bacstr2Json Output more300:  " + bacStr.slice(300));
    adapter.log.info("bacstr2Json Output more600:  " + bacStr.slice(600));
    adapter.log.info("bacstr2Json Output more900:  " + bacStr.slice(900));
    adapter.log.info("bacstr2Json Output more1200: " + bacStr.slice(1200));
    adapter.log.info("bacstr2Json Output more1500: " + bacStr.slice(1500));
    adapter.log.info("bacstr2Json Output more1800: " + bacStr.slice(1800));
    adapter.log.info("bacstr2Json Output more2100: " + bacStr.slice(2100));
    adapter.log.info("bacstr2Json Output more2400: " + bacStr.slice(2400));
    adapter.log.info("bacstr2Json Output more2700: " + bacStr.slice(2700));
    adapter.log.info("bacstr2Json Output more3000: " + bacStr.slice(3000));
    adapter.log.info("bacstr2Json Output more3300: " + bacStr.slice(3300));
*/
	return bacStr;
}

// Average Load mit uptime auslesen
function getObjList() 
{
	let timeout = adapter.config.pollingInterval * 2;
	let readObjList  = __dirname + "/exec/bacrpm " + adapter.config.deviceId + " 8 "+ adapter.config.deviceId + " 77,28,75,76";
    
//	adapter.log.info("getObjList " + readObjList);
	
    exec(readObjList, function(err, stdout, stderr) 
    {
        if (err) 
        {
            adapter.log.error(err);
			adapter.setState("info.connection", {val: false, ack: true});
			return;
        }
		adapter.setState("info.connection", {val: true, ack: true});

//		adapter.log.info("stdout: " + stdout);

		// Convert string into JSON-Format
		stdout = bacstr2Json(stdout);

        let jsonObjects = JSON.parse(stdout);
		if (!jsonObjects || (!jsonObjects.objects[0].object_list) || (jsonObjects.objects[0].object_list.length <= 0))
		{
			adapter.log.error("error while reading object_list");
			adapter.setState("info.connection", {val: false, ack: true});
			return;			
		}
		
		let objPath = jsonObjects.objects[0].object_identifier.instance.toString();
		objList = jsonObjects.objects[0].object_list;

		adapter.setObject(objPath, {
			type: 'device',
			common: {
				name: jsonObjects.objects[0].object_name
			},
			native: {}
		});

		// Suche das Device im Json-Object
		for (let iObj=0; iObj < objList.length; iObj++)
		{
//			adapter.log.info("BACnet: create object Type=" + objList[iObj].object_type + " (" + bacnet.objTypeGetById(objList[iObj].object_type) + "," + bacnet.objTypeGetByStr(bacnet.objTypeGetById(objList[iObj].object_type)) + ") Id=" + objList[iObj].instance);
	
			adapter.setObject(objPath + "." + objList[iObj].object_type, {
				type: 'channel',
				common: {
					name: bacnet.objTypeGetById(objList[iObj].object_type)
				},
				native: {}
			});

		}

		getStaticObjData();

	});
}



function getStaticObjData() 
{
	adapter.log.info("Read the static data from the bacnet objects");

	// Fuge alle statischen Daten in den Request ein
	for (var iObj in objList) 
	{
		let readObjList  = __dirname + "/exec/bacrpm " + adapter.config.deviceId + " " + objList[iObj].object_type + " "+ objList[iObj].instance + " 77,28,75,79 ";

		exec(readObjList, function(err, stdout, stderr) 
		{
			if (err) 
			{
				adapter.log.error(err);
				adapter.setState("info.connection", {val: false, ack: true});
				return;
			}
			adapter.setState("info.connection", {val: true, ack: true});

			// Convert string into JSON-Format
			stdout = bacstr2Json(stdout);

			let jsonObjects = JSON.parse(stdout);
			if (!jsonObjects || (jsonObjects.objects.length <= 0))
			{
				adapter.log.error("error while reading object_list");
				adapter.setState("info.connection", {val: false, ack: true});
				return;			
			}
			
			let obj = jsonObjects.objects[0];
			let objPath = adapter.config.deviceId + "." + obj.object_identifier.object_type + "." + obj.object_identifier.instance;

			adapter.setObject(objPath, {
				type: 'channel',
				common: {
					name: obj.description
				},
				native: {}
			});
			
			
			adapter.setObject(objPath + ".object_name", {
				type: 'state',
				common: {
					name: 'object_name',
					type: 'string',
					unit: '',
					role: '',
					read: true,
					write: false
				},
				native: {}
			});
			adapter.setState(objPath + ".object_name",    {val: obj.object_name, ack: true});
			
			adapter.setObject(objPath + ".description", {
				type: 'state',
				common: {
					name: 'description',
					type: 'string',
					unit: '',
					role: '',
					read: true,
					write: false
				},
				native: {}
			});
			adapter.setState(objPath + ".description",    {val: obj.description, ack: true});
			
			adapter.setObject(objPath + ".object_type", {
				type: 'state',
				common: {
					name: 'object_type',
					type: 'number',
					unit: '',
					role: '',
					read: true,
					write: false
				},
				native: {}
			});
			adapter.setState(objPath + ".object_type",    {val: obj.object_type, ack: true});


			// Datenpunkt Objekt?
			switch(obj.object_identifier.object_type) 
			{
				case 0:   //Type: "analog_input"           , Id:   0},
				case 1:   //Type: "analog_output"          , Id:   1},
				case 2:   //Type: "analog_value"           , Id:   2},
				case 3:   //Type: "binary_input"           , Id:   3},
				case 4:   //Type: "binary_output"          , Id:   4},
				case 5:   //Type: "binary_value"           , Id:   5},
				case 13:  //Type: "multistate_input"       , Id:  13},
				case 14:  //Type: "multistate_output"      , Id:  14},
				case 19:  //Type: "multistate_value"       , Id:  19},
					adapter.setObject(objPath + ".event_state", {
						type: 'state',
						common: {
							name: 'event_state',
							type: 'string',
							unit: '',
							role: 'state',
							read: true,
							write: false
						},
						native: {}
					});
					adapter.setObject(objPath + ".out_of_service", {
						type: 'state',
						common: {
							name: 'out_of_service',
							type: 'boolean',
							unit: '',
							role: 'state',
							read: true,
							write: true
						},
						native: {}
					});
					break;
				default:
					break;
			}

			// Spezifische ERweiterung der Datenpunkt Objekt?
			switch(obj.object_identifier.object_type) 
			{
				case 0:   //Type: "analog_input"           , Id:   0},
					adapter.setObject(objPath + ".low_limit", {
						type: 'state',
						common: {
							name: 'low_limit',
							type: 'number',
							unit: '',
							role: 'range',
							read: true,
							write: true
						},
						native: {}
					});
					adapter.setObject(objPath + ".high_limit", {
						type: 'state',
						common: {
							name: 'high_limit',
							type: 'number',
							unit: '',
							role: 'range',
							read: true,
							write: true
						},
						native: {}
					});
					//-- FALLTHRU --//
				case 1:   //Type: "analog_output"          , Id:   1},
					adapter.setObject(objPath + ".reliability", {
						type: 'state',
						common: {
							name: 'reliability',
							type: 'string',
							unit: '',
							role: 'state',
							read: true,
							write: true
						},
						native: {}
					});
					//-- FALLTHRU --//
				case 2:   //Type: "analog_value"           , Id:   2},
					adapter.setObject(objPath + ".present_value", {
						type: 'state',
						common: {
							name: 'present_value',
							type: 'number',
							unit: '',
							role: 'state',
							unit: '°C',
							read: true,
							write: true
						},
						native: {}
					});
					break;

				case 3:   //Type: "binary_input"           , Id:   3},
				case 4:   //Type: "binary_output"          , Id:   4},
					adapter.setObject(objPath + ".reliability", {
						type: 'state',
						common: {
							name: 'reliability',
							type: 'string',
							unit: '',
							role: 'state',
							read: true,
							write: true
						},
						native: {}
					});
					//-- FALLTHRU --//
				case 5:   //Type: "binary_value"           , Id:   5},
					adapter.setObject(objPath + ".present_value", {
						type: 'state',
						common: {
							name: 'present_value',
							type: 'boolean',
							unit: '',
							role: 'state',
							read: true,
							write: true
						},
						native: {}
					});
					break;

				case 13:  //Type: "multistate_input"       , Id:  13},
				case 14:  //Type: "multistate_output"      , Id:  14},
				case 19:  //Type: "multistate_value"       , Id:  19},
					adapter.setObject(objPath + ".present_value", {
						type: 'state',
						common: {
							name: 'present_value',
							type: 'number',
							unit: '',
							role: 'state',
							read: true,
							write: true
						},
						native: {}
					});
					break;
				default:
					break;
			}
		});
	}
	
	// Lese die dynamischen Daten
	getDynamicObjData();
}


function getDynamicObjData() 
{
	let timeout = adapter.config.pollingInterval * 2;
	let readObjList  = __dirname + "/exec/bacrpm " + adapter.config.deviceId + " ";

	adapter.log.info("Read the dynamic data from the bacnet objects");
//	adapter.log.info("getDynamicObjData " + JSON.stringify(objList));

	// Sicherheitscheck
	if (!objList)
	{
		adapter.log.error("no object list");
	}
	
	// Fuge alle statischen Daten in den Request ein
	for (var iObj in objList) 
	{
		switch(objList[iObj].object_type) 
		{
			case 0:   //Type: "analog_input"           , Id:   0},
				readObjList  = readObjList + objList[iObj].object_type + " "+ objList[iObj].instance + " 75,85,36,81,103,59,45 ";
				break;
		    case 1:   //Type: "analog_output"          , Id:   1},
				readObjList  = readObjList + objList[iObj].object_type + " "+ objList[iObj].instance + " 75,85,36,81,103 ";
				break;
		    case 2:   //Type: "analog_value"           , Id:   2},
				readObjList  = readObjList + objList[iObj].object_type + " "+ objList[iObj].instance + " 75,85,36,81 ";
				break;
		    case 3:   //Type: "binary_input"           , Id:   3},
				readObjList  = readObjList + objList[iObj].object_type + " "+ objList[iObj].instance + " 75,85,36,81,103 ";
				break;
		    case 4:   //Type: "binary_output"          , Id:   4},
				readObjList  = readObjList + objList[iObj].object_type + " "+ objList[iObj].instance + " 75,85,36,81,103 ";
				break;
		    case 5:   //Type: "binary_value"           , Id:   5},
				readObjList  = readObjList + objList[iObj].object_type + " "+ objList[iObj].instance + " 75,85,36,81 ";
				break;
		    case 13:  //Type: "multistate_input"       , Id:  13},
				readObjList  = readObjList + objList[iObj].object_type + " "+ objList[iObj].instance + " 75,85,36,81 ";
				break;
		    case 14:  //Type: "multistate_output"      , Id:  14},
				readObjList  = readObjList + objList[iObj].object_type + " "+ objList[iObj].instance + " 75,85,36,81 ";
				break;
		    case 19:  //Type: "multistate_value"       , Id:  19},
				readObjList  = readObjList + objList[iObj].object_type + " "+ objList[iObj].instance + " 75,85,36,81 ";
				break;
			default:
				;
		}
	}
	
	{
//		adapter.log.info("getDynamicObjData " + readObjList);
		
		exec(readObjList, function(err, stdout, stderr) 
		{
			if (err) 
			{
				adapter.log.error(err);
				adapter.setState("info.connection", {val: false, ack: true});
				return;
			}
			adapter.setState("info.connection", {val: true, ack: true});

//			adapter.log.info("TESTTESTTESTTEST getDynamicObjData STDOUT:" + stdout);
			// Convert string into JSON-Format
			stdout = bacstr2Json(stdout);

//			adapter.log.info("TESTTESTTESTTEST getDynamicObjData JSON:" + stdout);
			let jsonObjects = JSON.parse(stdout);
			if (!jsonObjects || (jsonObjects.objects.length <= 0))
			{
				adapter.log.error("error while reading object_list");
				adapter.setState("info.connection", {val: false, ack: true});
				return;			
			}
            
            let date = new Date();
            let options = { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'};
            let dateString = date.toLocaleString('de-de', options);
  //            let dateString = date.getDay() + "." + date.getMonth() + "." + date.getFullYear() + " "  +date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
            
            adapter.setState("info.lastPolling", {val: dateString, ack: true});
			
			// LAufe durch alle Objekt im Json-Object
			for (let iObj=0; iObj < jsonObjects.objects.length; iObj++)
			{
				let obj = jsonObjects.objects[iObj];
				let objPath = adapter.config.deviceId + "." + obj.object_identifier.object_type + "." + obj.object_identifier.instance;

//				adapter.log.info("TESTTESTTESTTEST " + objPath + " - " + JSON.stringify(obj));

//				                adapter.setState(ruName + ".RaumTemp", {val: jsonRU.RaumTemp, ack: true, expire: timeout});

//				adapter.log.info("OOOOOOOOOOOOOOOOOOOOOOOOOO obj.object_identifier.object_type=" + obj.object_identifier.object_type);
				
				// Datenpunkt Objekt?
				switch(obj.object_identifier.object_type) 
				{
					case 0:   //Type: "analog_input"           , Id:   0},
					case 1:   //Type: "analog_output"          , Id:   1},
					case 2:   //Type: "analog_value"           , Id:   2},
					case 13:  //Type: "multistate_input"       , Id:  13},
					case 14:  //Type: "multistate_output"      , Id:  14},
					case 19:  //Type: "multistate_value"       , Id:  19},
						adapter.setState(objPath + ".present_value", { val: Math.round(obj.present_value*100)/100, ack: true, expire: timeout});
						adapter.setState(objPath + ".event_state",    {val: obj.event_state, ack: true, expire: timeout});
						adapter.setState(objPath + ".out_of_service",   {val: obj.out_of_service, ack: true, expire: timeout});
						break; 
					case 3:   //Type: "binary_input"           , Id:   3},
					case 4:   //Type: "binary_output"          , Id:   4},
					case 5:   //Type: "binary_value"           , Id:   5},
						adapter.setState(objPath + ".present_value", { val: (obj.present_value == 1), ack: true, expire: timeout});
						adapter.setState(objPath + ".event_state",    {val: obj.event_state, ack: true, expire: timeout});
						adapter.setState(objPath + ".out_of_service",   {val: obj.out_of_service, ack: true, expire: timeout});
						break;
					default:
						break;
				}

				// Spezifische ERweiterung der Datenpunkt Objekt?
				switch(obj.object_identifier.object_type) 
				{
					case 0:   //Type: "analog_input"           , Id:   0},
						adapter.setState(objPath + ".low_limit",     { val: obj.low_limit, ack: true, expire: timeout});
						adapter.setState(objPath + ".high_limit",    { val: obj.high_limit, ack: true, expire: timeout});
						//-- FALLTHRU --//
					case 1:   //Type: "analog_output"          , Id:   1},
						adapter.setState(objPath + ".reliability",   { val: obj.reliability, ack: true, expire: timeout});
						break;
					case 2:   //Type: "analog_value"           , Id:   2},
						break;

					case 3:   //Type: "binary_input"           , Id:   3},
					case 4:   //Type: "binary_output"          , Id:   4},
						adapter.setState(objPath + ".reliability",   { val: obj.reliability, ack: true, expire: timeout});
						break;
					case 5:   //Type: "binary_value"           , Id:   5},
					case 13:  //Type: "multistate_input"       , Id:  13},
					case 14:  //Type: "multistate_output"      , Id:  14},
					case 19:  //Type: "multistate_value"       , Id:  19},
						break;
					default:
						;
				}
			}
		});
	}
}
