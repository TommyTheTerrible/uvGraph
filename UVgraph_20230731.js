
import * as THREE from './threejs-uvgraph.js';
import './readTGA.js';

//import * as THREE from './threejs-uvgraph-bundle.js';

var canvas_size = 1.15;
var preview_size = 300;
var texture_size = 2048;

var link = document.createElement( 'a' );
link.style.display = 'none';
document.body.appendChild( link ); // Firefox workaround, see #6594
    
var container, clock, controls;
var camera, scene, renderer;
var mouse = new THREE.Vector2();

var blobloader = new THREE.FileLoader();
blobloader.setResponseType("blob");

var texture_planes = [];

var renderers = [];
var cameras = [];
var renderTargets = [];
var renderPasses = [];
var composers = [];

var conversionSet = [
    {"name": "SL UV to Wookiee Face and Ears", "output": ["Wookiee_Face", "Wookiee_Ears" ],"dae": "models/SLUV2WookieeFaceEars.dae", "materials": ["Head"], "template": ["images/SLUV_Head.jpg"], "cameras" : [0, 1], "reverse":false },
    {"name": "Wookiee Face and Ears to SL UV", "output": ["SLUV_Head"],"dae": "models/WookieeFaceEars2SLUV.dae", "materials": ["Head", "Ear"], "template": ["images/Wookiee_Face.png","images/Wookiee_Ears.png"], "cameras" : [0], "reverse":false},
    {"name": "SL UV to Wookiee Mouth, Eyes and Brow", "output": ["Wookiee_Mouth", "Wookiee_Eyes" ,"Wookiee_Brow"],"dae": "models/SLUV2WookieMakeup.dae", "materials": ["Head"], "template": ["images/SLUV_Head.jpg"], "cameras" : [0, 1, 2], "reverse":false },
    {"name": "SL UV to WahWah Mouth and Eyes", "output": ["Wahwah_Mouth", "Wahwah_Eyes" ],"dae": "models/SLUV2WahwahMakeup.dae", "materials": ["Head"], "template": ["images/SLUV_Head.jpg"], "cameras" : [0, 1], "reverse":false },
    {"name": "Smegacy Top, Bottom and Extra to SL UV Top and Bottom", "output": ["SLUV_Top", "SLUV_Bottom"], "dae": "models/Smegacy2SLUV.dae", "materials": ["Top", "Bottom", "Extra"], "template": ["images/SLUV_Head.jpg", "images/SLUV_Head.jpg", "images/SLUV_Head.jpg"], "cameras" : [0, 1], "reverse":false },
    {"name": "SL UV to Wookiee Mouth, Eyes and Brow", "output": ["SLUV_Head"],"dae": "models/SLUV2WookieMakeup.dae", "materials": ["Mouth", "Left Eye", "Brow"], "template": ["images/Wookiee_Mouth.png", "images/Wookiee_Eyes.png", "images/Wookiee_Brow.png" ], "cameras" : [0], "reverse":true },
    {"name": "SL UV to WahWah Mouth and Eyes", "output": ["SLUV_Head"],"dae": "models/SLUV2WahwahMakeup.dae", "materials": ["Mouth", "Eye"], "template": ["images/Wahwah_Mouth.png","images/Wahwah_Eyes.png"], "cameras" : [0], "reverse":true },    
];

var selectedConversion = document.getElementById('model').value;

var outputPrefix = "Render";
var outputDelimiter = ".";

var textureArray = new Array();
var materialArray = new Array();

var alphaPass = new THREE.ShaderPass( THREE.AlphaShader );				
alphaPass.uniforms[ "resolution" ].value = new THREE.Vector2( texture_size, texture_size );
alphaPass.uniforms[ "resolution" ].value.multiplyScalar( 1 );
alphaPass.uniforms[ "pixelSize" ].value = 1.0;

var object;

init();
animate();

