class Renderer {
    #enabled = true;
    get enabled(){
        return this.#enabled;
    }

    #renderPropertiesArray;
    get renderPropertiesArray(){
        return this.#renderPropertiesArray;
    }

    get shape(){
        throw new Error("Not implemented");
    }

    get objectData(){
        return [this];
    }

    constructor(renderProperties){
        this.#renderPropertiesArray = renderProperties;
        this.#enabled = true;
    }
    
    Hide(){
        this.#enabled = false;
    }
    
    Show(){
        this.#enabled = true;
    }
}

class Vertex extends Vector2 {
    static #collection = [];
    static OnRenderFinished(){
        for(let v of Vertex.#collection){
            v.#positionHasBeenCalled = false;
        }
    }

    #referenceOrigin;
    #offset;
    #scale;
    #positionHasBeenCalled = false;

    get x(){
        this.#UpdatePosition();
        return super.x;
    }

    get y(){
        this.#UpdatePosition();
        return super.y;
    }

    set x(value){
        super.x = value;
    }

    set y(value){
        super.y = value;
    }

    constructor(origin, offset, scale = new Vector2(1, 1)){
        if( ! (origin instanceof Vector2) && ! (origin instanceof FixedVector2)) throw new Error();
        super(1, 1);
        this.#referenceOrigin = origin;
        this.#offset = offset;
        this.#scale = scale;

        Vertex.#collection.push(this);
    }

    #UpdatePosition(){
        if(this.#positionHasBeenCalled) { return; };

        super.x = this.#referenceOrigin.x + (this.#offset.x * this.#scale.x);
        super.y = this.#referenceOrigin.y + (this.#offset.y * this.#scale.y);
        this.#positionHasBeenCalled = true;
    }

    Translate(destination){
        if( ! (destination instanceof Vector2)) throw new Error("not a Vector2");
        this.#referenceOrigin.x = destination.x;
        this.#referenceOrigin.y = destination.y;
    }

    Move(destination){
        if( ! (destination instanceof Vector2)) throw new Error("not a Vector2");
        this.#offset.x = destination.x;
        this.#offset.y = destination.y;
    }
}

class Transform {
    localMatrix = Matrix.identity;
    worldMatrix = Matrix.identity;
    parent;
    children = [];
    dimensions;
    mesh;
    updateMethod = this.updateWorldMatrixScaleXY;

    get origin(){
        return {
            x: worldMatrix[6],
            y: worldMatrix[7]
        }
    }

    constructor(mesh){
        this.mesh = mesh;
    }
    
    setParent(parent) {
        // remove us from our parent
        if (this.parent) {
            var ndx = this.parent.transform.children.indexOf(this);
            if (ndx >= 0) {
                this.parent.transform.children.splice(ndx, 1);
            }
        }

        // Add us to our new parent
        if (parent) {
            parent.transform.children.push(this);
        }
        this.parent = parent;
    }

    updateWorldMatrix(parentWorldMatrix) {
        this.updateMethod(parentWorldMatrix);
    }

    updateWorldMatrixScaleXY(parentWorldMatrix){
        if (parentWorldMatrix) {
            Matrix.copy(Matrix.multiply(parentWorldMatrix, this.localMatrix), this.worldMatrix);
        } else {
            Matrix.copy(this.localMatrix, this.worldMatrix);
        }

        var worldMatrix = this.worldMatrix;
        this.children.forEach(function(child) {
            child.updateWorldMatrix(worldMatrix);
        });
    }

    updateWorldMatrixScaleX(parentWorldMatrix){
        if (parentWorldMatrix) {
            let copy = new Array(9);
            Matrix.copy(parentWorldMatrix, copy);
            copy[4] = 1;
            this.worldMatrix = Matrix.multiply(copy, this.localMatrix);
        } else {
            Matrix.copy(this.localMatrix, this.worldMatrix);
        }

        var worldMatrix = this.worldMatrix;
        this.children.forEach(function(child) {
            child.updateWorldMatrix(worldMatrix);
        });
    }

    updateWorldMatrixScaleY(parentWorldMatrix){
        if (parentWorldMatrix) {
            let copy = new Array(9);
            Matrix.copy(parentWorldMatrix, copy);
            copy[0] = 1;
            this.worldMatrix = Matrix.multiply(copy, this.localMatrix);
        } else {
            Matrix.copy(this.localMatrix, this.worldMatrix);
        }

        var worldMatrix = this.worldMatrix;
        this.children.forEach(function(child) {
            child.updateWorldMatrix(worldMatrix);
        });
    }

