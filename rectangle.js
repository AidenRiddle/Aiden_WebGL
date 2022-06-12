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
        return new Vector2(this.worldMatrix[6], this.worldMatrix[7]);
    }

    get localScale(){
        return new Vector2(this.localMatrix[0], this.localMatrix[4]);
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

    scale(x, y){
        Matrix.setScale(this.localMatrix, x, y);
    }

    translate(x, y){
        Matrix.translate(this.localMatrix, x, y);
    }
}

class Mesh extends Renderer {
    #transform = new Transform(this);
    #scaleInheritanceMap;

    get transform(){
        return this.#transform;
    }

    get position(){
        return this.#transform.origin;
    }

    constructor(parent, offset, scale, renderPropertiesArray){
        super(renderPropertiesArray);
        this.#transform.setParent(parent);
        Matrix.translate(this.#transform.localMatrix, offset.x, offset.y);
        Matrix.scale(this.#transform.localMatrix, scale.x, scale.y);
    }

    scale(x, y){
        this.#transform.scale(x, y);
    }

    translate(x, y){
        const pos = this.position;
        this.#transform.translate(pos.x + x, pos.y + y);
    }

    moveTo(x, y){
        this.#transform.translate(x, y);
    }
}

class Rectangle extends Mesh {
    get dimensions(){
        return new Vector2(this.transform.worldMatrix[0], this.transform.worldMatrix[4]);
    }

    get TL(){
        return new Vector2(-0.5, 0.5);
    }

    get TR(){
        return new Vector2(0.5, 0.5);
    }

    get BR(){
        return new Vector2(0.5, -0.5);
    }

    get BL(){
        return new Vector2(-0.5, -0.5);
    }

    constructor(parent, offset, scale, renderPropertiesArray){
        if( ! renderPropertiesArray) throw new Error();
        super(parent, offset, scale, renderPropertiesArray);
    }

    Resize(vecA, vecB){
        let newScale = [
            Math.abs(vecB.x - vecA.x),
            Math.abs(vecB.y - vecA.y)
        ]
        this.scale(newScale[0], newScale[1]);

        let newPos = [
            (vecA.x + vecB.x) / 2, 
            (vecA.y + vecB.y) / 2
        ]
        this.moveTo(newPos[0], newPos[1]);
    }
}

class SceneMesh {
    static transform = new Transform();
}