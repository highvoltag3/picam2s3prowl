var AWS = require('aws-sdk'); 
var s3 = new AWS.S3();
var fs = require('fs');
var Prowl = require('node-prowl');
var prowl = new Prowl('ce7e8d2a72cd6ebac51636de2e521a688c8d1a21');

exports.handler = function(event) {
  console.log('Received event:', JSON.stringify(event, null, 2));

	var filepath = process.argv[2];
	var filename = filepath.replace("/mnt/camshare/Cam1/", "");
	var body = fs.createReadStream(filepath);
	var s3obj = new AWS.S3({
		params: { Bucket: 'picam-s3', Key: filename} 
	});
	
	var sendPushNotification = function(data){
		console.log("Sending notification to Prowl");
		
		prowl.push('A new file is being sent to s3!', 'PiCam Home', {
		    priority: 2,
		    url: data.Location
		}, function( err, remaining ){
		    if( err ) {
		    console.log(err);
		    fs.appendFile('/tmp/motion.log', '\n Prowl notification sent! \n', function (err) {
						console.log(err);
						
					});
		    	throw err;
		    	
		    }
		    console.log( 'I have ' + remaining + ' calls to the api during current hour. BOOM!' );
		});
		
		fs.appendFile('/tmp/motion.log', '\n Sending notification to Prowl \n', function (err) {
		console.log(err);
		
		});
	}

	s3obj.upload({Body: body}).
	on('httpUploadProgress', function(evt) { 
		console.log(evt); 
		fs.appendFile('/tmp/motion.log', JSON.stringify(evt), function (err){
		console.log(err);
		
		});
  })
  .send(function(err, data) { 
  	if(!err){
  		sendPushNotification(data);
  		
  	}
  	console.log(err, JSON.stringify(data) );
  });
}

exports.handler('', process.argv, '');