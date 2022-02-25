class Connection extends Renderer {
    #id;
    #Apoint;
    #Bpoint;

    get id(){
        return this.#id;
    }

    get A(){
        return this.#Apoint;
    }

    get B(){
        return this.#Bpoint;
    }

    get shape(){
        return [
            this.A.x, this.A.y,
            this.B.x, this.B.y,
        ];
    }

    constructor(id, pos1, pos2){
        super([new RenderProperties(DrawMode.Outline, TexturePainter.connectionTextureName, [0, 0, 1, 1], -1)]);
        this.#id = id;
        this.#Apoint = pos1;
        this.#Bpoint = pos2;
    }
}