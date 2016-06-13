#!/usr/bin/env node

var AWS = require('aws-sdk'); 
AWS.config.loadFromPath('./config.json'); // get credentials
var s3 = new AWS.S3();
var fs = require('fs');
var Prowl = require('node-prowl');
var ProwlKey = require('./prowlKey.js');
var prowl = new Prowl(ProwlKey());
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
//			cmd.get(
//				'nmap -p 62078 192.168.0.2-254 | grep \'62078/tcp open\' | wc -l',
//				function(data) {
//					console.log("nmap results for '62078/tcp..' A.K.A is there an iphone in the house " + data);
//       				if(data > 0) {
//						sendPushNotification(data);
//					}	
//				}
//			);
			sendPushNotification(data);
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
