class JSONDataBase {
    #jdb = {};

    get containers(){
        //Creates a copy of the database, preventing other classes from directly modifying it.
        return Object.assign({}, this.#jdb.containers);
    }

    get connections(){
        //Creates a copy of the database, preventing other classes from directly modifying it.
        return Object.assign({}, this.#jdb.connections);
    }

    constructor(){
        this.#jdb.connections = {};
        this.#jdb.containers = {};
    }

    Print(){
        //console.clear();
        console.log(this.#jdb);
    }
    
    #CreateVariable(name, type, access, value){
        return { name : name, type : type, access : access, value : value };
    }
    
    #CreateMethod(name, type, access, params){
        return { name : name, type : type, access : access, parameters : params };
    }

    #CreateConnectionID(containerName, fromName, targetName, toName){
        let id = 0;
        let i;
        for(i = 0; i < containerName.length; i++){ id += containerName.charCodeAt(i); }
        for(i = 0; i < fromName.length; i++){ id += fromName.charCodeAt(i); }
        for(i = 0; i < targetName.length; i++){ id += targetName.charCodeAt(i); }
        for(i = 0; i < toName.length; i++){ id += toName.charCodeAt(i); }
        return id;
    }
    
    MakeDBFromSaveFile(saveFile){
        this.#jdb.connections = Object.assign({}, saveFile.connections);
        this.#jdb.containers = Object.assign({}, saveFile.containers);
    }

    AddVariable(containerName, variableName, type, access, value = ""){
        if(this.#jdb.containers[containerName] == undefined){ alert("Container not found: " + containerName); return null }
        const property = this.#CreateVariable(variableName, type, access, value);
        this.#jdb.containers[containerName].variables[variableName] = property;
        return property;
    }

    AddMethod(containerName, methodName, type, access, params = ""){
        if(this.#jdb.containers[containerName] == undefined){ alert("Container not found: " + containerName); return null }
        const property = this.#CreateMethod(methodName, type, access, params);
        this.#jdb.containers[containerName].methods[methodName] = property;
        return property;
    }

    VariableToLabel(property){
        let label = "";
        if(property.access != "") label += property.access + " ";
        label += property.type + " " + property.name;
        if(property.value != "") label += " = " + property.value;
        label += ";";
        return label;
    }

    MethodToLabel(property){
        let label = "";
        if(property.access != "") label += property.access + " ";
        label += property.type + " " + property.name + "(";
        if(property.parameters != "") label += property.parameters;
        label += ");";
        return label;
    }

    CreateContainer(containerName, containerType){
        if(containerName in this.#jdb.containers){ alert("Container \'" + containerName + "\' already exists. Skipping." ); return null; }
        const newContainer = { name : containerName, containerType : containerType, variables : {}, methods : {}, connectionsIn : [], connectionsOut : [] };
        this.#jdb.containers[containerName] = newContainer;
        return newContainer;
    }

    CreateConnection(containerName, fromName, targetName, toName = ""){
        const id = this.#CreateConnectionID(containerName, fromName, targetName, toName);
        if(id in this.#jdb.connections){ alert("Connection \'" + id + "\' already exists. Skipping." ); return null; }

        const from = { name : containerName, property : fromName };
        const to = { name : targetName, property : toName };
        const newConnection = { from : from, to : to };
        this.#jdb.connections[id] = newConnection;
        if(newConnection.from.name === undefined) console.warn(newConnection);
        this.#jdb.containers[from.name].connectionsOut.push(id);
        this.#jdb.containers[to.name].connectionsIn.push(id);
        return id;
    }

    IsContainer(containerName){
        if(this.#jdb.containers[containerName] == undefined) return false;
        return true;
    }
}