function setupScene(){

    loadSet();

    const camRadius = 0.5;
    const camDistort = 1;

    cameras[0] = new THREE.OrthographicCamera( -(camRadius * camDistort), (camRadius * camDistort), -(camRadius * camDistort), (camRadius * camDistort), -10, 10 );
            
    cameras[0].position.x = 0.5;
    cameras[0].position.y = -1;
    cameras[0].position.z = -0.5;        
    cameras[0].lookAt(new THREE.Vector3(cameras[0].position.x, 0, cameras[0].position.z));
    cameras[0].zoom = 1.0;
    cameras[0].updateProjectionMatrix();
    
    cameras[1] = new THREE.OrthographicCamera( -(camRadius * camDistort), (camRadius * camDistort), -(camRadius * camDistort), (camRadius * camDistort), -10, 10 );
    
    cameras[1].position.x = 1.5;
    cameras[1].position.y = -1;
    cameras[1].position.z = -0.5;
    cameras[1].lookAt(new THREE.Vector3(cameras[1].position.x, 0, cameras[1].position.z));
    cameras[1].zoom = 1.0;
    cameras[1].updateProjectionMatrix();

    cameras[2] = new THREE.OrthographicCamera( -(camRadius * camDistort), (camRadius * camDistort), -(camRadius * camDistort), (camRadius * camDistort), -10, 10 );
    
    cameras[2].position.x = 2.5;
    cameras[2].position.y = -1;
    cameras[2].position.z = -0.5;
    cameras[2].lookAt(new THREE.Vector3(cameras[2].position.x, 0, cameras[2].position.z));
    cameras[2].zoom = 1.0;
    cameras[2].updateProjectionMatrix();

    // Texture Rendering Setup
    //      Loops through the cameras and sets up texture rendering processes.
    //      AlphaPass will draw nearest neighbor pixel into a pixel with only alpha,
    //      which helps fix some alignment issues sometimes. -Tommy

    composers = [];
    renderers = [];
    container.innerHTML = "";

    for (var c = 0; c < cameras.length; c++) {

        renderers[c] = new THREE.WebGLRenderer ( { preserveDrawingBuffer: true, alpha: true, antialias:false } );
        renderers[c].setPixelRatio( 1 );
        renderers[c].autoClear = false;
        renderers[c].setClearColor( 0xffffff, 0 );
        renderTargets[c] = new THREE.WebGLRenderTarget(renderers[c].domElement.width, renderers[c].domElement.height);
        renderers[c].setSize( texture_size, texture_size );
        renderers[c].domElement.id = "Renderer_" + c;
        renderers[c].domElement.name = conversionSet[selectedConversion].output[c];
        renderers[c].domElement.style = "display:none;";
        container.appendChild( renderers[c].domElement );

        renderPasses[c] = new THREE.RenderPass( scene, cameras[c] );
        //renderPasses[c].clearAlpha = false;

        composers[c] = new THREE.EffectComposer( renderers[c] );
        composers[c].addPass( renderPasses[c] );
            
        //composers[c].addPass( alphaPass );

    }
    
}

function clearScene(){
    //while(scene.children.length > 0){ 
    //   scene.remove(scene.children[0]); 
    //}    
    setupScene();
}

function resetPlaneDisplay(){    

    texture_planes.forEach((plane) => {
        plane.visible = false;
    });
    
}

function loadSet(){

    selectedConversion = document.getElementById('model').value;

    var loadingManager = new THREE.LoadingManager( function () {
        texture_planes[selectedConversion] = new THREE.Group();
        scene.add( texture_planes[selectedConversion] );
        texture_planes[selectedConversion].add(object);
        resetPlaneDisplay();
        texture_planes[selectedConversion].visible = true;
        setupCanvases(selectedConversion);        
    } );
    
    var reverseManager = new THREE.LoadingManager( function() {
        texture_planes[selectedConversion] = new THREE.Group();
        scene.add( texture_planes[selectedConversion] );
        object.traverse( function ( node ) {
            if ( node.type == "Mesh" ) {
              
                SwapUV2Pos(node.geometry, node.name);
     
            }					
        } );
        //texture_planes[selectedConversion].add(object);
        resetPlaneDisplay();
        texture_planes[selectedConversion].visible = true;
        setupCanvases(selectedConversion);
    });

    if(texture_planes[selectedConversion] == undefined) {

        if(conversionSet[selectedConversion].reverse){
            var revloader = new THREE.ColladaLoader( reverseManager );
            revloader.load( conversionSet[selectedConversion].dae, function ( collada ) {
                object = collada.scene;            
            } );
        } else {
            var loader = new THREE.ColladaLoader( loadingManager );
            loader.load( conversionSet[selectedConversion].dae, function ( collada ) {
                object = collada.scene;
            } );
        }
    } else {
        resetPlaneDisplay();
        texture_planes[selectedConversion].visible = true;
        setupCanvases(selectedConversion);
        renderTextures();
    }

    

}

