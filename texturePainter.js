class TexturePainter {
    #canvas;    //Different canvas element from the global one defined in 'app.js'

    #ctx;
    #font = "monospace";

    static letterMap = {};

    static get principalColorTextureName(){
        return "PrincipalColors";
    }

    static get letterAtlasTextureName(){
        return "LetterAtlas";
    }

    static get connectionTextureName(){
        return "ConnectionColors";
    }

    get Font(){
        return Defaults.font_size + "px " + this.#font;
    }

    get letterBoundingBoxWidth(){
        return (55 / 100) * Defaults.font_size;
    }

    get letterBoundingBoxHeight(){
        return (105 / 100) * Defaults.font_size;
    }

    get letterBaselineHeight(){
        return (80 / 100) * Defaults.font_size;
    }

    constructor(){
        this.#canvas = document.createElement("canvas");
        this.#canvas.style.position = "absolute";
        this.#canvas.style.left = "0px";
        this.#canvas.style.top = "0px";

        this.#ctx = this.#canvas.getContext('2d');

        let i = 0;
        for(let letter of Defaults.characters_in_atlas.split('')){
            TexturePainter.letterMap[letter] = i;
            i++;
        }
    }

    #DrawRectangle(color, width, height, offsetX = 0, offsetY = 0){
        this.#ctx.fillStyle = ColorUtils.colorToRGBAString(color);
        this.#ctx.fillRect(offsetX, offsetY, width, height);
    }

    DrawMessageTexture = (message) => {
        //Set texture size
        this.#canvas.width = message.length * this.letterBoundingBoxWidth;
        this.#canvas.height = this.letterBoundingBoxHeight;

        //WebGL minimum specs indicates that not all browsers support texture sizes bigger than 4096.
        if(this.#canvas.width > 4096) console.warn("Creating a texture bigger than common requirements: " + message);
        if(this.#canvas.height > 4096) console.warn("Creating a texture bigger than common requirements: " + message);


        //Reset the canvas image
        this.#DrawRectangle([0, 0, 0, 0], this.#canvas.width, this.#canvas.height);

        //Draw the message
        this.#ctx.font = this.Font;
        this.#ctx.fillStyle = Defaults.font_color;
        this.#ctx.fillText(message, 0, this.letterBaselineHeight);

        return this.#ctx.getImageData(0, 0, this.#canvas.width, this.#canvas.height);
    }

    DrawConnectionTexture = () => {
        const outColor = Color.green;
        const inColor = Color.yellow;
        this.#DrawRectangle(outColor, 1, 1, 0, 0);
        this.#DrawRectangle(inColor, 1, 1, 1, 0);

        return this.#ctx.getImageData(0, 0, 2, 1);
    }

    DrawPrincipalColorTextures = () => {
        let i = 0;
        for(let color in Color){
            this.#DrawRectangle(Color[color], 1, 1, i, 0);
            i++;
        }

        return this.#ctx.getImageData(0, 0, i, 1);
    }

    DrawLetterAtlasTexture = () => {
        const message = Defaults.characters_in_atlas;
        const diff = this.letterBoundingBoxHeight - this.letterBaselineHeight;

        //Set texture size
        this.#canvas.width = message.length * this.letterBoundingBoxWidth;
        this.#canvas.height = Object.keys(Color).length * this.letterBoundingBoxHeight;

        //WebGL minimum specs indicates that not all browsers support texture sizes bigger than 4096.
        if(this.#canvas.width > 4096) console.warn("Creating a texture bigger than common requirements: " + message);
        if(this.#canvas.height > 4096) console.warn("Creating a texture bigger than common requirements: " + message);


        //Reset the canvas image
        this.#DrawRectangle([0, 0, 0, 0], this.#canvas.width, this.#canvas.height);

        //Draw the message
        this.#ctx.font = this.Font;
        let i = 1;
        for(let color of Object.values(Color)){
            this.#ctx.fillStyle = ColorUtils.colorToRGBAString(color);
            this.#ctx.fillText(message, 0, (this.letterBoundingBoxHeight * i) - diff);
            i++;
        }

        return this.#ctx.getImageData(0, 0, this.#canvas.width, this.#canvas.height);
    }

    static TextureCoordinatesFromLetter(letter, color = Defaults.font_color){
        if( ! (letter in TexturePainter.letterMap)){
            throw new Error("letter not found in atlas: " + letter);
        }
        const colors = Object.getOwnPropertyNames(Color);
        const colorsLength = colors.length;
        let letterIndex = TexturePainter.letterMap[letter];
        let colorIndex = 0;

        while(Color[colors[colorIndex]] != color){
            colorIndex++;
            if(colorIndex > colors.length) throw new Error("Not a Color");
        }

        //If the letter is not found in the default characters, create a new texture for that letter;
        //NOT WORKING !!!!
        
        const xMin = letterIndex / Defaults.characters_in_atlas.length;
        const xMax = (letterIndex+1) / Defaults.characters_in_atlas.length;
        const yMin = colorIndex / colorsLength;
        const yMax = (colorIndex+1) / colorsLength;

        return [
            xMin, yMin,
            xMax, yMin,
            xMax, yMax,
            xMin, yMax
        ];
    }
}