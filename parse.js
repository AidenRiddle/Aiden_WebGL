class Stack {
    #stack = [];

    get length(){
        return this.#stack.length;
    }

    push(value){
        this.#stack.push(value);
        return value;
    }

    pop(){
        return this.#stack.pop();
    }

    dump(){
        let copy = this.#stack.slice();
        this.#stack = [];
        return copy;
    }

    get size(){
        return this.#stack.length;
    }
}

class Parser {
    #scene;
    #jsondb;
    #primitives = Java.primitives;
    #containerPos = new Vector2(0, 0);

    constructor(scene, jsondb){
        this.#scene = scene;
        this.#jsondb = jsondb;
    }

    #StringToTokenStream(string){
        //Deletes all comments
        let thinned = string.replaceAll(Java.regex_comments, "");

        //Deletes all unneccessary whitespace
        let skimmed = thinned.replaceAll(Java.regex_whitespace, "");

        //Splits the final text into tokens
        let returnObject = skimmed.split(Java.regex_token_separator);

        //Deletes all "undefined" and empty tokens
        returnObject = returnObject.filter(function(element) {return element !== undefined && element.length > 0; });
        console.log(returnObject);

        return returnObject;
    }

    //We assume that the 'instruction' has proper syntax
    #GetTypeAndName(instruction){
        const p = Java.access_modifiers;
        const regType = /\w+/;
        const regName = /\w+/;

        let i = 0;
        let access = "";

        //If an access modifier is present, increment i.
        if(p.includes(instruction[i])){
            //Lazy way of checking if the instruction is a class Constructor
            if(instruction[i] == "public" && instruction.length == 2){
                const type = instruction[i+1].match(regType)[0];
                return { type : type, name : type, access : "public" }; 
            };
            access = instruction[i];
            i++;
        }

        const varType = instruction[i].match(regType)[0];
        i++;
        const varName = instruction[i].match(regName)[0];
        return { type: varType, name : varName, access : access };
    }

    UpdateDB(container, payload){
        if(payload.data.isMethod){
            this.#jsondb.AddMethod(container, payload.data.name, payload.data.type, payload.data.access, payload.data.props);
        }else{
            this.#jsondb.AddVariable(container, payload.data.name, payload.data.type, payload.data.access, payload.data.props);
        }
        for(let connectionData of payload.connectionData){
            if(connectionData.targetName === undefined ||
                connectionData.targetName == container) continue;
            
            this.#jsondb.CreateContainer(connectionData.targetName, ContainerType.Class);
            this.#jsondb.CreateConnection(container, connectionData.from, connectionData.targetName, connectionData.to);
        }
    }

    //  !!!     Modifies the contents of its parameter stream     !!!
    //Parses all the instructions of a file before the actual class description.
    #ParseImports(stream){
        let tinyTokenStack = [];
        while(stream.length > 0){
            let token = stream.shift();
            if(token == ";"){ tinyTokenStack = []; continue; }
            if(token == "{"){
                console.log(tinyTokenStack);
                let i = 0;
                if(Java.access_modifiers.includes(tinyTokenStack[i])) i++;
                switch(tinyTokenStack[i]){
                    case "abstract": this.#jsondb.CreateContainer(tinyTokenStack[i+1], ContainerType.Abstract);
                    case "enum": this.#jsondb.CreateContainer(tinyTokenStack[i+1], ContainerType.Enum);
                    default: 
                        if(tinyTokenStack[i+1] == "Main") this.#jsondb.CreateContainer(tinyTokenStack[i+1], ContainerType.Main);
                        else this.#jsondb.CreateContainer(tinyTokenStack[i+1], ContainerType.Class);
                }
                return tinyTokenStack[i+1];
            }
            tinyTokenStack.push(token);
        }
        throw new Error("Error in file");
    }

    //Used in the Input class to interpret direct instructions from the user
    //Interprets a single line instruction
    #InterpretInstruction(tokenStream){
        //Verify instruction validity
        if(tokenStream.length < 2) return null;

        //Split instruction into sub-instructions and extract data
        const stopper = ';';
        const variablePropIdentifier = '=';
        const methodIdentifier = '(';
        let data = {};
        let paramParent = [];
        let args = [];
        let subInstruction = [];
        let isMethod = false;
        for(let i = 0; i < tokenStream.length; i++){
            let token = tokenStream[i];

            if(stopper == token){
                break;
            }

            if(variablePropIdentifier == token){
                let props = "";
                i++;
                while(i < tokenStream.length && stopper != tokenStream[i]){ props += tokenStream[i] + " "; i++; }
                i--;
                props = props.slice(0, -1);

                let property = this.#GetTypeAndName(subInstruction);
                Object.assign(data, property, { isMethod : false, props : props });
                subInstruction = [];
                break;
            }
            
            if(isMethod){
                if(')' == token){
                    if(subInstruction.length != 0){
                        let property = this.#GetTypeAndName(subInstruction);
                        args.push({name : property.name, type : property.type});
                    }
                    let props = "";
                    if(args.length != 0){
                        args.forEach((arg) =>{
                            props += arg.type + " " + arg.name + ", ";
                        });
                        props = props.slice(0, -2); 
                    }
                    Object.assign(data, paramParent, { isMethod : true, props : props });
                    subInstruction = [];
                    break;
                }
                if(',' == token){
                    let property = this.#GetTypeAndName(subInstruction);
                    args.push({name : property.name, type : property.type});
                    subInstruction = [];
                    continue;
                }
            }

            if(methodIdentifier.includes(token)){
                isMethod = true;
                let property = this.#GetTypeAndName(subInstruction);
                paramParent = { name : property.name, type : property.type};
                Object.assign(paramParent, property);
                subInstruction = [];
                continue; 
            }

            subInstruction.push(token);
        }
        if(subInstruction.length != 0){
            let property = this.#GetTypeAndName(subInstruction);
            Object.assign(data, property, { isMethod : false, props : "" });
        }

        //Establish connection data
        let connectionData = [];
        if( ! Java.primitives.includes(data.type)) connectionData.push({ from : data.name, targetName : data.type, to : "" });
        if(isMethod){
            args.forEach((arg) =>{
                if( ! Java.primitives.includes(arg.type)) connectionData.push({from : data.name, targetName : arg.type, to : "" });
            });
        }
        
        return { data, connectionData };
    }

    #InterpretStack = (fileContents, container) => {
        let instruction = [];
        let bracketCounter = 0;
        for(let i = 0; i < fileContents.length; i++){
            let token = fileContents[i];
            if(token == '{'){
                bracketCounter++;
                i++;
                while(i < fileContents.length){
                    if(fileContents[i] == '{') bracketCounter++;
                    if(fileContents[i] == '}'){
                        bracketCounter--;
                        if(bracketCounter == 0) break;
                    }
                    i++; 
                }
                token = ';';
            }

            if(token == ';'){
                if(instruction === null || instruction.length == 0) continue;
                let interpretation = this.#InterpretInstruction(instruction);
                this.UpdateDB(container, interpretation);
                instruction = [];
                continue;
            }
            instruction.push(token);
        }
    }

    #FetchFile = () => {
        let i = 0;
        let files = document.getElementById("file").files;
        if(files.length == 0) return;
        let listOfNames = [];
        let fileName;
        let fileReader = new FileReader();
        let container;
        let tokenStream;
        fileReader.onloadend = (e) => {
            tokenStream = this.#StringToTokenStream(e.target.result);
            container = this.#ParseImports(tokenStream);
            this.#InterpretStack(tokenStream, container);
            i++;
            if(i < files.length){
                fileName = files[i].name.split('.')[0];     //Gets the file name by cutting off the extension (i.e Parser.java -> Parser).
                if(listOfNames.includes(fileName)) { alert("Multiple definitions found for class:     " + fileName); return; }
                listOfNames.push(fileName);
                fileReader.readAsText(files[i]);
            }

            this.#scene.MakeSceneFromDatabase();
        }
        fileName = files[i].name.split('.')[0];
        listOfNames.push(fileName);
        fileReader.readAsText(files[i]);
    }

    VerifyUserInput(inputString){
        const tokenStream = this.#StringToTokenStream(inputString);
        if(tokenStream[tokenStream.length - 1] == '(') tokenStream.push(')');
        return this.#InterpretInstruction(tokenStream);
    }

    ParseTest = () => {
        console.log("Test started!");

        setTimeout(this.#FetchFile);
    }
}