function init() {

    container = document.getElementById( 'container' );    

    camera = new THREE.PerspectiveCamera( 10, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.set( 10, 1.5, 0 );
    camera.rotation.set(-1.5, 1.5, 1.5);
    
    scene = new THREE.Scene();

    scene.background = null;

    clock = new THREE.Clock();

    mouse = new THREE.Vector2();		

    renderer = new THREE.WebGLRenderer( { preserveDrawingBuffer: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth/canvas_size, window.innerHeight/canvas_size );
    container.appendChild( renderer.domElement );

    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.screenSpacePanning = true;
    controls.minDistance = 1;
    controls.maxDistance = 40;
    controls.target.set( 0, 0.75, 0 );
    controls.update();

    //stats = new THREE.Stats();
    //container.appendChild( stats.dom );

    //var ambientLight = new THREE.AmbientLight( 0xffffff );
    //scene.add( ambientLight );
    scene.add( camera );

    setupScene();
        
    window.addEventListener( 'resize', onWindowResize, false );

}

function DownloadCanvasAsImage(canvasID){
    let downloadLink = document.createElement('a');    
    let canvas = document.getElementById(canvasID);
    downloadLink.setAttribute('download', outputPrefix + "_" + canvas.name+'.png');    
    canvas.toBlob(function(blob) {
        let url = URL.createObjectURL(blob);
        downloadLink.setAttribute('href', url);
        downloadLink.click();
    });
}

function renderTextures(){

    let time = Date.now();
    //console.log("Rendering Textures "+time);

    for (var c = 0; c < composers.length; c++) {
                        
        composers[c].render();

        var previewCanvas = document.getElementById("output_canvas"+c);
        previewCanvas.width = preview_size;
        previewCanvas.height = preview_size;        
        var previewContext = previewCanvas.getContext('2d');
        previewContext.drawImage(renderers[c].domElement, 0,0, previewCanvas.width, previewCanvas.height);
    }

    //console.log("Scene info: ", scene, texture_planes, cameras);

}

function setMaterial(node, material, name) {
    //console.log("Setting Material", node, material, name);
    if(node.material && node.material.name == name){
        node.material = material;
        node.material.name = name;
        node.material.side = THREE.DoubleSide;
    } 
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        setMaterial(node.children[i], material, name);
      }
    }
  }


function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth/canvas_size, window.innerHeight/canvas_size );
                
}

function animate() {

    requestAnimationFrame( animate );

    render();
    //stats.update();

}

function render() {

    var delta = clock.getDelta();

    renderer.render( scene, camera );

}

function loadTexture(texture, name){
                    
    textureArray[name] = new THREE.TextureLoader().load( texture , renderTextures);
    textureArray[name].wrapS = textureArray[name].wrapT = THREE.RepeatWrapping;							
    textureArray[name].anisotropy = renderer.capabilities.getMaxAnisotropy();
    textureArray[name].minFilter = THREE.LinearFilter;
    textureArray[name].magFilter = THREE.NearestFilter;
    textureArray[name].generateMipmaps = false;
                
    materialArray[name] = new THREE.MeshBasicMaterial( { map: textureArray[name] } );
    //materialArray[name].combine = THREE.AddOperation;
    
    //materialArray[name].blending = THREE.NoBlending;

    //materialArray[name].blending = THREE.CustomBlending;
    //materialArray[name].blendEquation = THREE.AddEquation; // original
    //materialArray[name].blendEquation = THREE.MaxEquation;
    //materialArray[name].blendSrc = THREE.SrcAlphaSaturateFactor;
    //materialArray[name].blendSrc = THREE.SrcAlphaFactor;
    //materialArray[name].blendDst = THREE.SrcAlphaFactor;
    //materialArray[name].blendDst = THREE.ZeroFactor; // original
    materialArray[name].transparent = true;
    materialArray[name].side = THREE.DoubleSide;
        
    return materialArray[name];
}

