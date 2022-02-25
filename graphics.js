"use strict";

class RenderProperties{
    #drawMethod;
    get drawMethod(){
        return this.#drawMethod;
    }

    #textureName;
    get textureName(){
        return this.#textureName;
    }

    #textureCoordinates;
    get textureCoordinates(){
        return this.#textureCoordinates;
    }

    #zIndex;
    get zIndex(){
        return this.#zIndex;
    }
    
    constructor(drawMethod, textureName, textureCoordinates, zIndex = 0){
        this.#drawMethod = drawMethod;
        this.#textureName = textureName;
        this.#textureCoordinates = textureCoordinates;
        this.#zIndex = System.zIndex_default + zIndex;
    }

    Equals(renderProperty){
        return (this.#drawMethod === renderProperty.drawMethod) &&
            (this.textureName === renderProperty.textureName) &&
            (this.zIndex === renderProperty.zIndex);    //Matching texture coordinates are NOT required
    }

    static FillProperties(color, zIndex = 0){
        return new RenderProperties(DrawMode.Fill, TexturePainter.principalColorTextureName, ColorUtils.textureCoordinatesFromStyle(color), zIndex);
    }

    static OutlineProperties(color, zIndex = 0){
        return new RenderProperties(DrawMode.Outline, TexturePainter.principalColorTextureName, ColorUtils.textureCoordinatesFromStyle(color), zIndex);
    }

    static TextureProperties(textureName, textureCoordinates, zIndex = 0){
        return new RenderProperties(DrawMode.Fill, textureName, textureCoordinates, zIndex);
    }
}
RenderProperties.prototype.toString = function(){
    let str = "";
    if(this.drawMethod == DrawMode.Fill) str += "Fill ";
    else if (this.drawMethod == DrawMode.Outline) str += "Outline ";
    str += ": " + this.textureName + "\n";
    return str;
}

class Graphics {
    itemSize = AppSettings.vertexSize;

    #gl;
    #scene;
    #tex;
    #vertexShader;
    #fragmentShader;
    #program;
    #matrixLocation;
    
    #renderPropertiesBatch = [];
    #objectsBatch = [];
    #indexBatch = [];

    #vertexBatchSizes = [];
    #verticesBatch = [];
    #texCoordsBatch = [];

    #textureTable = new Object(); //Dictionary <String textureName, Int textureLocationUnit>

    #glVertexBuffer;
    #glTextureCoordinateBuffer;
    #glIndexBuffer;

    #isRendering = false;
    #renderPromise;
    #renderQueued = false;
    
    set scene(value){
        this.#scene = value;
        this.#InitializeMatrix();
    }

    constructor(texturePainter){
        this.#tex = texturePainter;
        this.#InitializeGLContext();
        this.#InitializeGLSettings(Style.background_color);
        this.#InitializeBuffers();
        this.#InitializeShaders();
        this.#InitializeProgram();
        this.#InitializeDefaultTextures();
    }

    #InitializeGLContext(){
        canvas.width = document.body.clientWidth;
        canvas.height = document.body.clientHeight;

        this.#gl = canvas.getContext("webgl");
        this.#gl.canvas.width = canvas.width;
        this.#gl.canvas.height = canvas.height;
        this.#gl.viewport(0, 0, this.#gl.canvas.width, this.#gl.canvas.height);
    }

