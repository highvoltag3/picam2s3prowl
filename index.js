#!/usr/bin/env node

var AWS = require('aws-sdk'); 
var appPath = "/opt/picam_s3_and_prowl/"; //path to the folder containing index.js
AWS.config.loadFromPath(appPath + 'config.json'); // get credentials
var s3 = new AWS.S3();
var fs = require('fs');
var Prowl = require('node-prowl');
var prowlKey = require(appPath + 'prowlKey.js');
var prowl = new Prowl(prowlKey);
var cmd = require('node-cmd');

exports.handler = function(event) {
 	console.log('Received event:', JSON.stringify(event, null, 2));

	var filepath = process.argv[2];
	var filename = filepath.replace("/mnt/camshare/Cam1/", "");
	var body = fs.createReadStream(filepath);
	var s3obj = new AWS.S3({
		params: { Bucket: 'picam-s3', Key: filename } 
	});

	var sendPushNotification = function(data){
		console.log("Sending notification to Prowl");

		var isJPG = function() { return filename.split('.').pop() === "jpg" ? true : false };	
		var priority = isJPG ? -2 : 2;		
	
		prowl.push('Movement has been detected and the file sent to S3!', 'PiCam Home', {
		    priority: priority,
		    url: data.Location
		}, function( err, remaining ){
		    if( err ) {
		    	console.log(err);
		    	fs.appendFile('/tmp/motion_msgs.log', '\n Prowl notification sent! \n', function (err) {
				console.log(err);
			});
		    	throw err;
		    }
		    console.log( 'I have ' + remaining + ' calls to the api during current hour. BOOM!' );
		});
		
		fs.appendFile('/tmp/motion_msgs.log', '\n Sending notification to Prowl \n', function (err) {
			console.log(err);
		});
	}

	s3obj.upload({Body: body})
	.on('httpUploadProgress', function(evt) { 
		console.log(evt); 
		fs.appendFile('/tmp/motion_msgs.log', JSON.stringify(evt), function (err){
			console.log(err);
		});
  	})
  	.send(function(err, data) { 
  		if(!err){
			cmd.get(
				'hcitool name DC:2B:2A:34:CA:BF', //use the mac address of your phone, you will need to pair it and trust it first see: http://askubuntu.com/questions/294736/run-a-shell-script-as-another-user-that-has-no-password
				function(cmdData) {
					console.log(cmdData);
					//if the text returned by the command has a length that means the phone is within range so we wont send a notification
       					if(!cmdData.length > 0) {
						sendPushNotification(data);
					}	
					fs.appendFile('/tmp/motion_msgs.log', "Results from hcitool: " + cmdData, function (err){
                                                console.log(err);
                                        });
				}
			);
			//sendPushNotification(data);
			//We've uploaded the video so lets delete it now, we don't need it in S3 and locally
    			cmd.run('rm -f' + filepath);
  		} else {
			fs.appendFile('/tmp/motion_msgs.log', 'Error while sending data: ' + err + "\n" + JSON.stringify(data), function (err) {
                       		console.log(err);
                	});
  			console.log(err, JSON.stringify(data) );
		}
  	});
} //!handler fn

exports.handler('', process.argv, '');