function updateSourceTexture(image, index){
    let materialName = conversionSet[selectedConversion].materials[index];
    setMaterial(texture_planes[selectedConversion], loadTexture(image, materialName), conversionSet[selectedConversion].materials[index]);

}

function loadPicture(source, index){
    var direction = "canvas_input"+index;
    //console.log("Load Picture Direction", direction);
    var input_canvas = document.getElementById(direction);
    input_canvas.height = preview_size;
    input_canvas.width = preview_size;
    
    var input_image = new Image();
    input_image.onload = function () {
    
        var context = input_canvas.getContext('2d');
    
        context.drawImage(this, 0, 0, this.width, this.height, 
                        0,0, input_canvas.width, input_canvas.height);
        this.width = this.naturalWidth;
        this.height = this.naturalHeight;
    
        updateSourceTexture(input_image.src, index);    
    
    };

    input_image.src = source;

};

function readImage(imgFile, index, readImageCallback=false, name=""){
    let fileType = imgFile.type;
    if(imgFile.name.split('.').pop().toLowerCase() == "tga") {
        fileType = "image/targa";
    }


    if(!fileType.match(/image.*/)){
        console.log("The dropped file is not an image: ", fileType);
        return;
    }



    if(imgFile.name.length > 0) {        
        outputPrefix = imgFile.name.split(outputDelimiter)[0];
    } else {
        outputPrefix = "Render";
    }
    
    var reader = new FileReader();
    reader.onload = function(e){
        var data = e.target.result;
        if (fileType == "image/targa"){            
            var tga = new TGA();
            tga.load(new Uint8Array(data));
            data = tga.getDataURL('image/png');
        }
        if (readImageCallback != false) {
            readImageCallback(name);
        }
        loadPicture(data, index);  
    };
    if (fileType == "image/targa")
        reader.readAsArrayBuffer(imgFile);
    else
        reader.readAsDataURL(imgFile);
};

function handleFileSelect(evt) {

    var input_id = evt.target.id.charAt(evt.target.id.length-1);

    if (typeof evt !== 'undefined'){
        readImage(evt.target.files[0], input_id); // files is a FileList of File objects. List some properties.
    }
};

function hideInputs(){

    for (var i = 0; i < 4; i++) {
        document.getElementById('div_input'+i).style.display = "none";   
    }
}

function hideOutputs(){

    for (var i = 0; i < 4; i++) {
        document.getElementById('div_output'+i).style.display = "none";   
    }
}

function handleClickHold(element, timeout, callback) {
    let startTime;
    const mouseDown = () => (startTime = Date.now());
    const mouseUp = function(e){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        var input_id = element.id.charAt(e.toElement.id.length-1);
        if( startTime && Date.now() - startTime > timeout ) {
            callback(input_id);
        } else if(startTime > 0) {
            console.log("Input Clicked");
            startTime = false;
            document.getElementById("select_file_input"+input_id).click();
        }
    }
    element.addEventListener("mousedown", mouseDown);
    element.addEventListener("mouseup", mouseUp);
}

function clearInput(index){
    console.log("Input Canvas Cleared", index);
    loadPicture("images/transparent.png",index);
}

