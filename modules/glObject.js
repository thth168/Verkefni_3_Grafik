class glObject {
    static FORWARD_VEC3 = vec3(0,0,1)
    static BACKWARD_VEC3 = vec3(0,0,-1)
    static LEFT_VEC3 = vec3(1,0,0)
    static RIGHT_VEC3 = vec3(-1,0,0)

    constructor(location, options) {
        this.length = 0;
        this.options = (options) ? options : {};
        this.center = vec3(0,0,0);
        this.rotation = vec3(0,0,0);
        this.offset = 0;
        this.image = (this.options.tex) ? this.options.tex : document.getElementById("texture");
        this.texture = configureTexture(this.image, program);

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

        gl.uniform1f(gl.getUniformLocation(program, "shininess"), (this.options.shininess) ? this.options.shininess : 2.0 );

        gl.bindTexture( gl.TEXTURE_2D, this.texture );
    }

    draw(modelView) {
        this.switchToBuffer();
        if(modelView) {
            var rotation = mult(rotateX(this.rotation[0]), mult(rotateY(this.rotation[1]),rotateZ(this.rotation[2])));
            gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mult(modelView, mult(rotation, translate(this.center)))) );
        }
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
        ], {"shininess": 40.0});
        this.animations = (name) => {
            switch (name) {
                case "jump":
                    return {"start": 1, "end": 9};
                default:
                    return {"start": 0, "end": 0};
            }
        };
        this.runningAnimation = [0,0];
        this.movementDirection = vec3(0,0,0);
    }

    startAnimation(name, direction, rotation) {
        if(this.runningAnimation[1] == 0){
            var animation = this.animations(name);
            this.runningAnimation = [animation.start-1, animation.end];
            this.movementDirection = direction;
            this.rotation = rotation;
        }
    }

    checkCollide(cars, logs) {
        var water = true;
        for (let i = 0; i < cars.carCenters.length; i++) {
            // if(i == 0) console.log(cars.carCenters[0]);
            if(Math.abs(cars.carCenters[i][2] + worldOffset[2]) <= 0.01 && Math.abs(cars.carCenters[i][0] + worldOffset[0]) < 1){
                alert("GameOver");
                worldOffset = vec3(0,0,0);
            }
            if(Math.abs(logs.logCenters[i][2] + worldOffset[2]) <= 0.01 && Math.abs(logs.logCenters[i][0] + worldOffset[0]) > 1){
                water = water & true;
            } else {
                water = false;
            }
        }
        if(water){
            alert("GameOver");
            worldOffset = vec3(0,0,0);
        }
    }

    animate() {
        if(this.runningAnimation[1] - this.runningAnimation[0] > 0){
            this.runningAnimation[0]++;
            this.offset = this.runningAnimation[0];
            worldOffset = add(worldOffset, mult(scalem(this.movementDirection), vec4(2/9,2/9,2/9,0)).slice(0,3));
        } else {
            this.runningAnimation = [0,0];
            this.offset = 0;
        }
    }

    draw(modelView) {
        super.draw(modelView);
    }
}

class Ground extends glObject {
    constructor() {
        super(["./models/plane.ply"], {"tex": document.getElementById("grassTexture")});
        this.road = new Road();
        this.water = new Water();
    }

    draw(modelView){
        super.draw(modelView);
        this.road.draw(modelView);
        this.water.draw(modelView);
    }
}

class Road extends glObject {
    constructor() {
        super(["./models/road.ply"], {"tex": document.getElementById("roadTexture")});
    }
}

class Car extends glObject {
    constructor() {
        super([ "./models/car_body.ply"], {"tex": document.getElementById("carTexture")});
        this.tires = new Tires();
        this.carCenters = [
            vec4(0,0,-2,0),
            vec4(0,0,-4,1),
            vec4(0,0,-6,2),
            vec4(0,0,-8,3),
            vec4(0,0,-10,4),
            vec4(6,0,-4,1)
        ];
        this.laneSpeeds = [
            -5/60,
            4/60,
            -3/60,
            2/60,
            -1/60
        ];
        this.speed = -5/60;
    }

    draw(modelView) {
        var transform = (modelView) ? modelView : mat4();
        for (let i = 0; i < this.carCenters.length; i++) {
            this.center = this.carCenters[i].slice(0,3);
            var laneIndex = this.carCenters[i][3];
            this.center = mult(translate(this.laneSpeeds[laneIndex], 0, 0), vec4(this.center,1)).slice(0,3);
            this.center[0] = (this.center[0] + 16 < 0 || this.center[0] - 16 > 0) ? -1 * this.center[0] : this.center[0];
            super.draw(transform);
            this.tires.draw(mult(transform, translate(this.center)));
            this.carCenters[i] = vec4(this.center, laneIndex);
        };
    }
}

