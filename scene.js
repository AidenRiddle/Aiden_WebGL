class Scene {
    //Array holding all objects in the world.
    //Position [0] reserved for the container preview.
    #objectsInScene = [];
    #connectionsInScene = [];   //Contains only the IDs, NOT the instances

    #gl;
    #jsondb;
    camera = {
        position : new Vector2(0, 0),
        zoom : 1,

        Pan : function(x, y){
            this.position = this.position.Add(x, y);
        }
    }

    #previewConnection;
    #previewConnectionRendererEnabled;

    get objectsInScene(){
        return this.#objectsInScene;
    }

    get activeContainer(){
        let i = this.#objectsInScene.length;
        while(!(this.#objectsInScene[i] instanceof Container)) i--;
        return this.#objectsInScene[i];
    }

    set activeContainer(container){
        let indexOfContainer = this.#objectsInScene.length - 1;
        if(container instanceof PropertyHandle) container = container.container;
        while(this.#objectsInScene[indexOfContainer] != container){
            if(indexOfContainer < 0) throw new Error("Container not in Scene");
            indexOfContainer--;
        }
        this.#objectsInScene.splice(indexOfContainer, 1);
        this.#objectsInScene.push(container);
        this.Reload();
    }

    constructor(graphicsEngine, jsondb){
        this.#gl = graphicsEngine;
        this.#jsondb = jsondb;
        this.#previewConnectionRendererEnabled = false;
    }

    Export(){
        const exportTimer = performance.now();

        const exportObj = {
            camera: this.camera,
            connections: this.#jsondb.connections,
            containers: this.#jsondb.containers
        }

        for(let containerKey in exportObj.containers){
            const containerJSONObject = exportObj.containers[containerKey];
            const containerSceneObject = this.FindContainer(containerKey);
            if(containerSceneObject === null) throw new Error("Container not found.");
            containerJSONObject.sceneData = {
                position: containerSceneObject.position,
                scale: containerSceneObject.scale
            }
        }

        console.log("Finished Building in " + (performance.now() - exportTimer) + " ms.");
        return exportObj;
    }

    /**
     * ================= SCENE EVENTS =================
     */

    Refresh = () => {
        this.#SceneEventBeforeRender();
        this.#gl.QueueSceneRender();
        this.#SceneEventAfterRender();
    }
    
    Reload(){
        this.#gl.QueueReBatch();
        this.Refresh();
    }
    
    #SceneEventBeforeRender(){
    }
    
    #SceneEventAfterRender(){
        Vertex.OnRenderFinished();
    }

    /**
     * ================= SCENE FROM DATABASE =================
     */

    #UpdateContainer(containerName, containerData = this.#jsondb.containers[containerName]){

        //Check if container exists
        let container = this.FindContainer(containerName);
        
        //If container doesn't exist, create one.
        if(container === null) {
            let pos = Vector2.zero;
            let pos2 = pos.Add(Defaults.container_width, -Defaults.container_height);
            container = new Container(pos, pos2, containerName, containerData.containerType);
            this.#objectsInScene.push(container);                       //Add object to world
        };

        //Check for missing property names and add them to the container
        for(let vars in containerData.variables){
            const property = containerData.variables[vars];
            if(container.variables.includes(property.name)) continue;
            container.AddVariable(property.name, this.#jsondb.VariableToLabel(property));
        }
        for(let vars in containerData.methods){
            const property = containerData.methods[vars];
            if(container.methods.includes(property.name)) continue;
            container.AddMethod(property.name, this.#jsondb.MethodToLabel(property));
        }

        return container;
    }

    #UpdateConnection(connectionID, connectionData = this.#jsondb.connections[connectionID]){
        if(this.FindConnection(connectionID) !== null) return;
        if(connectionData.from.name === undefined) return;
        
        const socIn = this.GetSocketIn(connectionData.from.name, connectionData.from.property);
        const socOut = this.GetSocketOut(connectionData.to.name, connectionData.to.property);
        const connectionInstance = new Connection(connectionID, socIn, socOut);
        this.#connectionsInScene.push(connectionID);
        this.#objectsInScene.push(connectionInstance);  //Add object to world
    }

    MakeSceneFromDatabase(){
        let db = this.#jsondb.containers;

        //For all containers in the database, update the containers in the scene.
        for(let containerKey in db){
            this.#UpdateContainer(containerKey);        //Updates existing containers and creates new ones.
        }

        //For all connections in the database, update the connections in the scene.
        db = this.#jsondb.connections;
        for(let connectionID in db){
            this.#UpdateConnection(connectionID);    //TODO: must check existing connections
        }

        this.Reload();
    }

    MakeSceneFromSaveFile(saveFile){
        //Reset the scene
        this.#objectsInScene = [];
        this.#connectionsInScene = [];

        //Update Camera settings
        this.camera.position.x = saveFile.camera.position[0];
        this.camera.position.y = saveFile.camera.position[1];
        this.camera.zoom = saveFile.camera.zoom;

        //Create all the containers from the save file and remove the 'sceneData'
        for(let containerKey in saveFile.containers){
            const containerData = saveFile.containers[containerKey];
            let container = this.#UpdateContainer(containerKey, containerData);        //Updates existing containers and creates new ones.
            let pos = new Vector2(containerData.sceneData.position[0], containerData.sceneData.position[1]);
            let scale = new Vector2(containerData.sceneData.scale[0], containerData.sceneData.scale[1]);
            container.Translate(pos);
            container.Scale(scale);

            delete saveFile.containers[containerKey].sceneData;
        }

        //Create all the connections from the save file
        for(let connectionID in saveFile.connections){
            this.#UpdateConnection(parseInt(connectionID), saveFile.connections[connectionID]);    //TODO: must check existing connections
        }

        //Queue a batch call and a draw call
        this.Reload();
    }

    /**
     * ================= SCENE RAYCASTS =================
     */
    
    IsRectangleOverlapping(rect){
        const sceneObjects = this.objectsInScene;
        for(let i = 0; i < sceneObjects.length; i++){
            if(!sceneObjects[i].enabled) continue;
            if(! (sceneObjects[i] instanceof Container)) continue;
            if(rect === sceneObjects[i]) continue;      //If we are comparing the same rectangle to itself, skip.
            if(VecMath.CheckRectangleOverlap(rect, sceneObjects[i])) return true;
        }
        return false;
    }

    #CheckContainer(coordinates, container){
        const colliders = container.collisionData.colliders;
        const boundingBox = colliders[colliders.length - 1][0];

        //If the mouse coordinates are NOT inside the bounding box, skip the rest of the checks and return.
        if( ! VecMath.CheckRectangle(coordinates, boundingBox)) return null;

        //Iterates through the list backwards in order to check the colliders on top first.
        // ----- SKIPS THE FIRST ITERATION TO AVOID RECHECKING THE BOUNDING BOX /// Needs a better implementation.
        for(let i = colliders.length - 2; i >= 0; i--){
            for(let j = colliders[i].length - 1; j >= 0; j--){   //The order doesn't matter in the inner loop because the objects within this array all have the same ZIndex
                const collider = colliders[i][j];
                if(VecMath.CheckRectangle(coordinates, collider)){ return { collider : collider, parent : container, hitbox : container.collisionData.hitboxes[i][j] };}
            }
        }
        return null;
    }

    /**
     * ================= SCENE UTILS =================
     */

    #RemoveArrayElement(array, index){
        delete array[index];
        array.splice(index, 1);
    }

    Destroy(rect){
        let index = this.#objectsInScene.indexOf(rect);
        this.#RemoveArrayElement(this.#objectsInScene, index);
        Debug.Log("Scene Object Count: ", this.#objectsInScene.length);

        this.Reload();
    }

    FindContainer(name){
        for(let container of this.#objectsInScene){
            if( ! container instanceof Container) continue;
            if(container.name == name) return container;
        }
        return null;
    }

    FindConnection(id){
        for(let connection of this.#objectsInScene){
            if( ! connection instanceof Connection) continue;
            if(connection.id === id) return connection;
        }
        return null;
    }

    /**
     * ================= LOW LEVEL SETTERS AND GETTERS =================
     */

    //obj must be of a compatible type with Graphics (i.e Containers, Rectangles, Lines, etc)
    #AddObjectToScene(obj){
        this.#objectsInScene.push(obj);                                 //Add object to world
        Debug.Log("Scene Object Count: ", this.#objectsInScene.length);
        this.Reload();
    }

    #GetSocket(containerName, targetName, isSocketIn){
        const container = this.FindContainer(containerName);
        if(container === null) throw new Error("Container name does not exist");
        container.transform.updateWorldMatrix();

        if(targetName == "" || targetName === undefined){
            if(isSocketIn) return container.nameHandle.socketIn;
            return container.nameHandle.socketOut;
        }

        //Search through the variables of the container
        for(let i = 0; i < container.variables.length; i++){
            let variable = container.variables[i];
            if(variable.includes(targetName)){
                if(isSocketIn) return container.variableHandles[i].socketIn;
                return container.variableHandles[i].socketOut;
            }
        }

        //Search through the methods of the container
        for(let i = 0; i < container.methods.length; i++){
            let method = container.methods[i];
            if(method.includes(targetName)){
                if(isSocketIn) return container.methodHandles[i].socketIn;
                return container.methodHandles[i].socketOut;
            }
        }
        throw new Error("Variable or Method name does not exist within the Container " + containerName);
    }

    /**
     * ================================================== INPUT.js ENDPOINTS ==================================================
     */

    /**
     * ================= GETTERS =================
     */

    GetClickedConnection(coordinates){
        let i = this.#objectsInScene.length - 1;
        for(i; i >= 0; i--){
            if(this.#objectsInScene[i] instanceof Connection) continue; //if the object is NOT a container, skip.
            if(VecMath.CheckConnection(coordinates, this.#objectsInScene[i])){console.log(true); return this.#objectsInScene[i];};
        }
    }

    GetClickedRectangle(coordinates){
        let returnObject = null;

        //Iterates through the list backwards in order to check the containers on top first
        for(let i = this.#objectsInScene.length - 1; i >= 0; i--){
            if(!(this.#objectsInScene[i] instanceof Container)) continue; //if the object is NOT a container, skip.
            returnObject = this.#CheckContainer(coordinates, this.#objectsInScene[i]);
            if(returnObject != null){
                this.activeContainer = returnObject.parent;
                return returnObject;
            }
        }
        return null;
    }

    GetSocketIn(containerName, targetName){
        return this.#GetSocket(containerName, targetName, true);
    }

    GetSocketOut(containerName, targetName){
        return this.#GetSocket(containerName, targetName, false);
    }

    /**
     * ================= CREATE / ADD =================
     */

    UpdateContainers(containerNameArray){
        for(let name of containerNameArray){
            this.#UpdateContainer(name);
        }
        if(containerNameArray.length > 1){
            for(let connectionID of this.#jsondb.containers[containerNameArray[0]].connectionsOut){
                this.#UpdateConnection(connectionID);
            }
        }
        this.Reload();
    }

    CreateNewContainer(pos, name, type){
        //Add the container in the database
        if(this.#jsondb.CreateContainer(name, type) === null) return;
        
        //If the database request succeeds, create a new container in the scene.
        this.#previewConnectionRendererEnabled = false;      //Deactivate the rendering of the preview.
        let pos2 = pos.Add(Defaults.container_width, -Defaults.container_height);
        let newContainer = new Container(pos, pos2, name, type);
        this.#AddObjectToScene(newContainer);
        return newContainer;
    }

    CreateNewConnection(rect1, rect2){
        //Add the connection in the database
        const nameOfContainer = rect1.container.container.name;
        const from = rect1.container.text;
        const nameOfTarget = rect2.container.container.name;
        const to = rect2.container.text;
        const connectionID = this.#jsondb.CreateConnection(nameOfContainer, from, nameOfTarget, to);
        if(connectionID === null) return;

        this.#jsondb.Print();
        
        //If the database request succeeds, create a new connection in the scene.
        this.#previewConnectionRendererEnabled = false;      //Deactivate the rendering of the preview.
        this.#connectionsInScene.push(connectionID);
        this.#AddObjectToScene(new Connection(connectionID, rect1, rect2));
    }
    
    AddVariable(container, name, label){
        container.AddVariable(name, label);
        this.Reload();
    }

    AddMethod(container, name, label){
        container.AddMethod(name, label);
        this.Reload();
    }

    AddProperty(container, propertyData){
        if(propertyData.isMethod){
            this.AddMethod(container, propertyData.name, propertyData.type, this.#jsondb.MethodToLabel(propertyData));
        }else{
            this.AddVariable(container, propertyData.name, propertyData.type, this.#jsondb.VariableToLabel(propertyData));
        }
    }

    /**
     * ================= TRANSFORM =================
     */

    ResizeContainer(container, referencePoint, finalPos){
        container.Resize(referencePoint, finalPos);
        this.#gl.MakeDirty(container);
        const containers = this.#jsondb.containers;
        const connections = [].concat(containers[container.name].connectionsIn, containers[container.name].connectionsOut);
        for(let con of this.#objectsInScene){
            if(!(con instanceof Connection)) continue;
            if(connections.includes(con.id)){
                this.#gl.MakeDirty(con);
            }
        }
        this.Refresh();
    }

    TranslateContainer(container, finalPos){
        container.Translate(finalPos);
        this.#gl.MakeDirty(container);
        const containers = this.#jsondb.containers;
        const connections = [].concat(containers[container.name].connectionsIn, containers[container.name].connectionsOut);
        for(let con of this.#objectsInScene){
            if(!(con instanceof Connection)) continue;
            if(connections.includes(con.id)){
                this.#gl.MakeDirty(con);
            }
        }

        this.Refresh();
    }

    /**
     * ================= HIDE / SHOW =================
     */

    HideObject(rect){
        rect.Hide();
        this.Reload();
    }

    ShowObject(rect){
        rect.Show();
        this.Reload();
    }

    ToggleObjectVisibility(rect){
        if(rect.enabled) this.HideObject(rect);
        else this.ShowObject(rect);
    }

    ShowAllObjects(){
        for(let obj of this.objectsInScene){
            obj.Show();
        }
        this.Reload();
    }

    //Obsolete
    PreviewContainer(pos1, pos2){
        return;
        if(!this.#previewConnectionRendererEnabled){
            this.#previewConnectionRendererEnabled = true;
            this.#gl.ComplexBatch();
        }
        this.#previewConnection.Resize(pos1, pos2);
        this.#gl.QueueSceneRedraw();
    }

    HideResizeHandles(){
        for(let obj of this.#objectsInScene){
            if(!(obj instanceof Container)) continue;
            for(let rh of obj.resizeHandles) rh.Hide();
        }
    }

    ShowResizeHandles(){
        for(let obj of this.#objectsInScene){
            if(!(obj instanceof Container)) continue;
            for(let rh of obj.resizeHandles) rh.Show();
        }
    }

    HidePropertySockets(){
        for(let obj of this.#objectsInScene){
            if(!(obj instanceof Container)) continue;
            for(let pr of obj.variableHandles){ pr.socketIn.Hide(); pr.socketOut.Hide(); }
            for(let pr of obj.methodHandles){ pr.socketIn.Hide(); pr.socketOut.Hide(); }
        }
    }

    ShowPropertySockets(){
        for(let obj of this.#objectsInScene){
            if(!(obj instanceof Container)) continue;
            for(let pr of obj.variableHandles){ pr.socketIn.Show(); pr.socketOut.Show(); }
            for(let pr of obj.methodHandles){ pr.socketIn.Show(); pr.socketOut.Show(); }
        }
    }

    /**
     * ================= TESTS =================
     */

    #testRoutine;
    GraphicsTest(){
        this.#testRoutine = setInterval(this.Refresh, (1 / 200) * 1000);
    }

    GraphicsTestStop(){
        clearInterval(this.#testRoutine);
    }
}