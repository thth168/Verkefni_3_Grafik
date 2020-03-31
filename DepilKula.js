/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Kúla sem lituð er með Phong litun.  Hægt að snúa henni
//     með músinni og auka/minnka "glansleika" kúlunnar með hnöppum
//
//    Hjálmtýr Hafsteinsson, mars 2020
/////////////////////////////////////////////////////////////////
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

var zDist = 50.0;

var fovy = 4.0;
var near = 0.2;
var far = 200.0;

var frameDelta = 8;
var lastFrame;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 0.0, 0.6, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 20.0;

var ctm;
var ambientColor, diffuseColor, specularColor;
var program;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;

var eye = vec3(0.0, 0.0, 0.0);
var at = vec3(0.0, 0.3, -1.0);
var up = vec3(0.0, 1.0, 0.0);

var frogObject;
var groundObject;
var worldTransform;

function configureTexture( image, program ) {
    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR );
    var anisotropyExtension = gl.getExtension("EXT_texture_filter_anisotropic");
    if( anisotropyExtension ) {
        var anisotropyMax = gl.getParameter(anisotropyExtension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameteri(gl.TEXTURE_2D, anisotropyExtension.TEXTURE_MAX_ANISOTROPY_EXT, anisotropyMax);
    }
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.9, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    lastFrame = Date.now();

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    frogObject = new Object2([  "./models/frog_still.ply",
                                "./models/frog_jump-01.ply",
                                "./models/frog_jump-02.ply",
                                "./models/frog_jump-03.ply",
                                "./models/frog_jump-04.ply",
                                "./models/frog_jump-05.ply",
                                "./models/frog_jump-06.ply",
                                "./models/frog_jump-07.ply",
                                "./models/frog_jump-08.ply",
                                "./models/frog_jump-09.ply"
                            ],{
                                "default": {"start": 0, "end": 1},
                                "jump": {"start": 1, "end": 9}
                            },{"shininess": 20.0});
    groundObject = new Object1("./plane.ply");
    configureTexture(this.document.getElementById("texture"), program);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(uvArray), gl.STATIC_DRAW );
    
    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );

    projectionMatrix = perspective( fovy, 1.0, near, far );

    gl.uniform4fv( gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition) );
    // gl.uniform1f( gl.getUniformLocation(program, "shininess"), materialShininess );
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    //event listeners for mouse
    canvas.addEventListener("mousedown", function(e){
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
        e.preventDefault();         // Disable drag and drop
    } );

    canvas.addEventListener("mouseup", function(e){
        movement = false;
    } );

    canvas.addEventListener("mousemove", function(e){
        if(movement) {
    	      spinY = ( spinY + (-e.offsetX + origX) ) % 360;
            spinX = ( spinX + (-origY + e.offsetY) ) % 360;
            origX = e.offsetX;
            origY = e.offsetY;
        }
    } );

    // Event listener for mousewheel
    window.addEventListener("wheel", function(e){
         if( e.deltaY > 0.0 ) {
             zDist += 2;
         } else {
             zDist -= 2;
         }
    }  );

    window.addEventListener("keypress", function(e) {
        frogObject.startAnimation("jump", translate(0,0,2));
    });
    render();
}

class Object1 {
    constructor(location, options) {
        this.startIndex = pointsArray.length;

        var plyData = readFilePly(location);
        this.length = plyData.points.length;
        pointsArray.push(...plyData.points);
        normalsArray.push(...plyData.normals);
        uvArray.push(...plyData.uv)
        this.options = options;
        this.shiniLoc = gl.getUniformLocation(program, "shininess");
    }

    draw() {
        if(!this.options){
            gl.uniform1f( this.shiniLoc, 0.0);
        }
        else {
            if(this.options.shininess != null){
                gl.uniform1f( this.shiniLoc, this.options.shininess );
            }
        }
        gl.drawArrays( gl.TRIANGLES, this.startIndex, this.length );
    }
}

class Object2 {
    constructor(location, animation, options) {
        this.startIndex = pointsArray.length;
        this.length = 0;
        location.forEach(frame => {
            var plyData = readFilePly(frame);
            this.length = plyData.points.length;
            pointsArray.push(...plyData.points);
            normalsArray.push(...plyData.normals);
            uvArray.push(...plyData.uv)
        });
        this.options = options;
        this.shiniLoc = gl.getUniformLocation(program, "shininess");
        this.frame = 0;
        this.animation = animation;
        this.currentAnim = "default";
        this.center = vec4(0,0,0,1);
        this.transformation = mat4();
        this.targetCenter = vec4(0,0,0,1);
    }

