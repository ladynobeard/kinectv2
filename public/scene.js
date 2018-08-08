var os = require('os');
var Kinect2 = require('kinect2');
var kinect = new Kinect2();
var canvas = null;
var DEPTHWIDTH = 0;
var DEPTHHEIGHT = 0;
var currentCamera = null;
var sendAllBodies = false;
var x = 0;
var y = 0;
var  img = null;  // Load the image
var X = 0.0;
var Y = 0.0;
var Z = 0.0;

// Key Tracking needs cleanup
var trackedBodyIndex = -1;
window.addEventListener('load', init);

function init() {
  canvas = document.getElementById('inputCanvas');
  context = canvas.getContext('2d');
  setImageData();
  chooseCamera();

}

function setup() {
  createCanvas(windowWidth, windowHeight)
  img = loadImage("assets/images/1.jpg");  // Load the image
  // console.log(`${windowWidth}, ${windowHeight}`)
  noStroke()
  DEPTHWIDTH = img.width;
  DEPTHHEIGHT = img.width;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}


function draw() {
  background(0);
  // Displays the image at point (0, height/2) at half size
  image(img, img.width/Z-X*100, img.height/Z-Y*100, img.width/Z, img.height/Z);

}

////////////////////////////////////////////////////////////////////////
//////////////////////////// Feed Choice //////////////////////////////
function chooseCamera() {
  var camera = "skeleton";
  if (currentCamera) {
    changeCameraState(currentCamera, 'stop');
    toggleFeedDiv(currentCamera, "none");
  }
  changeCameraState(camera, 'start');
  toggleFeedDiv(camera, "block");
  currentCamera = camera;
}

function toggleFeedDiv(camera, state) {
  var divId = "skeleton"+ "-div";
  var feedDiv = document.getElementById(divId);
}

function changeCameraState(camera, state) {
  var cameraCode = 'SkeletonTracking';
  var changeStateFunction;
  sendAllBodies = false;
  changeStateFunction = window[state + cameraCode];
  changeStateFunction();
}

////////////////////////////////////////////////////////////////////////
//////////////////////////// Kinect2 Frames ////////////////////////////
function startSkeletonTracking() {
  resetCanvas('depth');
  canvasState = 'depth';

  if(kinect.open()) {
    kinect.on('bodyFrame', function(bodyFrame){
      if(sendAllBodies) {
        sendToPeer('bodyFrame', bodyFrame);
        if (doRecord) {
          bodyFrame.record_startime = recordStartTime;
          bodyFrame.record_timestamp = Date.now() - recordStartTime;
          bodyChunks.push(bodyFrame);
        }
      }

      //skeletonContext.clearRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);
      var index = 0;
      bodyFrame.bodies.forEach(function(body){
        if(body.tracked && (index = getClosestBodyIndex(bodyFrame.bodies))) {
          //console.log("???:"+index+"?????"+getClosestBodyIndex(bodyFrame.bodies));
          drawSkeleton(body, index);
        }
        index++;
      });
    });
    kinect.openBodyReader();
      }
}

function stopSkeletonTracking() {
  kinect.closeBodyReader();
  kinect.removeAllListeners();
  canvasState = null;
}

function setImageData() {
  imageData = context.createImageData(canvas.width, canvas.height);
  imageDataSize = imageData.data.length;
  imageDataArray = imageData.data;
}

function resetCanvas(size) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  //outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  canvas.width = DEPTHWIDTH;
  canvas.height = DEPTHHEIGHT;
}

function getClosestBodyIndex(bodies) {
  var closestZ = Number.MAX_VALUE;
  var closestBodyIndex = -1;
  for(var i = 0; i < bodies.length; i++) {
    if(bodies[i].tracked && bodies[i].joints[Kinect2.JointType.spineMid].cameraZ < closestZ) {
      closestZ = bodies[i].joints[Kinect2.JointType.spineMid].cameraZ;
      closestBodyIndex = i;
    }
  }
  return closestBodyIndex;
}

function calculateLength(joints) {
  var length = 0;
  var numJoints = joints.length;
  for(var i = 1; i < numJoints; i++) {
    length += Math.sqrt(Math.pow(joints[i].colorX - joints[i-1].colorX, 2) + Math.pow(joints[i].colorY - joints[i-1].colorY, 2));
  }
  return length;
}

function calculatePixelWidth(horizontalFieldOfView, depth) {
  // measure the size of the pixel
  var hFov = horizontalFieldOfView / 2;
  var numPixels = canvas.width / 2;
  var T = Math.tan((Math.PI * 180) / hFov);
  var pixelWidth = T * depth;
  return pixelWidth / numPixels;
}

function drawSkeleton(body, index) {
  // Skeleton variables
  var colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];
  //draw joints
  //for(var jointType in body.joints) {
  var jointType = 3;
  var joint = body.joints[jointType];
  //inContext.fillRect(joint.depthX * inCanvas.width, joint.depthY * inCanvas.height, 20, 20);
  console.log("X:"+parseInt(joint.cameraX*100)/100+" ,Y:"+parseInt(joint.cameraY*100)/100+" ,Z:"+parseInt(joint.cameraZ*100)/100)
  X = parseInt(joint.cameraX*100)/100;
  Y = parseInt(joint.cameraY*100)/100;
  Z = parseInt(joint.cameraZ*100)/100;
  //draw hand states
  //updateHandState(inContext, body.leftHandState, body.joints[Kinect2.JointType.handLeft]);
  //updateHandState(inContext, body.rightHandState, body.joints[Kinect2.JointType.handRight]);
}

function updateHandState(context, handState, jointPoint) {
  var HANDCLOSEDCOLOR = 'red';
  var HANDOPENCOLOR = 'green';
  var HANDLASSOCOLOR = 'blue';

  switch (handState) {
    case Kinect2.HandState.closed:
      drawHand(context, jointPoint, HANDCLOSEDCOLOR);
    break;

    case Kinect2.HandState.open:
      drawHand(context, jointPoint, HANDOPENCOLOR);
    break;

    case Kinect2.HandState.lasso:
      drawHand(context, jointPoint, HANDLASSOCOLOR);
    break;
  }
}

function drawHand(context, jointPoint, handColor) {
  var HANDSIZE = 20;
  // draw semi transparent hand cicles
  var handData = {depthX: jointPoint.depthX, depthY: jointPoint.depthY, handColor: handColor, handSize: HANDSIZE};
  //sendToPeer('drawHand', handData);
  context.globalAlpha = 0.75;
  context.beginPath();
  context.fillStyle = handColor;
  context.arc(jointPoint.depthX * 512, jointPoint.depthY * 424, HANDSIZE, 0, Math.PI * 2, true);
  context.fill();
  context.closePath();
  context.globalAlpha = 1;
}
