///////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Kúla sem lituð er með Phong litun.  Hægt að snúa henni
//     með músinni og auka/minnka "glansleika" kúlunnar með hnöppum
//
//    Hjálmtýr Hafsteinsson, mars 2020
/////////////////////////////////////////////////////////////////

window.onload = function init() {

    canvas = document.getElementById("gl-canvas");
    liveImages = document.getElementById("lives").children;
    if (window.localStorage.getItem("HighScore") == null) window.localStorage.setItem("HighScore", 0);

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 1.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    lastFrame = Date.now();

    groundObject = new Ground();
    frogObject = new Frog();
    carObject = new Car();
    logObject = new Log();
    // configureTexture(this.document.getElementById("texture"), program);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

    projectionMatrix = perspective(fovy, 1.0, near, far);

    gl.uniform4fv(gl.getUniformLocation(program, "lightAmbient"), flatten(lightAmbient));
    gl.uniform4fv(gl.getUniformLocation(program, "lightDiffuse"), flatten(lightDiffuse));
    gl.uniform4fv(gl.getUniformLocation(program, "lightSpecular"), flatten(lightSpecular));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // // event listeners for mouse
    // canvas.addEventListener("mousedown", function (e) {
    //     movement = true;
    //     origX = e.offsetX;
    //     origY = e.offsetY;
    //     e.preventDefault();         // Disable drag and drop
    // });

    // canvas.addEventListener("mouseup", function (e) {
    //     movement = false;
    // });

    // canvas.addEventListener("mousemove", function (e) {
    //     if (movement) {
    //         spinY = (spinY + (-e.offsetX + origX)) % 360;
    //         spinX = (spinX + (-origY + e.offsetY)) % 360;
    //         origX = e.offsetX;
    //         origY = e.offsetY;
    //     }
    // });

    // Event listener for mousewheel
    window.addEventListener("wheel", function (e) {
        if (e.deltaY > 0.0) {
            zDist += 1;
        } else {
            zDist -= 1;
        }
        if (zDist < 3) zDist = 3;
        if (zDist > 11) zDist = 11;
    });

    window.addEventListener("keypress", function (e) {
        switch (e.key) {
            case 'w':
                frogObject.startAnimation("jump", frogObject.FORWARD_VEC3, vec3(0, 0, 0));
                break;
            case 's':
                frogObject.startAnimation("jump", frogObject.BACKWARD_VEC3, vec3(0, 180, 0));
                break;
            case 'a':
                frogObject.startAnimation("jump", frogObject.LEFT_VEC3, vec3(0, -90, 0));
                break;
            case 'd':
                frogObject.startAnimation("jump", frogObject.RIGHT_VEC3, vec3(0, 90, 0));
                break;
        }
    });
    render();
}


function render() {

    if (Date.now() - lastFrame > frameDelta) {
        // trackFPS();
        frogObject.animate();
        lastFrame = Date.now();
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelViewMatrix = lookAt(vec3(0, zDist / 2, zDist), at, up);
    modelViewMatrix = mult(modelViewMatrix, rotateY(spinY));
    modelViewMatrix = mult(modelViewMatrix, rotateX(spinX));

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

    // gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));

    frogObject.checkCollide(carObject, logObject);
    frogObject.draw(modelViewMatrix);

    modelViewMatrix = mult(modelViewMatrix, translate(worldOffset));
    groundObject.draw(modelViewMatrix);
    carObject.draw(modelViewMatrix);
    logObject.draw(modelViewMatrix);
    window.requestAnimFrame(render);
    document.getElementById("currScore").innerHTML = ("00000" + frogObject.points).slice(-5);
    document.getElementById("hiScore").innerHTML = ("00000" + window.localStorage.getItem("HighScore")).slice(-5);
    for (let i = 0; i < 3; i++) {
        if (i < frogObject.lives) {
            liveImages[i].hidden = false;
        } else {
            liveImages[i].hidden = true;
        }
    }
}

var FPSCounter = 0;
var TimeTracker = 0;
function trackFPS() {
    if (FPSCounter % 100 == 0) {
        console.clear();
        console.log("FPS: " + 1000 / (TimeTracker / 100));
        TimeTracker = 0;
    }
    FPSCounter++;
    TimeTracker += (Date.now() - lastFrame);
}
