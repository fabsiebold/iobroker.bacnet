'use strict';

//const fs : require('fs');
//const path : require('path');

var BACnetObjType =
[
   // ADD_DB_OBJECT (Suchstring fuer das Einfuegen neuer Objekte)
   // neuen Objekt-Typ einfuegen
   {Type: "unknown"                , Id:  -1},
   {Type: "analog_input"           , Id:   0},
   {Type: "analog_output"          , Id:   1},
   {Type: "analog_value"           , Id:   2},
   {Type: "binary_input"           , Id:   3},
   {Type: "binary_output"          , Id:   4},
   {Type: "binary_value"           , Id:   5},
   {Type: "calendar"               , Id:   6},
   {Type: "command"                , Id:   7},
   {Type: "device"                 , Id:   8},
   {Type: "event_enrollment"       , Id:   9},
   {Type: "file"                   , Id:  10},
   {Type: "group"                  , Id:  11},
   {Type: "loop"                   , Id:  12},
   {Type: "multistate_input"       , Id:  13},
   {Type: "multistate_output"      , Id:  14},
   {Type: "notification_class"     , Id:  15},
   {Type: "program"                , Id:  16},
   {Type: "schedule"               , Id:  17},
   {Type: "averaging"              , Id:  18},
   {Type: "multistate_value"       , Id:  19},
   {Type: "trend_log"              , Id:  20},
   {Type: "life_safety_point"      , Id:  21},
   {Type: "life_safety_zone"       , Id:  22},
   {Type: "accumulator"            , Id:  23},
   {Type: "pulse_converter"        , Id:  24},
   {Type: "event_log"              , Id:  25},
   {Type: "global_group"           , Id:  26},
   {Type: "trend_log_multiple"     , Id:  27},
   {Type: "load_control"           , Id:  28},
   {Type: "structured_view"        , Id:  29},
   {Type: "access_door"            , Id:  30},
   {Type: "unknown_31"             , Id:  31},
   {Type: "access_credential"      , Id:  32},
   {Type: "access_point"           , Id:  33},
   {Type: "access_rights"          , Id:  34},
   {Type: "access_user"            , Id:  35},
   {Type: "access_zone"            , Id:  36},
   {Type: "credential_data_input"  , Id:  37},
   {Type: "network_security"       , Id:  38},
   {Type: "bitstring_value"        , Id:  39},
   {Type: "characterstring_value"  , Id:  40},
   {Type: "date_pattern_value"     , Id:  41},
   {Type: "date_value"             , Id:  42},
   {Type: "datetime_pattern_value" , Id:  43},
   {Type: "datetime_value"         , Id:  44},
   {Type: "integer_value"          , Id:  45},
   {Type: "large_analog_value"     , Id:  46},
   {Type: "octetstring_value"      , Id:  47},
   {Type: "positive_integer_value" , Id:  48},
   {Type: "time_pattern_value"     , Id:  49},
   {Type: "time_value"             , Id:  50},
                                            
   {Type: "iounit"                 , Id: 384},  
   {Type: "dp_raw_value"           , Id: 385},  
   {Type: "log_view"               , Id: 386},
   {Type: "group_axis"             , Id: 387},
   {Type: "blind_output"           , Id: 388},
   {Type: "opt_h"                  , Id: 389},
   {Type: "lighting_output_simple" , Id: 390},
   {Type: "opt_c"                  , Id: 391},
   {Type: "blind_output2"          , Id: 392},
   {Type: "com_device"             , Id: 393}
];

/**
 * return the object-type string
 *
 * @alias objTypeGetById
 * @returns {object}
 */
function objTypeGetById(objTypeId) 
{
	for(var key in BACnetObjType)
	{
		if(BACnetObjType[key].Id == objTypeId)
			 return BACnetObjType[key].Type;
	}
	return BACnetObjType[0].Type;
}

/**
 * return the object-type Id
 *
 * @alias objTypeGetByStr
 * @returns {object}
 */
function objTypeGetByStr(objTypeStr) 
{
	for(var key in BACnetObjType)
	{
		if(BACnetObjType[key].Type == objTypeStr)
			 return BACnetObjType[key].Id;
	}
	return BACnetObjType[0].Id;
}



exports.BACnetObjType = BACnetObjType;
exports.objTypeGetById = objTypeGetById;
exports.objTypeGetByStr = objTypeGetByStr;
