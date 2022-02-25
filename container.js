const ContainerType = {
    Class : 0,
    Abstract : 1,
    Enum : 2,
    Main : 3,
    color : function(containerType){
        switch(containerType){
            case ContainerType.Class: return Style.container_class_primary;
            case ContainerType.Abstract: return Style.container_enum_primary;
            case ContainerType.Enum: return Style.container_abstract_primary;
            case ContainerType.Main: return Style.container_main_primary;
        }
    }
}

class Container extends Rectangle {
    #containerType;
    #nameHandle;
    
    #body;
    #translateHandle;
    #visibilityHandle;
    #resizeHandles;

    #variables = [];
    #variableHandles = [];

    #methods = [];
    #methodHandles = [];

    #objectData = [];
    #colliders;
    #colliderTypes;

    #biggestTextureWidth = 0;
    #methodReferenceOrigin;
    #boundingBox;

    get containerType(){
        return this.#containerType;
    }

    get nameHandle(){
        return this.#nameHandle;
    }

    get name(){
        return this.nameHandle.text;
    }

    get body(){
        return this.#body;
    }

    get translateHandle(){
        return this.#translateHandle;
    }

    get visibilityHandle(){
        return this.#visibilityHandle;
    }

    get resizeHandles(){
        return this.#resizeHandles;
    }

    get variables(){
        return this.#variables;
    }

    get variableHandles(){
        return this.#variableHandles;
    }

    get methods(){
        return this.#methods;
    }

    get methodHandles(){
        return this.#methodHandles;
    }

