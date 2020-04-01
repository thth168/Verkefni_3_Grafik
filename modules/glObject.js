class glObject {
    constructor(location, options) {
        this.length = 0;
        this.options = options;
        this.center = vec4(0,0,0,1);
        this.offset = 0;

        var vertexArray = [];
        var normalsArray = [];
        var uvArray = [];
        location.forEach(model => {
            var plyData = readFilePly(model);
            this.length = plyData.points.length;
            // vertexArray.push(...plyData.points.reduce((arr, element, i) => arr.concat(element, plyData.normals[i], plyData.uv[i]), []));
            vertexArray.push(...plyData.points);
            normalsArray.push(...plyData.normals);
            uvArray.push(...plyData.uv);
        });

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(vertexArray), gl.STATIC_DRAW );

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
        
        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(uvArray), gl.STATIC_DRAW );
    }

    switchToBuffer() {
        
        gl.bindBuffer( gl.ARRAY_BUFFER, this.normalBuffer);
        var vNormal = gl.getAttribLocation( program, "vNormal" );
        gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vNormal);
        
        gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer);
        var vPosition = gl.getAttribLocation( program, "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray(vPosition);
        
        gl.bindBuffer( gl.ARRAY_BUFFER, this.uvBuffer);
        var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
        gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vTexCoord );
    }

    draw() {
        this.switchToBuffer();
        gl.drawArrays( gl.TRIANGLES, this.length * this.offset, this.length );
    }
}

class Frog extends glObject {
    constructor() {
        super([
            "./models/frog_still.ply",
            "./models/frog_jump-01.ply",
            "./models/frog_jump-02.ply",
            "./models/frog_jump-03.ply",
            "./models/frog_jump-04.ply",
            "./models/frog_jump-05.ply",
            "./models/frog_jump-06.ply",
            "./models/frog_jump-07.ply",
            "./models/frog_jump-08.ply",
            "./models/frog_jump-09.ply"
        ]);
        this.animations = (name) => {
            switch (name) {
                case "jump":
                    return {"start": 1, "end": 9};
                default:
                    return {"start": 0, "end": 0};
            }
        };
        this.runningAnimation = [0,0];
    }

    startAnimation(name) {
        var animation = this.animations(name);
        this.runningAnimation = [animation.start-1, animation.end];
    }

    animate() {
        if(this.runningAnimation[1] - this.runningAnimation[0] > 0){
            this.runningAnimation[0]++;
            this.offset = this.runningAnimation[0];
            worldOffset = add(worldOffset, vec3(0,0,2/9.0));
        } else {
            this.runningAnimation = [0,0];
            this.offset = 0;
        }
    }

    draw() {
        super.draw();
    }
}

class Ground extends glObject {
    constructor() {
        super(["./models/plane.ply"]);
    }
}

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