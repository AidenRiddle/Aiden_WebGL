class Connection extends Renderer {
    #id;
    #inTransform = new Transform(null);
    #outTransform = new Transform(null);

    get id(){
        return this.#id;
    }

    get in(){
        return this.#inTransform;
    }

    get out(){
        return this.#outTransform;
    }

    constructor(id, pos1, pos2){
        super([new RenderProperties(DrawMode.Outline, TexturePainter.connectionTextureName, [0, 0, 1, 1], -1)]);
        this.#id = id;
        this.#inTransform.setParent(pos1);
        this.#outTransform.setParent(pos2);
    }
}