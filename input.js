const InputSystem = {
    Create : 0,
    Transform : 1,
    Delete : 2
}

class EventHandler {
    #handler = [];
    constructor(type, listener){
        this.#handler[0] = type;
        this.#handler[1] = listener;
    }

    get type(){
        return this.#handler[0];
    }

    get listener(){
        return this.#handler[1];
    }
}

class InputActions {
    #scene;
    get scene(){
        return this.#scene;
    }

    type;
    _clickPoint;

    constructor(scene){
        this.#scene = scene;
    }

    onKeyDown = e => {
        this.OnKeyDown(e.key);
    }

    mouseDown = e => {
        switch(e.button){
            case 0: this.OnMouseLeftDown(e); return;
            case 1: this.OnMouseMiddleDown(e); return;
            case 2: this.OnMouseRightDown(e); return;
        }
    }
    
    mouseMove = e => {
        this.OnMouseMove(e);
    }
    
    mouseUp = e => {
        switch(e.button){
            case 0: this.OnMouseLeftUp(e); return;
            case 1: this.OnMouseMiddleUp(e); return;
            case 2: this.OnMouseRightUp(e); return;
        }
    }
    
    mouseScroll = e => {
        this.OnMouseScroll(e);
    }

    OnKeyDown(e){}

    OnMouseLeftDown(e){}
    OnMouseMiddleDown(e){}
    OnMouseRightDown(e){}
    OnMouseMove(e){}
    OnMouseLeftUp(e){}
    OnMouseMiddleUp(e){}
    OnMouseRightUp(e){}
    OnMouseScroll(e){}
}

class InputManager {
    #scene;
    #activeSystem = {inputSystem : -1, tool : 0};
    get activeInputSystem(){
        return this.#activeSystem;
    }

    #eventHandlerStack = [];

    #GlobalInputHandler;
    #CreateHandler;
    #TransformHandler;
    #DeleteHandler;

    constructor(scene, parser){
        this.#scene = scene;
        this.#GlobalInputHandler = new GlobalInputHandler(scene);
        this.#CreateHandler = new CreateHandler(scene, parser);
        this.#TransformHandler = new TransformHandler(scene);
        this.#DeleteHandler = new DeleteHandler(scene);
    }

    SwitchSystem(targetInputSystem, indexOfTool){
        Debug.Log("Tool: ", targetInputSystem, indexOfTool);

        this.#UpdateToolType(targetInputSystem, indexOfTool);

        //If the target input system is already active, return.
        if(this.#activeSystem.inputSystem === targetInputSystem) return;

        this.#activeSystem.inputSystem = targetInputSystem;

        //Reset all event listeners
        this.#UnsubscribeFromAllEvents();

        //Requeue the global event listeners
        this.#AddGlobalEvents();

        //Queue the event listeners of the selected tool
        switch(this.#activeSystem.inputSystem){
            case InputSystem.Create:
                this.#AddCreateEvents(); break;
            case InputSystem.Transform:
                this.#AddTransformEvents(); break;
            case InputSystem.Delete:
                this.#AddDeleteEvents(); break;
        }
        
        //Activate all queued event listeners
        this.#SubscribeToAllEvents();
    }

    #UpdateToolType(targetInputSystem, toolIndex){
        this.#activeSystem.tool = toolIndex;
        switch(targetInputSystem){
            case InputSystem.Create: this.#CreateHandler.type = toolIndex; break;
            case InputSystem.Transform: this.#TransformHandler.type = toolIndex; break;
        }
        this.#OnToolChanged(targetInputSystem, toolIndex);
    }
    