class Tires extends glObject {
    constructor() {
        if(!!Tires.instance){
            return Tires.instance;
        }
        super(["./models/car_tire.ply"]);
        this.rotationOffset = 0;

        Tires.instance = this;
        return this;
    }

    draw(modelView){
        var transform = sign => mult(mult(modelView, translate(sign * 0.6,0.111,0)), rotateZ(-this.rotationOffset));
        super.draw(transform(1));
        super.draw(transform(-1));
        this.rotationOffset += 1;
    }
}

class Log extends glObject {
    constructor() {
        super(["./models/log.ply"], {"tex": document.getElementById("logTexture"), "shininess": 4.0});  
        this.center = vec3(0,0,-14);
        this.logCenters = [
            //Röð 1
            vec4(-15,0,-14, 0),
            vec4(-13,0,-14, 0),
            vec4(-11,0,-14, 0),

            vec4(-5,0,-14, 0),
            vec4(-3,0,-14, 0),
            vec4(-1,0,-14, 0),

            vec4(5,0,-14, 0),
            vec4(7,0,-14, 0),
            vec4(9,0,-14, 0),

            vec4(15,0,-14, 0),
            vec4(17,0,-14, 0),
            vec4(19,0,-14, 0),

            //Röð 2
            vec4(-15,0,-16, 1),
            vec4(-13,0,-16, 1),
            vec4(-11,0,-16, 1),

            vec4(-3,0,-16, 1),
            vec4(-1,0,-16, 1),
            vec4(1,0,-16, 1),

            vec4(9,0,-16, 1),
            vec4(11,0,-16, 1),
            vec4(13,0,-16, 1),

            //Röð 3
            vec4(-15,0,-18, 2),
            vec4(-13,0,-18, 2),
            vec4(-11,0,-18, 2),
            vec4(-9,0,-18, 2),
            vec4(-7,0,-18, 2),

            vec4(-1,0,-18, 2),
            vec4(1,0,-18, 2),
            vec4(3,0,-18, 2),
            vec4(5,0,-18, 2),
            vec4(7,0,-18, 2),
            
            vec4(11,0,-18, 2),
            vec4(13,0,-18, 2),
            vec4(15,0,-18, 2),
            vec4(17,0,-18, 2),
            vec4(19,0,-18, 2),

            //Röð 4
            vec4(-15,0,-20, 3),
            vec4(-13,0,-20, 3),

            vec4(-3,0,-20, 3),
            vec4(-1,0,-20, 3),

            vec4(7,0,-20, 3),
            vec4(9,0,-20, 3),

            vec4(17,0,-20, 3),
            vec4(19,0,-20, 3),

            //Röð 5
            vec4(-15,0,-22, 4),
            vec4(-13,0,-22, 4),
            vec4(-11,0,-22, 4),
            vec4(-9,0,-22, 4),
            
            vec4(-1,0,-22, 4),
            vec4(1,0,-22, 4),
            vec4(3,0,-22, 4),
            vec4(5,0,-22, 4),
                        
            vec4(13,0,-22, 4),
            vec4(15,0,-22, 4),
            vec4(17,0,-22, 4),
            vec4(19,0,-22, 4),
        ];
        this.laneSpeeds = [
            -2/60,
            4/60,
            3/60,
            -2/60,
            1/60
        ];
        this.bobOffset = 0;
    }

    draw(modelView) {
        for (let i = 0; i < this.logCenters.length; i++) {
            this.center = this.logCenters[i].slice(0,3);
            var laneIndex = this.logCenters[i][3];
            this.logCenters[i] = vec4(mult(translate(this.laneSpeeds[laneIndex], 0, 0), vec4(this.center)).slice(0,3),laneIndex);    
            if(this.logCenters[i][0] > 20) this.logCenters[i][0] = -20;
            else if(this.logCenters[i][0] < -20) this.logCenters[i][0] = 20;
            this.center = mult(translate(0,Math.sin(this.bobOffset/16) * 0.05, 0), vec4(this.center, 1)).slice(0,3);
            super.draw(modelView);
        }
        this.bobOffset+=1.0/this.logCenters.length;
    }
}

class Water extends glObject {
    constructor() {
        super(["./models/water.ply"], {"tex": document.getElementById("waterTexture"), "shininess": 40.0});
    }

    draw(modelView){
        super.draw(modelView);
        super.draw(mult(modelView ,  translate(-56, 0, 0)));
        this.center = mult(translate(0.05,0,0), vec4(this.center)).slice(0,3);
        this.center[0] = this.center[0] % 56;
    }
}

function configureTexture( image, program ) {
    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR );
    var anisotropyExtension = gl.getExtension("EXT_texture_filter_anisotropic");
    if( anisotropyExtension ) {
        var anisotropyMax = gl.getParameter(anisotropyExtension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameteri(gl.TEXTURE_2D, anisotropyExtension.TEXTURE_MAX_ANISOTROPY_EXT, anisotropyMax);
    }
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
    return texture;
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