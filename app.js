"use strict";

const canvas = document.getElementById("RenderCanvas");

Debug.StartCounter("Frames Skipped ");
Debug.StartAverage("Avg Frame Time (ms): ", 50);

function switchInputSystem(inputSystem, indexOfTool = 0){ //Function used with HTML buttons.
    app.SwitchInputSystem(inputSystem, indexOfTool);
}

function ShowAll(){
    app.ShowAll();
}

function ParseFile(){
    app.ParseFile();
}

function SaveScene(){
    app.SaveScene();
}

function DebugJDB(){
    app.PrintJDB();
}

function DebugSceneObjs(){
    app.PrintSceneObjs();
}

class Main {
    #tex;
    #jsondb;
    #gl;
    #scene;
    #inputManager;
    #parser;

    constructor(){
        this.#tex = new TexturePainter();
        this.#jsondb = new JSONDataBase();
        this.#gl = new RGraphics(this.#tex);
        this.#scene = new Scene(this.#gl, this.#jsondb);
        VecMath.scene = this.#scene;
        this.#gl.scene = this.#scene;
        this.#parser = new Parser(this.#scene, this.#jsondb);
        this.#inputManager = new InputManager(this.#scene, this.#parser);
        this.#Main();
    }

    #Main(){
        document.body.onmousedown = function(){return false};  //Disables the scroll 'compass' when clicking with middle mouse
        this.SwitchInputSystem(InputSystem.Create);
        Debug.ToggleDebugMode();
        this.LoadScene(BasicTest);
    }

    ParseFile(){
        console.log("Parsing");
        this.#parser.ParseTest();
    }

    SwitchInputSystem(inputSystem, indexOfTool = 0){ //Function used with HTML buttons.
        this.#inputManager.SwitchSystem(inputSystem, indexOfTool);
        this.#scene.Reload();
    }

    ShowAll(){
        this.#scene.ShowAllObjects();
    }
    
    SaveScene(){
        const storageObj = this.#scene.Export();
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(storageObj));
        var dlAnchorElem = document.getElementById('downloadAnchorElem');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "scene.json");
        dlAnchorElem.click();
    }

    LoadScene(saveFile){
        const loadTimer = performance.now();
        
        //Create containers in Scene using the save file and strip all scene data from the save file.
        this.#scene.MakeSceneFromSaveFile(saveFile);

        //Load the resulting data into jsonDB.
        this.#jsondb.MakeDBFromSaveFile(saveFile);

        console.log("Finished loading scene in " + (performance.now() - loadTimer) + " ms.");
    }

    PrintJDB(){
        this.#jsondb.Print();
    }

    PrintSceneObjs(){
        console.log(this.#scene.objectsInScene);
    }
}

const app = new Main();