    #OnToolChanged(inputSystem, tool){
        this.#scene.HideResizeHandles();
        this.#scene.HidePropertySockets();
        switch(inputSystem){
            case InputSystem.Transform: switch(tool){
                    case Tools.transform_scale: this.#scene.ShowResizeHandles(); break;
                } break;
            case InputSystem.Create: switch(tool){
                    case Tools.create_connection: this.#scene.ShowPropertySockets(); break;
                } break;
        }
    }
    
    #PushEventHandler(handler){
        this.#eventHandlerStack.push(handler);
    }

    #SubscribeToAllEvents(){
        for(let handle of this.#eventHandlerStack){
            canvas.addEventListener(handle.type, handle.listener);
        }
    }

    #UnsubscribeFromAllEvents(){
        while(this.#eventHandlerStack.length > 0){
            let handle = this.#eventHandlerStack.pop();
            canvas.removeEventListener(handle.type, handle.listener);
        }
    }

    #AddGlobalEvents(){ //Event listeners that persist no matter the selected Tool
        this.#PushEventHandler(new EventHandler('keydown', this.#GlobalInputHandler.onKeyDown));
        this.#PushEventHandler(new EventHandler('mousedown', this.#GlobalInputHandler.mouseDown));
        this.#PushEventHandler(new EventHandler('mousemove', this.#GlobalInputHandler.mouseMove));
        this.#PushEventHandler(new EventHandler('mouseup', this.#GlobalInputHandler.mouseUp));
        this.#PushEventHandler(new EventHandler('wheel', this.#GlobalInputHandler.mouseScroll));
    }

    #AddCreateEvents(){
        this.#PushEventHandler(new EventHandler('mousedown', this.#CreateHandler.mouseDown));
        this.#PushEventHandler(new EventHandler('mousemove', this.#CreateHandler.mouseMove));
        this.#PushEventHandler(new EventHandler('mouseup', this.#CreateHandler.mouseUp));
    }

    #AddTransformEvents(){
        this.#PushEventHandler(new EventHandler('mousedown', this.#TransformHandler.mouseDown));
        this.#PushEventHandler(new EventHandler('mousemove', this.#TransformHandler.mouseMove));
        this.#PushEventHandler(new EventHandler('mouseup', this.#TransformHandler.mouseUp));
    }

    #AddDeleteEvents(){
        this.#PushEventHandler(new EventHandler('mouseup', this.#DeleteHandler.mouseUp));
    }
}

class GlobalInputHandler extends InputActions {
    #isPanning = false;

    OnKeyDown(e){
        if(e == 'c'){
            Debug.ToggleDebugMode();
        }
        if(e == 't'){
            this.scene.GraphicsTest();
        }
        if(e == 'p'){
            this.scene.GraphicsTestStop();
        }
        if(e == 'e'){
            switchInputSystem(InputSystem.Create, Tools.create_enum);
        }
        if(e == 'l'){
            switchInputSystem(InputSystem.Create, Tools.create_connection);
        }
        if(e == 's'){
            switchInputSystem(InputSystem.Transform, Tools.transform_scale);
        }
    }

    OnMouseMiddleDown(e){
        this._clickPoint = new Vector2(
            (e.offsetX - (canvas.width / 2)),
            (-e.offsetY + (canvas.height / 2))
        );
        this.#isPanning = true;
    }

    OnMouseMove(e){
        Debug.Log("Mouse Coordinates (screen space): ", e.offsetX, e.offsetY);
        Debug.Log("Mouse Coordinates (world space): ",  Math.round(VecMath.ScreenSpaceToWorldSpace(e.offsetX, e.offsetY).x * 100) / 100,
                                                        Math.round(VecMath.ScreenSpaceToWorldSpace(e.offsetX, e.offsetY).y * 100) / 100);
        if(this.#isPanning){
            let temp = new Vector2(
                (e.offsetX - (canvas.width / 2)),
                (-e.offsetY + (canvas.height / 2))
            );
            this.scene.camera.Pan(
                (temp.x - this._clickPoint.x), 
                (temp.y - this._clickPoint.y)
            );
            this._clickPoint.x = temp.x;
            this._clickPoint.y = temp.y;
            this.scene.Refresh();
        }
    }

    OnMouseMiddleUp(e){
        this.#isPanning = false;
    }

    OnMouseScroll(e){
        let scale = e.deltaY * -0.0007;
        if((scale < 0 && this.scene.camera.zoom === System.gl_zoom_min) || (scale > 0 && this.scene.camera.zoom === System.gl_zoom_max)) return;
        this.scene.camera.zoom = Math.min(Math.max(System.gl_zoom_min, this.scene.camera.zoom + scale), System.gl_zoom_max); //Restrict scale between [System.gl_zoom_min, System.gl_zoom_max]
        this.scene.Refresh();
    }
}