    #InitializeGLSettings(col){
        this.#gl.clearColor(col[0], col[1], col[2], col[3]);
        this.#gl.enable(this.#gl.BLEND);
        this.#gl.blendFunc(this.#gl.SRC_ALPHA, this.#gl.ONE_MINUS_SRC_ALPHA);
    }

    #InitializeBuffers(){
        this.#glVertexBuffer = this.#gl.createBuffer();
        this.#glTextureCoordinateBuffer = this.#gl.createBuffer();
        this.#glIndexBuffer = this.#gl.createBuffer();
    }

    #InitializeShaders(){
        let v = document.getElementById("vertex").firstChild.nodeValue;
        let f = document.getElementById("fragment").firstChild.nodeValue;

        this.#vertexShader = this.#LoadShader(v, this.#gl.VERTEX_SHADER);
        this.#fragmentShader = this.#LoadShader(f, this.#gl.FRAGMENT_SHADER);
    }

    #LoadShader(source, type){
        let shader = this.#gl.createShader(type);

        this.#gl.shaderSource(shader, source);

        this.#gl.compileShader(shader);
        if (!this.#gl.getShaderParameter(shader, this.#gl.COMPILE_STATUS)) {
            throw new Error('An error occurred compiling the shaders: ' + this.#gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    #InitializeProgram(){
        this.#program = this.#gl.createProgram();

        this.#gl.attachShader(this.#program, this.#vertexShader);
        this.#gl.attachShader(this.#program, this.#fragmentShader);
        this.#gl.linkProgram(this.#program);

        if (!this.#gl.getProgramParameter(this.#program, this.#gl.LINK_STATUS)){
            console.error('Link failed: ' + this.#gl.getProgramInfoLog(this.#program));
            console.error('vs info-log: ' + this.#gl.getShaderInfoLog(this.#vertexShader));
            console.error('fs info-log: ' + this.#gl.getShaderInfoLog(this.#fragmentShader));
        }
        
        this.#gl.useProgram(this.#program);

        //Setup the vertex buffer
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#glVertexBuffer);
        this.#program.aVertexPosition = this.#gl.getAttribLocation(this.#program, "a_position");
        this.#gl.enableVertexAttribArray(this.#program.aVertexPosition);
        this.#gl.vertexAttribPointer(this.#program.aVertexPosition, this.itemSize, this.#gl.FLOAT, false, 0, 0);
        
        //Setup the texture coordinate buffer
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#glTextureCoordinateBuffer);
        this.#program.aTexcoord = this.#gl.getAttribLocation(this.#program, "a_texcoord");
        this.#gl.enableVertexAttribArray(this.#program.aTexcoord);
        this.#gl.vertexAttribPointer(this.#program.aTexcoord, this.itemSize, this.#gl.FLOAT, false, 0, 0);
        
        //Setup the index buffer
        this.#gl.bindBuffer(this.#gl.ELEMENT_ARRAY_BUFFER, this.#glIndexBuffer);
        
        this.#program.uTexture = this.#gl.getUniformLocation(this.#program, "u_texture");
    }

    #InitializeMatrix(){
        this.#matrixLocation = this.#gl.getUniformLocation(this.#program, "u_matrix");
        this.#UpdateMatrix();
    }
    
    #UpdateMatrix(){
        let cameraPosition = this.#scene.camera.position;
        let cameraZoom = this.#scene.camera.zoom;
        let translationMatrix = VecMath.m3.translate(
            2 * cameraPosition.x / canvas.width,
            2 * cameraPosition.y / canvas.height
        );
        let scaleMatrix = VecMath.m3.scale(
            2 * cameraZoom / canvas.width,
            2 * cameraZoom / canvas.height
        );
        this.#gl.uniformMatrix3fv(this.#matrixLocation, false, VecMath.m3.multiply(translationMatrix, scaleMatrix));
    }

    #InitializeDefaultTextures(){
        this.StoreTexture(TexturePainter.principalColorTextureName, this.#tex.DrawPrincipalColorTextures(), this.#gl.NEAREST);
        this.StoreTexture(TexturePainter.letterAtlasTextureName, this.#tex.DrawLetterAtlasTexture(), this.#gl.LINEAR);
        this.StoreTexture(TexturePainter.connectionTextureName, this.#tex.DrawConnectionTexture(), this.#gl.LINEAR);
    }
    
    StoreTexture(name, textureData, textureFilterSetting = this.#gl.LINEAR){
        //If the texture already exists, return it
        if(name in this.#textureTable) return this.#textureTable[name];

        //Create the texture
        let texture = this.#gl.createTexture();
        let unit = Object.keys(this.#textureTable).length;

        //Bind the texture to a unit - LIMITED TO 32 (gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) !!!!!
        this.#gl.activeTexture(this.#gl.TEXTURE0 + unit);
        this.#gl.bindTexture(this.#gl.TEXTURE_2D, texture);

        //Define the texture parameters
        this.#gl.texParameterf(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_S, this.#gl.CLAMP_TO_EDGE);
        this.#gl.texParameterf(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_T, this.#gl.CLAMP_TO_EDGE);
        this.#gl.texParameterf(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MIN_FILTER, textureFilterSetting);
        this.#gl.texParameterf(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MAG_FILTER, textureFilterSetting);

        //Feed data to the texture
        this.#gl.texImage2D(this.#gl.TEXTURE_2D, 0, this.#gl.RGBA, textureData.width, textureData.height, 0, this.#gl.RGBA, this.#gl.UNSIGNED_BYTE, textureData.data);

        //Assign a unit in the dictionary
        let imageData = {unit: unit, pixels : textureData.data, width : textureData.width, height : textureData.height};
        this.#textureTable[name] = imageData;

        return imageData;
    }
    
    GetTexture(message){
        if(!(typeof message == 'string')) return this.#textureTable[ColorUtils.nameOfStyle(message)];
        if(!(message in this.#textureTable)) return this.StoreTexture(message, this.#tex.DrawMessageTexture(message));
        return this.#textureTable[message];
    }

    #CullObjectsToRender(){
        //TODO: filter out meshes that aren't visible, i.e containers that are offscreen.
        return this.#scene.objectsInScene;
    }

    #ResetBatchMaps(){
        this.#renderPropertiesBatch = [];
        this.#objectsBatch = [];
        this.#vertexBatchSizes = [];
        this.#indexBatch = [];
    }

    #BuildBatchMaps(arrayOfObjects, BatchMap, IndexMap){
        for(let obj of arrayOfObjects){
            for(let rp of obj.renderPropertiesArray){
                let found = false;
                let index = rp.zIndex;
                if(typeof BatchMap[index] == 'undefined') BatchMap[index] = [];
                if(typeof IndexMap[index] == 'undefined') IndexMap[index] = [];

                for(let j = 0; j < BatchMap[index].length; j++){
                    if(rp.Equals(BatchMap[index][j])){
                        IndexMap[index][j].push(obj);
                        found = true;
                        break;
                    }
                }
                if(!found){
                    BatchMap[index].push(rp);
                    IndexMap[index].push([obj]);
                }
            }
        }
    }

    #BindBatchMaps(BatchMap, IndexMap){
        for(let index of Object.getOwnPropertyNames(BatchMap)){
            this.#renderPropertiesBatch = this.#renderPropertiesBatch.concat(BatchMap[index]);
            this.#objectsBatch = this.#objectsBatch.concat(IndexMap[index]);
            for(let j = 0; j < IndexMap[index].length; j++){
                const arr = IndexMap[index][j];
                const i = this.#vertexBatchSizes.length;
                let counter = 0;
                this.#vertexBatchSizes[i] = 0;
                this.#indexBatch[i] = [];
                for(let obj of arr){
                    this.#vertexBatchSizes[i] += obj.shape.length;
                    if(obj instanceof Connection) { this.#indexBatch[i].push(counter, counter + 1); counter += 2; }
                    else if(BatchMap[index][j].drawMethod == DrawMode.Fill) { this.#indexBatch[i].push(counter, counter + 1, counter + 2, counter, counter + 2, counter + 3); counter += 4; }
                    else { this.#indexBatch[i].push(counter, counter + 1, counter + 1, counter + 2, counter + 2, counter + 3, counter + 3, counter); counter += 4; }
                }
            }
        }
        this.#verticesBatch = Array(this.#objectsBatch.length);
        this.#texCoordsBatch = Array(this.#objectsBatch.length);
    }

    /**
     * Maps all meshes in the scene to a batch index to reduce draw calls.
     */
    #ComplexBatch(){
        this.#ResetBatchMaps();

        let zIndexBatchMapping = new Object();
        let zIndexIndexMapping = new Object();
        let localZIndexBatchMapping;
        let localZIndexIndexMapping;

        let sceneObjects = this.#CullObjectsToRender();

        //Iterates through all objects in the scene.
        for(let i = 0; i < sceneObjects.length; i++){
            const parent = sceneObjects[i];
            const tinyArray = parent.objectData;

            let isObjectOverlapping = false;
            if(parent instanceof Container) isObjectOverlapping = this.#scene.IsRectangleOverlapping(parent);
    
            //If the object is overlapping with another, create a new batch for the object.
            if(isObjectOverlapping){
                localZIndexBatchMapping = new Object();
                localZIndexIndexMapping = new Object();
                this.#BuildBatchMaps(tinyArray, localZIndexBatchMapping, localZIndexIndexMapping);
                this.#BindBatchMaps(localZIndexBatchMapping, localZIndexIndexMapping);
            }else{  //Else assign it to same batch as the other objects.
                this.#BuildBatchMaps(tinyArray, zIndexBatchMapping, zIndexIndexMapping);
            }
        }

        this.#BindBatchMaps(zIndexBatchMapping, zIndexIndexMapping);
        for(let i = 0; i < this.#indexBatch.length; i++){
            this.#indexBatch[i] = new Uint16Array(this.#indexBatch[i]);
        }
        Debug.Log("Batches: ", this.#renderPropertiesBatch.length);
    }

    /**
     * Fetches the vertex data and texture coordinate data of each mesh in the scene.
     * They are then stored into '#verticesBatch' and '#texCoordsBatch' respectively.
     */
    #SimplePreRenderVertexFetch(){
        let vCounter;
        let tCounter;

        //Iterate over every batch created.
        for(let i = 0; i < this.#renderPropertiesBatch.length; i++){
            const drawMethod = this.#renderPropertiesBatch[i].drawMethod;
            vCounter = 0;
            tCounter = 0;

            //Allocate new batches if they do not already exist. After every 'ComplexBatch()' call, the batches are reset and need reallocation.
            if(this.#verticesBatch[i] == undefined){
                this.#verticesBatch[i] = new Float32Array(this.#vertexBatchSizes[i]);
                this.#texCoordsBatch[i] = new Float32Array(this.#vertexBatchSizes[i]);
            }
            
            for(let j = 0; j < this.#objectsBatch[i].length; j++){
                if( ! this.#objectsBatch[i][j].enabled) continue;
                const obj = this.#objectsBatch[i][j];

                for(let rp of obj.renderPropertiesArray){
                    if(rp.drawMethod == drawMethod){
                        for(let coor of rp.textureCoordinates){this.#texCoordsBatch[i][tCounter] = coor; tCounter++}
                        break;
                    }
                }
                for(let vertex of obj.shape){this.#verticesBatch[i][vCounter] = vertex; vCounter++}
            }
        }
    }

    #SimpleRender = () => {
        /*console.clear();
        console.log(this.#renderPropertiesBatch);
        console.log(this.#vertexBatchSizes);
        console.log(this.#verticesBatch);
        console.log(this.#indexBatch);*/
        Debug.StartCounter("Vertex Count ");
        
        this.#gl.clear(this.#gl.COLOR_BUFFER_BIT);

        let rpBatch;
        for(let i = 0; i < this.#renderPropertiesBatch.length; i++){
            rpBatch = this.#renderPropertiesBatch[i];
            this.#SimpleDraw(this.GetTexture(rpBatch.textureName).unit, rpBatch.drawMethod, i);
            Debug.Count("Vertex Count ", this.#verticesBatch[i].length);
        }
    }

    #SimpleDraw(textureUnit, drawMethod, batchIndex){
        //Update vertex buffer
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#glVertexBuffer);
        this.#gl.bufferData(this.#gl.ARRAY_BUFFER, this.#verticesBatch[batchIndex], this.#gl.DYNAMIC_DRAW);

        //Update texture coordinate buffer
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#glTextureCoordinateBuffer);
        this.#gl.bufferData(this.#gl.ARRAY_BUFFER, this.#texCoordsBatch[batchIndex], this.#gl.DYNAMIC_DRAW);

        //Select the appropriate index buffer
        this.#gl.bufferData(this.#gl.ELEMENT_ARRAY_BUFFER, this.#indexBatch[batchIndex], this.#gl.STATIC_DRAW);

        //Update active texture
        this.#gl.uniform1i(this.#program.uTexture, textureUnit);

        //Draw object
        this.#gl.drawElements(drawMethod, this.#indexBatch[batchIndex].length, this.#gl.UNSIGNED_SHORT, 0);
    }

    #PrepareSceneRender(){
        this.#UpdateMatrix();
        this.#SimplePreRenderVertexFetch();
    }

    /**
     * Draws the scene.
     * 
     * Due to the HTML Canvas' input system, many more draw requests are being submitted than can be handled.
     * By responding to every single draw request, the program appears to "freeze" due to the volume of frames that are being rendered.
     * To mitigate this behaviour, a timer is put into place.
     * This forces the program to wait a few milliseconds (System.time_between_frame_renders) before reading the next draw request.
     * 
     * The program, upon recieving a draw request, gathers all of the vertex data in the scene and renders the final image.
     * Before reading the next draw request, control needs to be given back to the DOM in order to "apply" that image to the HTML Canvas so the user can see it.
     * Thus, the timer "setTimeout" allows the function to return and give control back to the DOM before processing the next draw request.
     * 
     * A Promise is setup and referenced in 'this.#renderPromise' to allow other functions to execute as soon as the render finishes.
     * 
     */
    #SceneRender = () => {
        const renderStartTime = performance.now();
        Debug.StartCounter("Last Frame Time CPU (ms): ", -(~~renderStartTime));
        this.#PrepareSceneRender();
        Debug.Count("Last Frame Time CPU (ms): ", ~~performance.now());

        Debug.StartCounter("Last Frame Time GPU (ms): ", -(~~performance.now()));
        this.#SimpleRender();
        this.#renderPromise = new Promise((resolve) => {
            let waitTime = System.time_between_frame_renders - ~~(performance.now() - renderStartTime);
            if(waitTime < 0) waitTime = 0;
            setTimeout(() => {
                this.#isRendering = false;
                Debug.Count("Last Frame Time GPU (ms): ", ~~performance.now());
                Debug.Average("Avg Frame Time (ms): ", Debug.GetCount("Last Frame Time GPU (ms): ") + Debug.GetCount("Last Frame Time CPU (ms): ")); 
                resolve();
            }, waitTime);
        });
    }

    QueueSceneRender = () => {
        if(this.#renderQueued) return;
        if( ! this.#isRendering){
            this.#isRendering = true;
            this.#SceneRender();
        }else{
            this.#renderQueued = true;
            this.#renderPromise.then(() => {
                this.#renderQueued = false;
                this.#isRendering = true;
                this.#SceneRender();
            });
        }
    }
    
    QueueReBatch = () => {
        this.#ComplexBatch();
    }
}