function setupCanvases(index){

    hideInputs();

    //setup input canvas    

    for (var i = 0; i < conversionSet[index].materials.length; i++) {

        document.getElementById('div_input'+i).style.display = "contents";
        document.getElementById('div_input'+i).children[0].style.backgroundImage  = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' height='100' width='100'><text x='50%' y='50%' fill='rgba(10,10,10,0.4)' dominant-baseline='middle' text-anchor='middle' font-family='Verdana, sans-serif'>" + conversionSet[index].materials[i].toUpperCase() + "</text></svg>\")";
        document.getElementById('select_file_input'+i).addEventListener('change', handleFileSelect, false);
        document.getElementById("canvas_input"+i).addEventListener("dragover", function(e) {e.preventDefault();}, true);
        document.getElementById("canvas_input"+i).addEventListener("drop", function(e){
            e.preventDefault();            
            //console.log("Dropped image", e.dataTransfer.files[0],e.toElement.id);
            var input_id = e.toElement.id.charAt(e.toElement.id.length-1);
            readImage(e.dataTransfer.files[0], input_id);	
        }, true);
        //handleClickHold(document.getElementById("canvas_input"+i), 500, clearInput);
        loadPicture(conversionSet[selectedConversion].template[i],i);
    }

    hideOutputs();  

    for (var i = 0; i < conversionSet[index].cameras.length; i++) {
        document.getElementById('div_output'+i).style.display = "contents";        
    }

}

function loadTemplates(){
    for (var i = 0; i < conversionSet[selectedConversion].template.length; i++) {
        loadPicture(conversionSet[selectedConversion].template[i],i);
    } 
}

function clearInputs(){
    for (var i = 0; i < conversionSet[selectedConversion].template.length; i++) {
        loadPicture("images/transparent.png",i);
    } 
}

function SwapUV2Pos( geometry , materialName, mirror = false){

	var posAttribute = geometry.attributes.position;
	var uvAttribute = geometry.attributes.uv;

    var uvs = [];
    var pos = [];
    var index = [];
		
	for ( var i = 0, il = posAttribute.count; i < il; i ++) {

        let thisPos = new THREE.Vector3();
        let thisUV = new THREE.Vector2();
				
		thisPos.fromBufferAttribute( posAttribute, i );
		thisUV.fromBufferAttribute( uvAttribute, i );
		
		uvs.push(thisPos.x);
        uvs.push(thisPos.y);

        if(mirror){
            pos.push(1 - thisUV.x);
            pos.push(thisUV.y);
            pos.push(0);
        } else {
            pos.push(thisUV.x);
            pos.push(thisUV.y);
            pos.push(0);
        }

        index.push(i);
	}

    var bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setIndex( index );
    bufferGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
    bufferGeometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

    var material = loadTexture(conversionSet[selectedConversion].template[0], conversionSet[selectedConversion].materials[0] );

    material.name = materialName;

    material.side = THREE.DoubleSide;

    var uvmesh = new THREE.Mesh( bufferGeometry, material );

    uvmesh.rotateX( -Math.PI / 2 );   

    texture_planes[selectedConversion].add(uvmesh);

    let isEye = materialName.indexOf("Eye");
    let isBrow = materialName.indexOf("Brow");

    let applyMirror = isEye >= 0 || isBrow >= 0;

    if(applyMirror && !mirror) {
        SwapUV2Pos( geometry , materialName, true);
    }
	
};

function downloadAllOutputs(){
    for (var i = 0; i < conversionSet[selectedConversion].cameras.length; i++) {
        DownloadCanvasAsImage(renderers[i].domElement.id);
    } 
    
}

document.getElementById('tab_btn_refresh').onclick = renderTextures;
document.getElementById('tab_btn_download').onclick = downloadAllOutputs;

document.getElementById('model').addEventListener('change', clearScene, false);

document.getElementById( 'output_canvas0' ).addEventListener( 'click', function () {    

    DownloadCanvasAsImage(renderers[0].domElement.id);
    
} );
document.getElementById( 'output_canvas1' ).addEventListener( 'click', function () {

    DownloadCanvasAsImage(renderers[1].domElement.id);
    
} );

document.getElementById( 'output_canvas2' ).addEventListener( 'click', function () {

    DownloadCanvasAsImage(renderers[2].domElement.id);
    
} );

document.getElementById( 'tab_btn_template' ).addEventListener( 'click', function () {

    loadTemplates();
    
} );
document.getElementById( 'tab_btn_clear' ).addEventListener( 'click', function () {

    clearInputs();
    
} );
