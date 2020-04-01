var canvas;
var gl;

var pointsArray = [];
var normalsArray = [];
var uvArray = [];

var movement = false;     // Do we rotate?
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var zDist = 5.0;

var fovy = 45.0;
var near = 0.2;
var far = 200.0;

var frameDelta = 8;
var lastFrame;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var program;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;

var eye = vec3(0.0, 0.0, 0.0);
var at = vec3(0.0, 0.3, -4.0);
var up = vec3(0.0, 1.0, 0.0);

var groundObject;
var frogObject;
var worldOffset = vec3(0,0,0);