    startAnimation(name, transformation) {
        this.currentAnim = name;
        this.frame = this.animation[name].start;
        if(transformation){
            this.targetCenter = mult(transformation, this.center);
        }
    }

    animate() {
        if(this.currentAnim != "default"){
            if(this.frame >= this.animation[this.currentAnim].end){
                this.frame = 0;
                this.currentAnim = "default";
                this.center = this.targetCenter;
                this.transformation = translate(this.center[0], this.center[1], this.center[2]);
            } else {
                this.frame += 1;
                var temp = mix(this.center, this.targetCenter, (this.frame - this.animation[this.currentAnim].start) / (this.animation[this.currentAnim].end - this.animation[this.currentAnim].start));
                this.transformation = translate(temp[0], temp[1], temp[2]);
            }
        }
    }

    draw() {
        if(!this.options){
            gl.uniform1f( this.shiniLoc, 0.0);
        }
        else {
            if(this.options.shininess != null){
                gl.uniform1f( this.shiniLoc, this.options.shininess );
            }
        }
        gl.drawArrays( gl.TRIANGLES, this.startIndex + this.length*(this.frame % 10), this.length );
        worldTransform = this.transformation;
    }
}

function readFilePly(s) {

    var data = loadFile(s);
    
    var textArray = data.split("\n");
    var vertexCount = parseInt(textArray.filter(s => s.includes("element vertex"))[0].split(" ").pop());
    var faceCount = parseInt(textArray.filter(s => s.includes("element face"))[0].split(" ").pop())
    var data = textArray.slice(textArray.findIndex(s => s.includes("end_header")) + 1);
    var vertexData = data.splice(0,vertexCount);
    var faceData = data.splice(0,faceCount);

    var vertices = [];
    var normalVectors = [];
    var uvVectors = [];

    vertexData.forEach(item => {
        var tempArr = item.split(" ");
        vertices.push(vec4(...[tempArr[0], tempArr[1], tempArr[2]].map(x => parseFloat(x)), 1));
        normalVectors.push(vec4(...[tempArr[3], tempArr[4], tempArr[5]].map(x => parseFloat(x)), 0));
        uvVectors.push(vec2(...[tempArr[6], tempArr[7]].map(x => parseFloat(x))));
    });

    var outVert = [];
    var outNorm = [];
    var outUV = [];

    faceData.forEach(item => {
        var tempArr = item.split(" ").map(x=> parseInt(x));
        outVert.push(vertices[tempArr[1]], vertices[tempArr[2]], vertices[tempArr[3]]);
        outNorm.push(normalVectors[tempArr[1]], normalVectors[tempArr[2]], normalVectors[tempArr[3]]);
        outUV.push(uvVectors[tempArr[1]], uvVectors[tempArr[2]], uvVectors[tempArr[3]]);
    });

    return {"points": outVert, "normals": outNorm, "uv": outUV}
}

function loadFile(file) {
    var data;
    if (typeof window === "undefined") {
        var fs = require("fs");
        data = fs.readFileSync(file) + "";
    } else {
        data = loadFileAJAX(file);
    }
    return data;
}

// Get a file as a string using  AJAX
function loadFileAJAX(name) {
    var xhr = new XMLHttpRequest(),
        okStatus = document.location.protocol === "file:" ? 0 : 200;
    var d = new Date();
    //We add the current date to avoid caching of request
    //Murder for development
    xhr.open("GET", name + "?" + d.toJSON(), false);
    xhr.send(null);
    return xhr.status == okStatus ? xhr.responseText : null;
}

function render() {

    if(Date.now() - lastFrame > frameDelta){
        frogObject.animate();
        lastFrame = Date.now();
    }
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelViewMatrix = lookAt( vec3(0, zDist, zDist), at, up );
    modelViewMatrix = mult( modelViewMatrix, rotateY( spinY ) );
    modelViewMatrix = mult( modelViewMatrix, rotateX( spinX ) );

    // normal matrix only really need if there is nonuniform scaling
    // it's here for generality but since there is
    // no scaling in this example we could just use modelView matrix in shaders
    normalMatrix = mat3(
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    );
    // To make it proper
    normalMatrix = inverse(transpose(normalMatrix))

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix) );
    
    frogObject.draw();
    modelViewMatrix = mult(modelViewMatrix, worldTransform);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    groundObject.draw();
    window.requestAnimFrame(render);
}