class CreateHandler extends InputActions {
    #parser;
    #selectedRectangle = null;
    #isDrawing = false;

    constructor(scene, parser){
        super(scene);
        this.#parser = parser;
    }

    #GetUserInput(message){
        return prompt(message);
    }

    #RequestClassName(){
        return this.#GetUserInput("Class name:");
    }

    OnMouseLeftDown(e){
        this._clickPoint = VecMath.ScreenSpaceToWorldSpace(e.offsetX, e.offsetY);
        this.#selectedRectangle = this.scene.GetClickedRectangle(this._clickPoint);
        if(this.#selectedRectangle != null){
            switch(this.type){
                //If the user is trying to Add a Property
                case Tools.add_property:
                    if(this.#selectedRectangle.hitbox == Hitbox.body || 
                            this.#selectedRectangle.hitbox == Hitbox.translate || 
                            this.#selectedRectangle.hitbox == Hitbox.property
                        ){
                        const input = this.#GetUserInput("Add a property:");
                        const data = this.#parser.VerifyUserInput(input);
                        if(data === null){ alert("Incorrect syntax."); return; }
                        this.#parser.UpdateDB(this.#selectedRectangle.parent.name, data);
                        let modifiedContainers = [this.#selectedRectangle.parent.name];
                        data.connectionData.forEach(element => {
                            modifiedContainers.push(element.targetName);
                        });
                        console.log(data);
                        console.log(modifiedContainers);
                        this.scene.UpdateContainers(modifiedContainers);
                    }
                    break;

                //If the user is trying to Create a Connection
                case Tools.create_connection:
                    this.#selectedRectangle = this.scene.GetClickedRectangle(this._clickPoint);
                    if(this.#selectedRectangle.parent instanceof PropertyHandle) this.#isDrawing = true;
                    break;
            }
        }else{
            if(this.type == Tools.create_class || this.type == Tools.create_abstract || this.type == Tools.create_enum || this.type == Tools.create_main){
                const name = this.#RequestClassName();
                if(name === null){ return; }
                this.scene.CreateNewContainer(this._clickPoint, name, this.type);
            }
        }
    }

    OnMouseMove(e){
        if(this.#isDrawing){
            this.scene.PreviewContainer(
                this._clickPoint, 
                VecMath.ScreenSpaceToWorldSpace(e.offsetX, e.offsetY)
            );
        }
    }

    OnMouseLeftUp(e){
        if(this.#isDrawing){
            this.#isDrawing = false;

            if(this.type == Tools.create_connection){
                let firstReference = this.#selectedRectangle;

                let secondReference = this.scene.GetClickedRectangle(VecMath.ScreenSpaceToWorldSpace(e.offsetX, e.offsetY));
                if(secondReference == null || !(secondReference.parent instanceof PropertyHandle)) return;
                console.log(firstReference, secondReference);

                if(firstReference.hitbox == Hitbox.socket_in && secondReference.hitbox == Hitbox.socket_in){ alert("In and In"); return; }
                if(firstReference.hitbox == Hitbox.socket_out && secondReference.hitbox == Hitbox.socket_out){ alert("Out and Out"); return; }

                if(firstReference.hitbox == Hitbox.socket_in) this.scene.CreateNewConnection(firstReference.parent.socketIn, secondReference.parent.socketOut);
                if(firstReference.hitbox == Hitbox.socket_out) this.scene.CreateNewConnection(firstReference.parent.socketOut, secondReference.parent.socketIn);
                return;
            }
        }
    }
}

class TransformHandler extends InputActions {
    #selectedRectangle = null;
    #distanceFromOrigin = null;

    #isResizing = false;
    #isTranslating = false;
    #isStealingProperty = false;

    OnMouseLeftDown(e){
        this._clickPoint = VecMath.ScreenSpaceToWorldSpace(e.offsetX, e.offsetY);
        this.#selectedRectangle = this.scene.GetClickedRectangle(this._clickPoint);

        //If no rectangle was found under the cursor, return.
        if(this.#selectedRectangle == null) return;

        //Select tool
        if(this.type == Tools.select){
            //Translate Action
            if(this.#selectedRectangle.hitbox == Hitbox.translate){
                this.#distanceFromOrigin = new Vector2(this._clickPoint.x - this.#selectedRectangle.parent.position.x, this._clickPoint.y - this.#selectedRectangle.parent.position.y);
                this.#isTranslating = true;
                return;
            }
            
            //Hide / Show Action
            if(this.#selectedRectangle.hitbox == Hitbox.visibility){
                this.scene.ToggleObjectVisibility(this.#selectedRectangle.parent);
                return;
            }

            //Steal Property Action
            if(this.#selectedRectangle.hitbox == Hitbox.property){
                this.#distanceFromOrigin = new Vector2(Defaults.container_width / 2, -Defaults.target_letter_texture_height / 2);
                //this.#selectedRectangle.collider.parent.SliceProperty()
                console.log(this.#selectedRectangle.collider.text);
                this.#selectedRectangle.collider.ChangeParent(SceneMesh.scene, SceneMesh.origin);
                this.#isStealingProperty = true;
            }
        }

        //If Scale tool is active and the selected rectangle is a Resize handle
        if(this.type == Tools.transform_scale){
            this.#isResizing = true;
            switch(this.#selectedRectangle.hitbox){
                case Hitbox.resizeTL: this.#distanceFromOrigin = new Vector2(this.#selectedRectangle.parent.BR.x, this.#selectedRectangle.parent.BR.y); return;
                case Hitbox.resizeTR: this.#distanceFromOrigin = new Vector2(this.#selectedRectangle.parent.BL.x, this.#selectedRectangle.parent.BL.y); return;
                case Hitbox.resizeBR: this.#distanceFromOrigin = new Vector2(this.#selectedRectangle.parent.TL.x, this.#selectedRectangle.parent.TL.y); return;
                case Hitbox.resizeBL: this.#distanceFromOrigin = new Vector2(this.#selectedRectangle.parent.TR.x, this.#selectedRectangle.parent.TR.y); return;
            }
            this.#isResizing = false;
        }
    }

    OnMouseMove(e){
        if(this.#isResizing){ this.scene.ResizeContainer(this.#selectedRectangle.parent, this.#distanceFromOrigin, VecMath.ScreenSpaceToWorldSpace(e.offsetX, e.offsetY)); }
        if(this.#isTranslating){ this.scene.TranslateContainer(this.#selectedRectangle.parent, VecMath.ScreenSpaceToWorldSpace(e.offsetX, e.offsetY).Subtract(this.#distanceFromOrigin)); }
        if(this.#isStealingProperty){
            const mouseLocation = VecMath.ScreenSpaceToWorldSpace(e.offsetX, e.offsetY);
            this.#distanceFromOrigin.x = mouseLocation.x - this.#distanceFromOrigin.x;
            this.#distanceFromOrigin.y = mouseLocation.y - this.#distanceFromOrigin.y;
            this.#selectedRectangle.collider.Translate(this.#distanceFromOrigin);

            this.scene.Refresh();
        }
    }

    OnMouseLeftUp(e){
        if(this.#isResizing){ this.#isResizing = false; this.scene.Reload(); }
        if(this.#isTranslating){ this.#isTranslating = false; this.scene.Reload(); }
        if(this.#isStealingProperty){
            this.#isStealingProperty = false; 
            this.#selectedRectangle.collider.Translate(new Vector2(Defaults.container_width / 2, -Defaults.target_letter_texture_height / 2));
            this.scene.Reload();
        }
    }
}

class DeleteHandler extends InputActions {
    OnMouseLeftUp(e){
        let selectedRectangle = this.scene.GetClickedRectangle(VecMath.ScreenSpaceToWorldSpace(e.offsetX, e.offsetY));
        if(selectedRectangle != null && confirm("Do you wish to delete this container?")){
            this.scene.Destroy(selectedRectangle.parent);
        }
    }
}