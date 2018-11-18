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
 *          "version":      "0.0.0",                    // use "Semantic Versioning"! see http://semver.org/
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
		
		
/*		
		let value = state.val;
		let devAddrDevicelId =  id.split(".").slice(0,-1).join(".") + ".DevAddress";
		let dev = id.split(".").slice(2,3);
		let ru = id.split(".").slice(3,4);
		let valType = id.split(".").slice(4);
		let devAddr;

		// Suche das Device im Json-Object
		for (var iDevJson = 0; iDevJson < jsonObjects.NumberOfDevices ; iDevJson++)
		{
			// Setze das JSON-Device Objekt
			var jsonDev = jsonObjects.Devices[iDevJson];

			if (jsonDev.Id == dev) 
			{
				// Suche die RU im Json-Device-Object
				for (var iRUJson = 0; iRUJson < jsonDev.NumberOfRoomUnits ; iRUJson++)
				{
					// Setze das JSON-Device Objekt
					var jsonRU = jsonDev.RoomUnits[iRUJson];

					if (jsonRU.Id == ru) 
					{
						devAddr = jsonRU.DevAddress;
					}
					break;
				}
				break;
			}
		}
		
        adapter.log.info('Value changed by user! (ID:' + id + "  VAL:" + state.val +  "  Addr:" + devAddr + ")");

		// Was wurde geaendert?
		if (valType == "SollTemp")
		{
			// Ist der Wert ausserhalb des gütligen Bereich (5-30)?
			value = Math.min(Math.max(5,value), 30);

			// Der Wert wird in Hunderstelgrad geschrieben
			value = (Math.round(value * 10) * 10);
		}
		else if (valType == "OPMode")
		{
			// Ist der Wert ausserhalb des gütligen Bereich (0-2)?
			value = Math.min(Math.max(0,value), 2);
		}
		else if (valType == "WeekProg")
		{
			// Ist der Wert ausserhalb des gütligen Bereich (0-3)?
			value = Math.min(Math.max(0,value), 3);
		}
		else 
		{
			adapter.log.error('Value \'' + valType + '\' not writable');
			return;
		}

		adapter.log.info("Value changed to " + value + " Addr " + devAddr + '.' + valType);
		writeValue(devAddr + '.' + valType, value); 
		
		getData();
		*/
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
    adapter.log.info("ROTH-Bacnet: START ADAPTER data:", adapter.common);
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
	/*
    var devName;
    var ruName;
    var propName;
	let pollingInterval;

    adapter.log.info("ROTH-Bacnet: createElements");
    for (var dev in devices) {
        devName = dev;
        adapter.log.info("ROTH-Bacnet: create Device Id=" + devName);
        adapter.setObject(devName, devices[dev]);

        for (var ru in devices[dev].roomUnits) {
            ruName = devName + "." + ru;
            adapter.log.info("ROTH-Bacnet: create RoomUnit Id=" + ruName);
            adapter.setObject(ruName, devices[dev].roomUnits[ru]);

            for (var prop in deviceProperty) {
                propName = ruName + "." + prop;
//                console.log("ROTH-Bacnet: create Property Id=" + propName);
                adapter.setObject(propName, deviceProperty[prop]);
            }
        }
    }
*/    
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

        let jsonObjects = JSON.parse(stdout);
		if (!jsonObjects || (!jsonObjects.objects[0].object_list) || (jsonObjects.objects[0].object_list.length <= 0))
		{
			adapter.log.error("error while reading object_list");
			adapter.setState("info.connection", {val: false, ack: true});
			return;			
		}
		
		let objPath = jsonObjects.objects[0].object_identifier.instance;
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
	adapter.log.info("getStaticObjData ");

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
					type: 'string',
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

//	adapter.log.info("getDynamicObjData " + objList);

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
//		adapter.log.info("getStaticObjData " + readObjList);
		
		exec(readObjList, function(err, stdout, stderr) 
		{
			if (err) 
			{
				adapter.log.error(err);
				adapter.setState("info.connection", {val: false, ack: true});
				return;
			}
			adapter.setState("info.connection", {val: true, ack: true});

			// adapter.log.info("TESTTESTTESTTEST " + stdout);
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

//				adapter.log.info("TESTTESTTESTTEST " + objPath + " - " + obj);

//				                adapter.setState(ruName + ".RaumTemp", {val: jsonRU.RaumTemp, ack: true, expire: timeout});

//	adapter.log.info("OOOOOOOOOOOOOOOOOOOOOOOOOO obj.object_identifier.object_type=", obj.object_identifier.object_type);
				
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
						adapter.setState(objPath + ".present_value", { val: Math.round(obj.present_value*100)/100, ack: true, expire: timeout});
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



/*
// Schreibe einen neuen Wert zum Bacnet
// value=`curl -s -k  -X 'GET' -H 'User-Agent: SpiderControl/1.0 (iniNet-Solutions GmbH)'  "http://$ROTHIP/cgi-bin/writeVal.cgi?$1=$2"`
//                                                                                          http://192.168.10.221/cgi-bin/writeVal.cgi?G0.SollTemp=2000
function writeValue(addr, value) 
{
	var request = new XMLHttpRequest();
	var url = 'http://' + adapter.config.ipAddress + '/cgi-bin/writeVal.cgi?' + addr + '=' + value;

	request.open("GET", url);
	request.setRequestHeader('User-Agent','SpiderControl/1.0 (iniNet-Solutions GmbH)');
	request.addEventListener('load', function(event) {
	if (request.status >= 200 && request.status < 300) 
	{
	  adapter.log.info(request.responseText);
	}
	else 
	{
	  adapter.log.error(request.statusText, request.responseText);
	}
	});
	request.send();
	adapter.log.info("url:"+ url);
}




*/