    get colorName(){
        return ContainerType.color(this.#containerType);
    }

    get objectData(){
        return this.#objectData;
    }

    get collisionData(){
        return { colliders: this.#colliders, hitboxes: this.#colliderTypes };
    }

    constructor(pos1, pos2, name, containerType = ContainerType.Class){
        let transform = new Transform();

        //Container Settings.
        transform.parent = SceneMesh.scene;
        transform.origin = SceneMesh.origin;
        transform.offset = new Vector2((pos1.x + pos2.x) / 2, (pos1.y + pos2.y) / 2);
        transform.dimensions = new Vector2(Math.abs(pos2.x - pos1.x), Math.abs(pos2.y - pos1.y));
        transform.scale = Vector2.one;
        transform.scaleInheritanceMap = { x: Scale.Local, y: Scale.Local };
        let rp = [
            //RenderProperties.FillProperties(Color.pink, 1),
            RenderProperties.OutlineProperties(ContainerType.color(containerType), 1)
        ];
        super(transform, rp);

        //Body Settings.
        transform.parent = this;
        transform.origin = this.BL;
        transform.offset = new Vector2(this.dimensions.x / 2, this.dimensions.y / 2);
        transform.scale = new Vertex(new Vector2(0, -(Defaults.translateHandle_height / Defaults.container_height)), this.scale, new Vector2(1, 1));
        transform.scaleInheritanceMap = { x: Scale.Inherit, y: Scale.Local };
        rp = [RenderProperties.FillProperties(Style.container_body)];
        //rp = [new RenderProperties(DrawMode.Fill, TexturePainter.letterAtlasTextureName, ColorUtils.defaultTextureCoordinates)];
        this.#body = new Rectangle(transform, rp);
        console.log(name, this.#body.scale, this.#body.parent.scale);

        //TranslateHandle Settings.
        transform.origin = this.TL;
        transform.offset = new Vector2(this.dimensions.x / 2, -Defaults.translateHandle_height / 2);
        transform.dimensions = new Vector2(this.dimensions.x, Defaults.translateHandle_height);
        transform.scale = new Vector2(1, 1);
        transform.scaleInheritanceMap = { x: Scale.Inherit, y: Scale.Local };
        rp = [RenderProperties.FillProperties(ContainerType.color(containerType))];
        this.#translateHandle = new Rectangle(transform, rp);
        
        //Title Settings.
        transform.parent = this.#translateHandle;
        transform.origin = this.#translateHandle.position;
        transform.offset = Vector2.zero;
        transform.scaleInheritanceMap = { x: Scale.Inherit, y: Scale.Inherit };
        this.#nameHandle = new PropertyHandle(transform, false, name); //Inherits TranslateHandle's dimensions

        //VisibilityHandle Settings.
        transform.parent = this;
        transform.origin = this.TR;
        transform.offset = new Vector2(-20, -Defaults.translateHandle_height / 2);
        transform.dimensions = new Vector2(Defaults.visibilityHandle_size, Defaults.visibilityHandle_size);
        transform.scale = FixedVector2.one;
        transform.scaleInheritanceMap = { x: Scale.Local, y: Scale.Local };
        rp = [RenderProperties.FillProperties(Style.container_visibility_fill)];
        this.#visibilityHandle = new Rectangle(transform, rp);

        //ResizeHandles Settings.
        this.#resizeHandles = [];
        transform.offset = Vector2.zero;
        transform.dimensions = new Vector2(Defaults.resizeHandle_size, Defaults.resizeHandle_size);
        transform.scale = new Vector2(1, 1);
        transform.scaleInheritanceMap = { x: Scale.Local, y: Scale.Local };
        rp = [
            RenderProperties.FillProperties(Style.container_resize_fill, 1),
            RenderProperties.OutlineProperties(Style.container_resize_outline, 1)
        ];
        transform.origin = this.TL;
        this.#resizeHandles[Hitbox.resizeTL - 1] = new Rectangle(transform, rp);
        this.#resizeHandles[Hitbox.resizeTL - 1].Hide();
        transform.origin = this.TR;
        this.#resizeHandles[Hitbox.resizeTR - 1] = new Rectangle(transform, rp);
        this.#resizeHandles[Hitbox.resizeTR - 1].Hide();
        transform.origin = this.BR;
        this.#resizeHandles[Hitbox.resizeBR - 1] = new Rectangle(transform, rp);
        this.#resizeHandles[Hitbox.resizeBR - 1].Hide();
        transform.origin = this.BL;
        this.#resizeHandles[Hitbox.resizeBL - 1] = new Rectangle(transform, rp);
        this.#resizeHandles[Hitbox.resizeBL - 1].Hide();

        //Bounding Box - used for Collisions
        transform.origin = this.position;
        transform.dimensions = new Vector2(Math.abs(pos2.x - pos1.x), Math.abs(pos2.y - pos1.y));
        transform.scale = new Vector2(1 + (Defaults.resizeHandle_size / transform.dimensions.x), 1 + (Defaults.resizeHandle_size / transform.dimensions.y));
        transform.scaleInheritanceMap = { x: Scale.Default, y: Scale.Default };
        rp = [RenderProperties.OutlineProperties(Color.pink)];
        this.#boundingBox = new Rectangle(transform, rp);
        //this.#boundingBox.Hide();

        
        this.#containerType = containerType;

        //A reference point from where to position the MethodHandles
        this.#methodReferenceOrigin = new Vertex(this.#body.TL, Vector2.zero);

        this.#BuildObjectDataArray();
        this.#BuildCollisionDataArray();
    }

    //Array referencing the parent object and children objects. Used for rendering.
    #BuildObjectDataArray(){
        this.#objectData.push(this);
        this.#objectData.push(this.#body);
        this.#objectData.push(this.#translateHandle);
        this.#objectData = this.#objectData.concat(this.#nameHandle.objectData);
        this.#objectData.push(this.#visibilityHandle);
        this.#objectData.push(this.#resizeHandles[0]);
        this.#objectData.push(this.#resizeHandles[1]);
        this.#objectData.push(this.#resizeHandles[2]);
        this.#objectData.push(this.#resizeHandles[3]);
        this.#objectData.push(this.#boundingBox);
    }

    //Builds the collision data arrays sorted by ZIndex.
    #BuildCollisionDataArray(){
        this.#colliders = new Array(System.zIndex_max - System.zIndex_min);
        this.#colliderTypes = new Array(System.zIndex_max - System.zIndex_min);
        let i = 0;
        for(; i < this.#colliders.length; i++){
            this.#colliders[i] = [];
            this.#colliderTypes[i] = [];
        }

        this.#colliders[i-1].push(this.#boundingBox);

        this.#colliders[this.#body.renderPropertiesArray[0].zIndex].push(this.#body);
        this.#colliders[this.#translateHandle.renderPropertiesArray[0].zIndex].push(this.#translateHandle);
        this.#colliders[this.#visibilityHandle.renderPropertiesArray[0].zIndex].push(this.#visibilityHandle);
        this.#colliders[this.#resizeHandles[0].renderPropertiesArray[0].zIndex].push(this.#resizeHandles[0]);
        this.#colliders[this.#resizeHandles[1].renderPropertiesArray[0].zIndex].push(this.#resizeHandles[1]);
        this.#colliders[this.#resizeHandles[2].renderPropertiesArray[0].zIndex].push(this.#resizeHandles[2]);
        this.#colliders[this.#resizeHandles[3].renderPropertiesArray[0].zIndex].push(this.#resizeHandles[3]);

        this.#colliderTypes[this.#body.renderPropertiesArray[0].zIndex].push(Hitbox.body);
        this.#colliderTypes[this.#translateHandle.renderPropertiesArray[0].zIndex].push(Hitbox.translate);
        this.#colliderTypes[this.#visibilityHandle.renderPropertiesArray[0].zIndex].push(Hitbox.visibility);
        this.#colliderTypes[this.#resizeHandles[0].renderPropertiesArray[0].zIndex].push(Hitbox.resizeTL);
        this.#colliderTypes[this.#resizeHandles[1].renderPropertiesArray[0].zIndex].push(Hitbox.resizeTR);
        this.#colliderTypes[this.#resizeHandles[2].renderPropertiesArray[0].zIndex].push(Hitbox.resizeBR);
        this.#colliderTypes[this.#resizeHandles[3].renderPropertiesArray[0].zIndex].push(Hitbox.resizeBL);
    }

    Resize(vecA, vecB){
        super.Resize(vecA, vecB);
        //this.#boundingBox.Scale(this.scale.x, this.scale.y);
    }

    #AddProperty(array, handleArray, name, label, origin, isMethod){
        //Store the property key
        array.push(name);

        //Create a new Property instance
        let transform = new Transform();
        transform.parent = this;
        transform.origin = origin;
        transform.offset = new Vector2(Defaults.container_width / 2, -Defaults.target_letter_texture_height / 2);
        transform.dimensions = new Vector2(Defaults.container_width, Defaults.target_letter_texture_height);
        transform.scale = new Vector2(1, 1);
        transform.scaleInheritanceMap = { x: Scale.Inherit, y: Scale.Local };
        let handle = new PropertyHandle(transform, isMethod, label);
        handleArray.push(handle);

        //Add the newly created Property to the renderloop (this.#objectData) and upload its collision data
        this.#objectData = this.#objectData.concat(handle.objectData);
        this.#colliders[handle.renderPropertiesArray[0].zIndex].push(handle);
        this.#colliderTypes[handle.renderPropertiesArray[0].zIndex].push(Hitbox.property);
        
        //Resize the container to fit the new Property
        let propertyWidth = (Defaults.target_letter_texture_width * label.length) + Defaults.container_body_margin_left + Defaults.container_body_margin_right;
        if(propertyWidth > this.#biggestTextureWidth){
            this.#biggestTextureWidth = ~~propertyWidth + 1;
        }
        let newX = this.TL.x + this.#biggestTextureWidth;
        let newY = (this.#methodHandles.length > 0) ? this.#methodHandles[this.#methodHandles.length - 1].BR.y : this.#variableHandles[this.#variableHandles.length - 1].BR.y;

        this.Resize(this.TL, new Vector2(newX, newY));
    }

    AddVariable(name, label){
        const origin = (this.#variables.length == 0) ? this.#body.TL : this.#variableHandles[this.#variableHandles.length - 1].BL;
        this.#AddProperty(this.#variables, this.#variableHandles, name, label, origin, false);
        this.#methodReferenceOrigin.Move(new Vector2(0, -this.#variables.length * Defaults.target_letter_texture_height));
    }

    AddMethod(name, label){
        const origin = (this.#methods.length == 0) ? this.#methodReferenceOrigin : this.#methodHandles[this.#methodHandles.length - 1].BL;
        this.#AddProperty(this.#methods, this.#methodHandles, name, label, origin, true);
    }

    #sliceReferenceOrigin;

    SliceProperty(property){
        let table = this.#variableHandles;
        let index = table.indexOf(property);
        if(index == - 1){ table = this.#methodHandles; index = table.indexOf(property); }
        this.#sliceReferenceOrigin = new Vertex(table[index - 1].BL, new FixedVector2(Defaults.container_width / 2, -Defaults.target_letter_texture_height / 2));
        table[index].ChangeParent(this, this.#sliceReferenceOrigin);

    }
}

class PropertyHandle extends Rectangle {
    #socketIn;
    #socketOut;
    #textMesh;

    get socketIn(){
        return this.#socketIn;
    }

    get socketOut(){
        return this.#socketOut;
    }

    get text(){
        return this.#textMesh.text;
    }

    get objectData(){
        return [this, this.#socketIn, this.#socketOut].concat(this.#textMesh.objectData);
    }

    constructor(transform, isMethod, text){
        transform.scale = new Vertex(new Vector2(0, 1), transform.parent.scale, new Vector2(1, 0));
        let rp = (isMethod) ? [RenderProperties.FillProperties(Color.darken)] : [RenderProperties.FillProperties(Color.transparent)];
        super(transform, rp);
        
        transform.parent = this;
        transform.offset = new Vector2(0, -Defaults.target_letter_texture_height / 2);
        transform.dimensions = new Vector2(Defaults.resizeHandle_size, Defaults.resizeHandle_size);
        transform.scale = new Vector2(1, 1);
        transform.scaleInheritanceMap = { x: Scale.Local, y: Scale.Local };
        let childRP = [
            RenderProperties.FillProperties(Color.light, 1),
            RenderProperties.OutlineProperties(Color.pink, 1)
        ];
        transform.origin = this.TL;
        this.#socketIn = new Rectangle(transform, childRP);
        transform.origin = this.TR;
        this.#socketOut = new Rectangle(transform, childRP);

        transform.offset = new Vector2(Defaults.container_body_margin_left, -Defaults.target_letter_texture_height / 2);
        transform.origin = this.TL;
        this.#textMesh = new TextMesh(transform, text, [RenderProperties.FillProperties(Color.transparent)]);
    }
}

class TextMesh extends Rectangle {
    #text;
    #textQuads = [];

    get text(){
        return this.#text;
    }

    get objectData(){
        return [this].concat(this.#textQuads);
    }

    constructor(transform, text, renderPropertiesArray){
        let width = text.length * Defaults.target_letter_texture_width;
        let height = Defaults.target_letter_texture_height;

        transform.dimensions = new Vector2(width, height);
        transform.offset = transform.offset.Add(width / 2, 0);
        transform.scale = FixedVector2.one;

        super(transform, renderPropertiesArray);
        this.SetText(text);
    }

    SetText(text){
        this.#text = text;
        let transform = new Transform();
        transform.parent = this;
        transform.origin = this.TL;
        transform.offset = new Vector2(Defaults.target_letter_texture_width / 2, -Defaults.target_letter_texture_height / 2);
        transform.scale = FixedVector2.one;
        this.#textQuads.push(new LetterQuad(transform, text.charAt(0)));
        for(let i = 1; i < text.length; i++){
            transform.origin = this.#textQuads[this.#textQuads.length - 1].position;
            transform.offset = new Vector2(Defaults.target_letter_texture_width, 0);
            this.#textQuads.push(new LetterQuad(
                transform,
                text.charAt(i)
            ));
        }
    }
}

class LetterQuad extends Mesh {
    #TL;
    #TR;
    #BR;
    #BL;

    get shape(){
        return [
            this.#TL.x, this.#TL.y,
            this.#TR.x, this.#TR.y,
            this.#BR.x, this.#BR.y,
            this.#BL.x, this.#BL.y
        ]
    }

    constructor(transform, letter){
        super(transform, [RenderProperties.TextureProperties(TexturePainter.letterAtlasTextureName, TexturePainter.TextureCoordinatesFromLetter(letter))]);
        this.#TL = new Vertex(this.position, new Vector2(-Defaults.target_letter_texture_width / 2, Defaults.target_letter_texture_height / 2));
        this.#TR = new Vertex(this.position, new Vector2(Defaults.target_letter_texture_width / 2, Defaults.target_letter_texture_height / 2));
        this.#BR = new Vertex(this.position, new Vector2(Defaults.target_letter_texture_width / 2, -Defaults.target_letter_texture_height / 2));
        this.#BL = new Vertex(this.position, new Vector2(-Defaults.target_letter_texture_width / 2, -Defaults.target_letter_texture_height / 2));
    }
}