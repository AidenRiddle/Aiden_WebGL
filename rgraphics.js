class RGraphics {
    itemSize = AppSettings.vertexSize;
    #instanceMesh = {
        quad_vertices: new Float32Array([-0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5]),
        connection_vertices: new Float32Array([-0.5, 0, 0.5, 0]),
        fill: new Uint16Array([0, 1, 2, 0, 2, 3]),
        outline: new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0]),
        line: new Uint16Array([0, 1]),
        sizeInBytes: 8*AppSettings.glBytesInFloat
    }

    #gl;
    #scene;
    #tex;
    #vertexShader;
    #vertexConnectionShader;
    #fragmentShader;
    #program = {
        quads: null,
        quadsLoc: {},
        connections: null,
        connectionsLoc: {}
    };
    #matrixLocation;

    #dirtyContainers = [];
    
    #renderPropertiesBatch = [];
    #BatchMapIndex = {
        indexFinder: {},
        indexMap: {},
        mapContainer(bufferMap, container){
            for(let i = 0, k = Object.keys(this.indexMap); i < k.length; i++){
                this.indexFinder[k[i]] = -1;
            }
            container.transform.updateWorldMatrix();
            this.mapMesh(bufferMap, container, container.name);
            this.mapTransformChildren(bufferMap, container.transform.children, container.name);
            this.indexFinder = {};
        },
        mapConnection(bufferMap, connection){
            if(!connection) return;
            const rpAsID = "O_ConnectionBatch_000";
            const matA = new Float32Array([1, 0, 0, 0, 1, 0, connection.A.x, connection.A.y, 1]);
            const matB = new Float32Array([1, 0, 0, 0, 1, 0, connection.B.x, connection.B.y, 1]);
            bufferMap.addMatrixToBuffer(rpAsID, matA);
            bufferMap.addMatrixToBuffer(rpAsID, matB);
        },
        mapMesh(bufferMap, mesh, containerID){
            if(!mesh) return;
            for(let rp of mesh.renderPropertiesArray){
                const rpAsID = bufferMap.generateBatchID(rp);
                if(! (bufferMap.batch_ids.includes(rpAsID))){
                    bufferMap.createNewBatch(rpAsID);
                    this.indexMap[rpAsID] = {};
                    this.indexFinder[rpAsID] = -1;
                }
                if(this.indexMap[rpAsID][containerID] === undefined){
                    this.indexMap[rpAsID][containerID] = {
                        textureIndices: [],
                        matrixIndices: []
                    }
                }
                this.indexFinder[rpAsID]++;
                if(this.indexFinder[rpAsID] >= this.indexMap[rpAsID][containerID].textureIndices.length){
                    this.indexMap[rpAsID][containerID].textureIndices.push(bufferMap.batches[rpAsID].texcoordBufferlength);
                    this.indexMap[rpAsID][containerID].matrixIndices.push(bufferMap.batches[rpAsID].matrixBufferlength);
                    bufferMap.addTexCoordsToBuffer(rpAsID, rp.textureCoordinates);
                    bufferMap.addMatrixToBuffer(rpAsID, mesh.transform.worldMatrix);
                }else{
                    bufferMap.updateTexCoordsBuffer(rpAsID, rp.textureCoordinates, this.indexMap[rpAsID][containerID].textureIndices[this.indexFinder[rpAsID]]);
                    bufferMap.updateMatrixBuffer(rpAsID, mesh.transform.worldMatrix, this.indexMap[rpAsID][containerID].matrixIndices[this.indexFinder[rpAsID]]);
                }
            }
        },
        mapTransformChildren(bufferMap, arrOfChildren, containerID){
            for(let i = 0; i < arrOfChildren.length; i++){
                this.mapMesh(bufferMap, arrOfChildren[i].mesh, containerID);
                this.mapTransformChildren(bufferMap, arrOfChildren[i].children, containerID);
            }
        }
    };
    #BufferMap = {
        gl: this.#gl,
        program: this.#program,
        vertexBuffer: null,
        batch_ids: [],
        batches: {},
        createNewBatch(id){
            this.batch_ids.push(id);
            this.batches[id] = {
                texcoordBuffer: this.gl.createBuffer(),
                texcoordBufferlength: 0,
                matrixBuffer: this.gl.createBuffer(),
                matrixBufferlength: 0,
            }
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.batches[id].texcoordBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, AppSettings.vertexBufferSize, this.gl.DYNAMIC_DRAW);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.batches[id].matrixBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, AppSettings.matrixBufferSize, this.gl.DYNAMIC_DRAW);

            this.batch_ids.sort((a, b) => {
                const aInfo = a.split('_');
                const bInfo = b.split('_');
                if(aInfo[2] == bInfo[2]){ return aInfo[0].localeCompare(bInfo[0]); }
                return parseInt(aInfo[2]) - parseInt(bInfo[2]);
            })
        },
        setActiveQuadBuffers(batchID){
            let nElements;
            let sizePerAttrib;
            let stride;

            nElements = AppSettings.vertexSize;                       // 2
            stride = 0;                                               // 0
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
            this.gl.enableVertexAttribArray(this.program.quadsLoc.aVertexPosition);
            this.gl.vertexAttribPointer(this.program.quadsLoc.aVertexPosition, nElements, this.gl.FLOAT, false, stride, 0);
            this.gl.vertexAttribDivisor(this.program.quadsLoc.aVertexPosition, 0);
    
            nElements = 3;
            sizePerAttrib = AppSettings.glBytesInFloat * nElements;   // 12
            stride = sizePerAttrib * 3;                               // 36
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.batches[batchID].matrixBuffer);
            this.gl.enableVertexAttribArray(this.program.quadsLoc.aWorldMatrix1);
            this.gl.enableVertexAttribArray(this.program.quadsLoc.aWorldMatrix2);
            this.gl.enableVertexAttribArray(this.program.quadsLoc.aWorldMatrix3);
            this.gl.vertexAttribPointer(this.program.quadsLoc.aWorldMatrix1, nElements, this.gl.FLOAT, false, stride, 0);
            this.gl.vertexAttribPointer(this.program.quadsLoc.aWorldMatrix2, nElements, this.gl.FLOAT, false, stride, sizePerAttrib);
            this.gl.vertexAttribPointer(this.program.quadsLoc.aWorldMatrix3, nElements, this.gl.FLOAT, false, stride, sizePerAttrib * 2);
            this.gl.vertexAttribDivisor(this.program.quadsLoc.aWorldMatrix1, 1);
            this.gl.vertexAttribDivisor(this.program.quadsLoc.aWorldMatrix2, 1);
            this.gl.vertexAttribDivisor(this.program.quadsLoc.aWorldMatrix3, 1);
    
            nElements = AppSettings.vertexSize * 2;                   // 4
            sizePerAttrib = AppSettings.glBytesInFloat * nElements;   // 16
            stride = sizePerAttrib * 2;                               // 32
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.batches[batchID].texcoordBuffer);
            this.gl.enableVertexAttribArray(this.program.quadsLoc.aTexcoord1);
            this.gl.enableVertexAttribArray(this.program.quadsLoc.aTexcoord2);
            this.gl.vertexAttribPointer(this.program.quadsLoc.aTexcoord1, nElements, this.gl.FLOAT, false, stride, 0);
            this.gl.vertexAttribPointer(this.program.quadsLoc.aTexcoord2, nElements, this.gl.FLOAT, false, stride, sizePerAttrib);
            this.gl.vertexAttribDivisor(this.program.quadsLoc.aTexcoord1, 1);
            this.gl.vertexAttribDivisor(this.program.quadsLoc.aTexcoord2, 1);
            
            this.gl.useProgram(this.program.quads);
            
        },
        setActiveConnectionBuffers(){
            const batchID = "O_ConnectionBatch_000";
            let nElements;
            let sizePerAttrib;
            let stride;
            
            nElements = 3;                                            // 3
            sizePerAttrib = AppSettings.glBytesInFloat * nElements;   // 12
            stride = sizePerAttrib * 6;                               // 72
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.batches[batchID].matrixBuffer);
            this.gl.vertexAttribPointer(this.program.connectionsLoc.aWorldMatrix1, nElements, this.gl.FLOAT, false, stride, 0);
            this.gl.vertexAttribPointer(this.program.connectionsLoc.aWorldMatrix2, nElements, this.gl.FLOAT, false, stride, sizePerAttrib);
            this.gl.vertexAttribPointer(this.program.connectionsLoc.aWorldMatrix3, nElements, this.gl.FLOAT, false, stride, sizePerAttrib * 2);
            this.gl.vertexAttribPointer(this.program.connectionsLoc.aWorldMatrix4, nElements, this.gl.FLOAT, false, stride, sizePerAttrib * 3);
            this.gl.vertexAttribPointer(this.program.connectionsLoc.aWorldMatrix5, nElements, this.gl.FLOAT, false, stride, sizePerAttrib * 4);
            this.gl.vertexAttribPointer(this.program.connectionsLoc.aWorldMatrix6, nElements, this.gl.FLOAT, false, stride, sizePerAttrib * 5);
            this.gl.vertexAttribDivisor(this.program.connectionsLoc.aWorldMatrix1, 1);
            this.gl.vertexAttribDivisor(this.program.connectionsLoc.aWorldMatrix2, 1);
            this.gl.vertexAttribDivisor(this.program.connectionsLoc.aWorldMatrix3, 1);
            this.gl.vertexAttribDivisor(this.program.connectionsLoc.aWorldMatrix4, 1);
            this.gl.vertexAttribDivisor(this.program.connectionsLoc.aWorldMatrix5, 1);
            this.gl.vertexAttribDivisor(this.program.connectionsLoc.aWorldMatrix6, 1);
            this.gl.enableVertexAttribArray(this.program.connectionsLoc.aWorldMatrix1);
            this.gl.enableVertexAttribArray(this.program.connectionsLoc.aWorldMatrix2);
            this.gl.enableVertexAttribArray(this.program.connectionsLoc.aWorldMatrix3);
            this.gl.enableVertexAttribArray(this.program.connectionsLoc.aWorldMatrix4);
            this.gl.enableVertexAttribArray(this.program.connectionsLoc.aWorldMatrix5);
            this.gl.enableVertexAttribArray(this.program.connectionsLoc.aWorldMatrix6);

            this.gl.useProgram(this.program.connections);

            this.gl.uniform4fv(this.program.connectionsLoc.uTexcoord, [0, 0, 1, 0]);
            this.gl.uniform1i(this.program.connectionsLoc.uTexture, 2);
        },
        addTexCoordsToBuffer(batchID, texcoords){
            const bufferObject = this.batches[batchID];
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bufferObject.texcoordBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, bufferObject.texcoordBufferlength * AppSettings.glBytesInFloat, texcoords);
            bufferObject.texcoordBufferlength += texcoords.length;
            if(bufferObject.texcoordBufferlength * 4 == AppSettings.vertexBufferSize){
                alert("WebGL: Max amount of meshes hit. Consider increasing buffer size.");
            }
        },
        addMatrixToBuffer(batchID, matrix){
            const bufferObject = this.batches[batchID];
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bufferObject.matrixBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, bufferObject.matrixBufferlength * AppSettings.glBytesInFloat, matrix);
            bufferObject.matrixBufferlength += matrix.length;
        },
        updateTexCoordsBuffer(batchID, texcoords, index){
            const bufferObject = this.batches[batchID];
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bufferObject.texcoordBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, index * AppSettings.glBytesInFloat, texcoords);
        },
        updateMatrixBuffer(batchID, matrix, index){
            const bufferObject = this.batches[batchID];
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bufferObject.matrixBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, index * AppSettings.glBytesInFloat, matrix);
        },
        generateBatchID(rp){
            let id = "";
            if(rp.drawMethod == DrawMode.Fill){ id += "F";}
            if(rp.drawMethod == DrawMode.Outline){ id += "O";}
            id += "_" + rp.textureName + "_";
            if(rp.zIndex == 100){ id += "100"; }
            else if(rp.zIndex < 10){ id += "00" + rp.zIndex; }
            else if(rp.zIndex < 100){ id += "0" + rp.zIndex; }

            return id;
        },
        getBatchDrawMethod(batchID){
            if(batchID.split('_')[0] == 'F') return DrawMode.Fill;
            return DrawMode.Outline;
        },
        getBatchTextureUnit(batchID){
            return batchID.split('_')[1];
        }
    };

    #textureTable = new Object(); //Dictionary <String textureName, Int textureLocationUnit>

    #glVertexBuffer;
    #glIndexBuffer;

    #isRendering = false;
    #renderPromise;
    #renderQueued = false;
    
    set scene(value){
        this.#scene = value;
    }

    constructor(texturePainter){
        this.#tex = texturePainter;
        this.#InitializeGLContext();
        this.#InitializeGLSettings(Style.background_color);
        this.#InitializeBuffers();
        this.#InitializeShaders();
        this.#InitializeProgram();
        this.#InitializeDefaultTextures();
        this.#BufferMap.gl = this.#gl;
        this.#BufferMap.program = this.#program;
        this.#BufferMap.vertexBuffer = this.#glVertexBuffer;
        this.#BufferMap.createNewBatch("O_ConnectionBatch_000");
    }

    #InitializeGLContext(){
        canvas.width = document.body.clientWidth;
        canvas.height = document.body.clientHeight;

        this.#gl = canvas.getContext("webgl2");
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
        this.#glIndexBuffer = this.#gl.createBuffer();
    }

    #InitializeShaders(){
        let v = document.getElementById("vertex").firstChild.nodeValue;
        let v_con = document.getElementById("vertex_connections").firstChild.nodeValue;
        let f = document.getElementById("fragment").firstChild.nodeValue;

        this.#vertexShader = this.#LoadShader(v, this.#gl.VERTEX_SHADER);
        this.#vertexConnectionShader = this.#LoadShader(v_con, this.#gl.VERTEX_SHADER);
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
        this.#program.connections = this.#gl.createProgram();

        this.#gl.attachShader(this.#program.connections, this.#vertexConnectionShader);
        this.#gl.attachShader(this.#program.connections, this.#fragmentShader);
        this.#gl.linkProgram(this.#program.connections);

        if (!this.#gl.getProgramParameter(this.#program.connections, this.#gl.LINK_STATUS)){
            console.error('Link failed: ' + this.#gl.getProgramInfoLog(this.#program.connections));
            console.error('vs info-log: ' + this.#gl.getShaderInfoLog(this.#vertexConnectionShader));
            console.error('fs info-log: ' + this.#gl.getShaderInfoLog(this.#fragmentShader));
        }

        //Setup the texture coordinates buffer
        this.#program.connectionsLoc.aWorldMatrix1 = this.#gl.getAttribLocation(this.#program.connections, "a_worldMatrix1");
        this.#program.connectionsLoc.aWorldMatrix2 = this.#gl.getAttribLocation(this.#program.connections, "a_worldMatrix2");
        this.#program.connectionsLoc.aWorldMatrix3 = this.#gl.getAttribLocation(this.#program.connections, "a_worldMatrix3");
        this.#program.connectionsLoc.aWorldMatrix4 = this.#gl.getAttribLocation(this.#program.connections, "a_worldMatrix4");
        this.#program.connectionsLoc.aWorldMatrix5 = this.#gl.getAttribLocation(this.#program.connections, "a_worldMatrix5");
        this.#program.connectionsLoc.aWorldMatrix6 = this.#gl.getAttribLocation(this.#program.connections, "a_worldMatrix6");

        //Setup texture unit pointer
        this.#program.connectionsLoc.uTexture = this.#gl.getUniformLocation(this.#program.connections, "u_texture");
        this.#program.connectionsLoc.uTexcoord = this.#gl.getUniformLocation(this.#program.connections, "u_texcoord");
        this.#program.connectionsLoc.viewMatrix = this.#gl.getUniformLocation(this.#program.connections, "u_matrix");
        
        
        this.#program.quads = this.#gl.createProgram();

        this.#gl.attachShader(this.#program.quads, this.#vertexShader);
        this.#gl.attachShader(this.#program.quads, this.#fragmentShader);
        this.#gl.linkProgram(this.#program.quads);

        if (!this.#gl.getProgramParameter(this.#program.quads, this.#gl.LINK_STATUS)){
            console.error('Link failed: ' + this.#gl.getProgramInfoLog(this.#program.quads));
            console.error('vs info-log: ' + this.#gl.getShaderInfoLog(this.#vertexShader));
            console.error('fs info-log: ' + this.#gl.getShaderInfoLog(this.#fragmentShader));
        }

        //Setup the vertex buffer
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#glVertexBuffer);
        this.#gl.bufferData(this.#gl.ARRAY_BUFFER, this.#instanceMesh.quad_vertices, this.#gl.STATIC_DRAW);
        this.#program.quadsLoc.aVertexPosition = this.#gl.getAttribLocation(this.#program.quads, "a_position");

        //Setup the texture coordinates buffer
        this.#program.quadsLoc.aTexcoord1 = this.#gl.getAttribLocation(this.#program.quads, "a_texcoord2Verts1");
        this.#program.quadsLoc.aTexcoord2 = this.#gl.getAttribLocation(this.#program.quads, "a_texcoord2Verts2");

        //Setup the matrix buffer
        this.#program.quadsLoc.aWorldMatrix1 = this.#gl.getAttribLocation(this.#program.quads, "a_worldMatrix1");
        this.#program.quadsLoc.aWorldMatrix2 = this.#gl.getAttribLocation(this.#program.quads, "a_worldMatrix2");
        this.#program.quadsLoc.aWorldMatrix3 = this.#gl.getAttribLocation(this.#program.quads, "a_worldMatrix3");

        //Setup index buffer
        this.#gl.bindBuffer(this.#gl.ELEMENT_ARRAY_BUFFER, this.#glIndexBuffer);
        this.#gl.bufferData(this.#gl.ELEMENT_ARRAY_BUFFER, this.#instanceMesh.outline.length * 2, this.#gl.DYNAMIC_DRAW);

        //Setup texture unit pointer
        this.#program.quadsLoc.uTexture = this.#gl.getUniformLocation(this.#program.quads, "u_texture");
        this.#program.quadsLoc.viewMatrix = this.#gl.getUniformLocation(this.#program.quads, "u_matrix");
    }
    
    #UpdateMatrix(matrixLoc){
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
        this.#gl.uniformMatrix3fv(matrixLoc, false, VecMath.m3.multiply(translationMatrix, scaleMatrix));
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

    #CleanDirtyContainers(){
        let i = this.#dirtyContainers.length - 1;
        while(i >= 0){
            const container = this.#dirtyContainers[i];
            this.#BatchMapIndex.mapContainer(this.#BufferMap, container);

            //container.transform.updateWorldMatrix(Matrix.identity);

            this.#dirtyContainers.pop();
            i--;
        }
    }

    #CullObjectsToRender(){
        //TODO: filter out meshes that aren't visible, i.e containers that are offscreen.
        return this.#scene.objectsInScene;
    }

    #ResetBatchMaps(){
        this.#renderPropertiesBatch = [];
    }

    #AdvancedBatch(){
        console.log("Batching " + this.#scene.objectsInScene.length + " objects.");
        for(let obj of this.#scene.objectsInScene){
            if(obj instanceof Container){
                this.#BatchMapIndex.mapContainer(this.#BufferMap, obj);
            }else{
                console.log(obj);
                this.#BatchMapIndex.mapConnection(this.#BufferMap, obj);
            }
        }
        //For every dirty object, find its RPs and the RPs of its children

        //If new RPs have been found, allocate a new buffer on the GPU

        //Clean the dirty objects
        
        //Store the TexCoord and Matrix data into the appropriate "batch/buffer" on the GPU

        //Update the LocationMap
    }

    #DebugRenderProfile(){
        console.clear();
        console.log(this.#renderPropertiesBatch);
        console.log("Batches: ", this.#BatchMapIndex.indexMap);
    }
    
    #SimpleRender = () => {
        //this.#DebugRenderProfile();
        //console.log(this.#scene.objectsInScene)
        Debug.StartCounter("Vertex Count ");
        
        this.#gl.clear(this.#gl.COLOR_BUFFER_BIT);
        
        //Draw all connections first
        this.#gl.useProgram(this.#program.connections);
        this.#UpdateMatrix(this.#program.connectionsLoc.viewMatrix);
        this.#DrawConnections();

        //Draw all quad batches
        this.#gl.useProgram(this.#program.quads);
        this.#UpdateMatrix(this.#program.quadsLoc.viewMatrix);
        //if(this.#BufferMap.batch_ids.length > 1) this.#SimpleDraw(1);
        for(let i = 1; i < this.#BufferMap.batch_ids.length; i++){
            this.#SimpleDraw(i);
        }

        let rpBatch;
        for(let i = 0; i < this.#renderPropertiesBatch.length; i++){
            rpBatch = this.#renderPropertiesBatch[i];
            //this.#SimpleDraw(this.GetTexture(rpBatch.textureName).unit, rpBatch.drawMethod, i);
        }
    }
    
    #DrawConnections(){
        //Select the right buffers
        const batchID = "O_ConnectionBatch_000";
        this.#BufferMap.setActiveConnectionBuffers(batchID);

        const drawMethod = this.#BufferMap.getBatchDrawMethod(batchID);
        let indices = new Uint16Array([0, 1]);
        this.#gl.bufferSubData(this.#gl.ELEMENT_ARRAY_BUFFER, 0, indices);

        //Draw object
        this.#gl.drawElementsInstanced(drawMethod, indices.length, this.#gl.UNSIGNED_SHORT, 0, this.#BufferMap.batches[batchID].matrixBufferlength / 18);
    }

    #SimpleDraw(batchIndex){
        //Select the right buffers
        const batchID = this.#BufferMap.batch_ids[batchIndex];
        this.#BufferMap.setActiveQuadBuffers(batchID);

        const drawMethod = this.#BufferMap.getBatchDrawMethod(batchID);
        let indices = (drawMethod == DrawMode.Fill) ?
                        this.#instanceMesh.fill :
                        this.#instanceMesh.outline;
        this.#gl.bufferSubData(this.#gl.ELEMENT_ARRAY_BUFFER, 0, indices);

        this.#gl.uniform1i(this.#program.quadsLoc.uTexture, this.GetTexture(this.#BufferMap.getBatchTextureUnit(batchID)).unit);

        //Draw object
        this.#gl.drawElementsInstanced(drawMethod, indices.length, this.#gl.UNSIGNED_SHORT, 0, this.#BufferMap.batches[batchID].texcoordBufferlength / 8);
    }

    #PrepareSceneRender(){
        this.#CleanDirtyContainers();
        //this.#SimplePreRenderVertexFetch();
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
    
    MakeDirty = (container) => {
        this.#dirtyContainers.push(container);
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
        this.#AdvancedBatch();
    }
}