    updateWorldMatrixIgnoreScale(parentWorldMatrix){
        if (parentWorldMatrix) {
            Matrix.copy(parentWorldMatrix, this.worldMatrix);
            Matrix.setScale(this.worldMatrix, 1, 1);
            this.worldMatrix = Matrix.multiply(this.worldMatrix, this.localMatrix);
        } else {
            Matrix.copy(this.localMatrix, this.worldMatrix);
        }

        var worldMatrix = this.worldMatrix;
        this.children.forEach(function(child) {
            child.updateWorldMatrix(worldMatrix);
        });
    }
}

class Mesh extends Renderer {
    #transform = new Transform(this);
    #scaleInheritanceMap;

    get transform(){
        return this.#transform;
    }

    get position(){
        return {
            x: this.#transform.worldMatrix[6],
            y: this.#transform.worldMatrix[7]
        }
    }

    constructor(parent, offset, scale, renderPropertiesArray){
        super(renderPropertiesArray);
        this.#transform.setParent(parent);
        Matrix.translate(this.#transform.localMatrix, offset.x, offset.y);
        Matrix.scale(this.#transform.localMatrix, scale.x, scale.y);
        
        //this.#scaleInheritanceMap = transform.scaleInheritanceMap;
        //this.#scale = this.#CalculateScale();
    }

    #CalculatePosition(origin){
        //return (this.#parent instanceof SceneMesh) ? new Vertex(origin, this.#offset, this.#parent.scale) : new Vertex(origin, this.#offset, this.#scale);
        //return new Vertex(origin, this.#offset, this.#parent.scale);
    }

    #CalculateScale(){
        let parentMultiplier = new Vector2(0, 0);
        let localMultiplier = new Vector2(0, 0);
        let parentOffset = new Vector2(0, 0);
        let localOffset = new Vector2(0, 0);


        if(this.#scaleInheritanceMap.x == Scale.Default)        { parentMultiplier.x = 1; localMultiplier.x = 1; }
        else if(this.#scaleInheritanceMap.x == Scale.Inherit)   { parentMultiplier.x = 1; localOffset.x = 1; }
        else if(this.#scaleInheritanceMap.x == Scale.Local)     { localMultiplier.x = 1; parentOffset.x = 1;}
        
        if(this.#scaleInheritanceMap.y == Scale.Default)        { parentMultiplier.y = 1; localMultiplier.y = 1; }
        else if(this.#scaleInheritanceMap.y == Scale.Inherit)   { parentMultiplier.y = 1; localOffset.y = 1; }
        else if(this.#scaleInheritanceMap.y == Scale.Local)     { localMultiplier.y = 1; parentOffset.y = 1; }

        let parentScale;
        if(parentMultiplier.x == 0 && parentMultiplier.y == 0){ parentScale = FixedVector2.one; }
        else { parentScale = new Vertex(parentOffset, this.#transform.parent.scale, parentMultiplier); }

        let localScale;
        if(localMultiplier.x == 0 && localMultiplier.y == 0){ localScale = FixedVector2.one; }
        else { localScale = new Vertex(localOffset, this.#transform, localMultiplier); }
        
        return new Vertex(FixedVector2.zero, parentScale, localScale);
    }

    /*Scale(...values){
        if(values[0] instanceof Vector2){
            if(values.length > 1) throw new Error("too many arguments");
            this.#localScale.x = values[0].x;
            this.#localScale.y = values[0].y;
            return;
        }
        if(values.length > 2) throw new Error("too many arguments");
        if(values.length == 2){
            this.#localScale.x = values[0];
            this.#localScale.y = values[1];
            return;
        }
        this.#localScale.x = values[0];
        this.#localScale.y = values[0];
    }*/
}

class Rectangle extends Mesh {
    #dimensions;
    get dimensions(){
        return this.#dimensions;
    }

    get TL(){
        return new Vector2(-1, 1);
    }

    get TR(){
        return new Vector2(1, 1);
    }

    get BR(){
        return new Vector2(1, -1);
    }

    get BL(){
        return new Vector2(-1, -1);
    }

    get shape(){
        return this.transform.worldMatrix;
    }

    constructor(parent, offset, scale, renderPropertiesArray){
        if( ! renderPropertiesArray) throw new Error();
        super(parent, offset, scale, renderPropertiesArray);
        this.#dimensions = new Vertex(Vector2.zero, this.scale, this.scale);
    }

    Resize(vecA, vecB){
        //let scaleX = Math.abs(vecB.x - vecA.x) / this.scale.x;
        //let scaleY = Math.abs(vecB.y - vecA.y) / this.scale.y;
        let scaleX = 1;
        let scaleY = 1;
        //this.Scale(scaleX, scaleY);
        //this.Translate(new Vector2((vecA.x + vecB.x) / 2, (vecA.y + vecB.y) / 2));
    }
}

class SceneMesh {
    static transform = new Transform();
}