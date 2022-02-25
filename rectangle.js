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
    parent;
    origin;
    offset;
    dimensions;
    scale = FixedVector2.one;
    scaleInheritanceMap = { x: Scale.Default, y: Scale.Default };
}

class Mesh extends Renderer {
    #offset;
    
    #parent;
    get parent(){
        return this.#parent;
    }

    #scaleInheritanceMap;
    #localScale;

    #scale;
    get scale(){
        return this.#scale;
    }

    #position;
    get position(){
        return this.#position;
    }

    constructor(transform, renderPropertiesArray){
        super(renderPropertiesArray);
        this.#parent = transform.parent;
        this.#offset = transform.offset;
        
        this.#scaleInheritanceMap = transform.scaleInheritanceMap;
        this.#localScale = transform.scale;
        this.#scale = this.#CalculateScale();

        this.#position = this.#CalculatePosition(transform.origin);
    }

    #CalculatePosition(origin){
        //return (this.#parent instanceof SceneMesh) ? new Vertex(origin, this.#offset, this.#parent.scale) : new Vertex(origin, this.#offset, this.#scale);
        return new Vertex(origin, this.#offset, this.#parent.scale);
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
        else { parentScale = new Vertex(parentOffset, this.#parent.scale, parentMultiplier); }

        let localScale;
        if(localMultiplier.x == 0 && localMultiplier.y == 0){ localScale = FixedVector2.one; }
        else { localScale = new Vertex(localOffset, this.#localScale, localMultiplier); }
        
        return new Vertex(FixedVector2.zero, parentScale, localScale);
    }

    ChangeParent(parent, origin){
        if( ! parent instanceof Mesh) throw new Error("Not a valid parent.");
        this.#parent = parent;
        this.#scale = this.#CalculateScale();
        this.#position = this.#CalculatePosition(origin);
    }

    Translate(destination){
        this.#position.Move(destination);
    }

    Scale(...values){
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
    }
}

class Rectangle extends Mesh {
    #measurements;
    #dimensions;
    get dimensions(){
        return this.#dimensions;
    }

    #TL;
    get TL(){
        return this.#TL;
    }

    #TR;
    get TR(){
        return this.#TR;
    }

    #BR;
    get BR(){
        return this.#BR;
    }

    #BL;
    get BL(){
        return this.#BL;
    }

    get shape(){
        return [
            this.#TL.x, this.#TL.y, 
            this.#TR.x, this.#TR.y,
            this.#BR.x, this.#BR.y,
            this.#BL.x, this.#BL.y
        ]
    }

    constructor(transform, renderPropertiesArray){
        if( ! renderPropertiesArray) throw new Error();
        super(transform, renderPropertiesArray);
        this.#measurements = new Vector2(transform.dimensions.x, transform.dimensions.y);
        this.#dimensions = new Vertex(Vector2.zero, this.#measurements, this.scale);
        const x = this.#measurements.x / 2;
        const y = this.#measurements.y / 2;

        this.#TL = new Vertex(this.position, new Vector2(-x, y), this.scale);
        this.#TR = new Vertex(this.position, new Vector2(x, y), this.scale);
        this.#BR = new Vertex(this.position, new Vector2(x, -y), this.scale);
        this.#BL = new Vertex(this.position, new Vector2(-x, -y), this.scale);
    }

    Resize(vecA, vecB){
        let scaleX = Math.abs(vecB.x - vecA.x) / this.#measurements.x;
        let scaleY = Math.abs(vecB.y - vecA.y) / this.#measurements.y;
        this.Scale(scaleX, scaleY);
        this.Translate(new Vector2((vecA.x + vecB.x) / 2, (vecA.y + vecB.y) / 2));
    }
}

class SceneMesh {
    static scene = new SceneMesh();

    static get origin(){
        return FixedVector2.zero;
    }

    static get scale(){
        return FixedVector2.one;
    }
}