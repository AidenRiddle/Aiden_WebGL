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
    #variableReferenceOrigin;
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

        //Container Settings.
        let rp = [
            RenderProperties.FillProperties(Color.light,-1),
            RenderProperties.OutlineProperties(ContainerType.color(containerType), 1)
        ];
        super(SceneMesh, new Vector2(pos2.x - pos1.x, pos2.y - pos1.y), new Vector2(Defaults.container_width, Defaults.container_height), rp);


        //TranslateHandle Settings.
        {
            const positioner = { renderPropertiesArray: [] };
            positioner.transform = new Transform(positioner);
            positioner.transform.setParent(this);
            Matrix.translate(positioner.transform.localMatrix, 0, 0.5);
            rp = [RenderProperties.FillProperties(ContainerType.color(containerType))];
            this.#translateHandle = new Rectangle(
                positioner,
                new Vector2(0, -(Defaults.translateHandle_height / 2)),
                new Vector2(1, Defaults.translateHandle_height),
                rp
            );
            this.#translateHandle.transform.updateMethod = this.#translateHandle.transform.updateWorldMatrixScaleX;
        }

        //Title settings
        {
            this.#nameHandle = new PropertyHandle(
                this.#translateHandle,
                FixedVector2.zero,
                FixedVector2.one,
                false,
                name
            );
        }
    
        //VisibilityHandle Settings.
        {
            const positioner = { renderPropertiesArray: [] };
            positioner.transform = new Transform(positioner);
            positioner.transform.setParent(this.#translateHandle);
            Matrix.translate(positioner.transform.localMatrix, 0.5, 0);
            rp = [RenderProperties.FillProperties(Style.container_visibility_fill)];
            this.#visibilityHandle = new Rectangle(
                positioner, 
                new Vector2(-20, 0),
                new Vector2(Defaults.visibilityHandle_size, Defaults.visibilityHandle_size),
                rp
            );
            this.#visibilityHandle.transform.updateMethod = this.#visibilityHandle.transform.updateWorldMatrixIgnoreScale;
        }

        //ResizeHandles Settings.
        {
            this.#resizeHandles = [];
            rp = [
                RenderProperties.FillProperties(Style.container_resize_fill, 1),
                RenderProperties.OutlineProperties(Style.container_resize_outline, 1)
            ];

            let positioner = { renderPropertiesArray: [] };
            positioner.transform = new Transform(positioner);
            positioner.transform.setParent(this);
            Matrix.translate(positioner.transform.localMatrix, -0.5, 0.5);
            this.#resizeHandles[Hitbox.resizeTL - 1] = new Rectangle(
                positioner,
                new Vector2(Defaults.resizeHandle_size / 2, -Defaults.resizeHandle_size / 2),
                new Vector2(Defaults.resizeHandle_size, Defaults.resizeHandle_size),
                rp
            );
            this.#resizeHandles[Hitbox.resizeTL - 1].transform.updateMethod = this.#resizeHandles[Hitbox.resizeTL - 1].transform.updateWorldMatrixIgnoreScale;
            this.#resizeHandles[Hitbox.resizeTL - 1].Hide();

            positioner = { renderPropertiesArray: [] };
            positioner.transform = new Transform(positioner);
            positioner.transform.setParent(this);
            Matrix.translate(positioner.transform.localMatrix, 0.5, 0.5);
            this.#resizeHandles[Hitbox.resizeTR - 1] = new Rectangle(
                positioner,
                new Vector2(-Defaults.resizeHandle_size / 2, -Defaults.resizeHandle_size / 2),
                new Vector2(Defaults.resizeHandle_size, Defaults.resizeHandle_size),
                rp
            );
            this.#resizeHandles[Hitbox.resizeTR - 1].transform.updateMethod = this.#resizeHandles[Hitbox.resizeTR - 1].transform.updateWorldMatrixIgnoreScale;
            this.#resizeHandles[Hitbox.resizeTR - 1].Hide();

            positioner = { renderPropertiesArray: [] };
            positioner.transform = new Transform(positioner);
            positioner.transform.setParent(this);
            Matrix.translate(positioner.transform.localMatrix, 0.5, -0.5);
            this.#resizeHandles[Hitbox.resizeBR - 1] = new Rectangle(
                positioner,
                new Vector2(-Defaults.resizeHandle_size / 2, Defaults.resizeHandle_size / 2),
                new Vector2(Defaults.resizeHandle_size, Defaults.resizeHandle_size),
                rp
            );
            this.#resizeHandles[Hitbox.resizeBR - 1].transform.updateMethod = this.#resizeHandles[Hitbox.resizeBR - 1].transform.updateWorldMatrixIgnoreScale;
            this.#resizeHandles[Hitbox.resizeBR - 1].Hide();

            positioner = { renderPropertiesArray: [] };
            positioner.transform = new Transform(positioner);
            positioner.transform.setParent(this);
            Matrix.translate(positioner.transform.localMatrix, -0.5, -0.5);
            this.#resizeHandles[Hitbox.resizeBL - 1] = new Rectangle(
                positioner,
                new Vector2(Defaults.resizeHandle_size / 2, Defaults.resizeHandle_size / 2),
                new Vector2(Defaults.resizeHandle_size, Defaults.resizeHandle_size),
                rp
            );
            this.#resizeHandles[Hitbox.resizeBL - 1].transform.updateMethod = this.#resizeHandles[Hitbox.resizeBL - 1].transform.updateWorldMatrixIgnoreScale;
            this.#resizeHandles[Hitbox.resizeBL - 1].Hide();
        }
        
        //Bounding Box - used for Collisions
        {
            rp = [
                RenderProperties.OutlineProperties(Color.pink, 10)
            ];
            this.#boundingBox = new Rectangle(this, FixedVector2.zero, FixedVector2.one, rp);
            //this.#boundingBox.Hide();
        }
        
        this.#containerType = containerType;

        //A reference point from where to position the VariableHandles
        this.#variableReferenceOrigin = { renderPropertiesArray: [] };
        this.#variableReferenceOrigin.transform = new Transform(this.#variableReferenceOrigin);
        {
            const positioner = { renderPropertiesArray: [] };
            positioner.transform = new Transform(positioner);
            positioner.transform.setParent(this.#translateHandle);
            Matrix.translate(positioner.transform.localMatrix, 0, -0.5);
            this.#variableReferenceOrigin.transform.setParent(positioner);
        }

        //A reference point from where to position the MethodHandles
        this.#methodReferenceOrigin = { renderPropertiesArray: [] };
        this.#methodReferenceOrigin.transform = new Transform(this.#methodReferenceOrigin);
        this.#methodReferenceOrigin.transform.setParent(this.#variableReferenceOrigin);

        this.#BuildObjectDataArray();
        this.#BuildCollisionDataArray();
    }

    Translate(pos){
        Matrix.translate(this.transform.localMatrix, pos.x, pos.y);
    }

    Scale(scale){
        Matrix.scale(this.transform.localMatrix, scale.x, scale.y);
    }

    //Array referencing the parent object and children objects. Used for rendering.
    #BuildObjectDataArray(){
        this.#objectData.push(this);
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

        //this.#colliders[this.#body.renderPropertiesArray[0].zIndex].push(this.#body);
        this.#colliders[this.#translateHandle.renderPropertiesArray[0].zIndex].push(this.#translateHandle);
        this.#colliders[this.#visibilityHandle.renderPropertiesArray[0].zIndex].push(this.#visibilityHandle);
        this.#colliders[this.#resizeHandles[0].renderPropertiesArray[0].zIndex].push(this.#resizeHandles[0]);
        this.#colliders[this.#resizeHandles[1].renderPropertiesArray[0].zIndex].push(this.#resizeHandles[1]);
        this.#colliders[this.#resizeHandles[2].renderPropertiesArray[0].zIndex].push(this.#resizeHandles[2]);
        this.#colliders[this.#resizeHandles[3].renderPropertiesArray[0].zIndex].push(this.#resizeHandles[3]);

        //this.#colliderTypes[this.#body.renderPropertiesArray[0].zIndex].push(Hitbox.body);
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
        let parent = handleArray[handleArray.length - 1];
        let offset = new Vector2(0, -Defaults.target_letter_texture_height);
        let size = new Vector2(1, Defaults.target_letter_texture_height);
        if(isMethod && handleArray.length == 0){
            parent = this.#methodReferenceOrigin;
            //size.y = 1;
        }
        if(!isMethod && handleArray.length == 0){
            parent = this.#variableReferenceOrigin;
            offset.y /= 2;
            //size.y = 1;
        }
        let handle = new PropertyHandle(
            parent,
            offset, 
            size,
            isMethod,
            label
        );
        if(parent == this.#variableReferenceOrigin || parent == this.#methodReferenceOrigin){
            handle.transform.updateMethod = handle.transform.updateWorldMatrixScaleX;
        }
        handleArray.push(handle);

        if(!isMethod){
            this.#methodReferenceOrigin.transform.setParent(handle);
        }

        //Add the newly created Property to the renderloop (this.#objectData) and upload its collision data
        this.#objectData = this.#objectData.concat(handle.objectData);
        this.#colliders[handle.renderPropertiesArray[0].zIndex].push(handle);
        this.#colliderTypes[handle.renderPropertiesArray[0].zIndex].push(Hitbox.property);
        
        //Resize the container to fit the new Property
        let propertyWidth = (Defaults.target_letter_texture_width * label.length) + Defaults.container_body_margin_left + Defaults.container_body_margin_right;
        if(propertyWidth > this.#biggestTextureWidth){
            this.#biggestTextureWidth = ~~propertyWidth + 1;
        }
        let newX = 10 + this.#biggestTextureWidth;
        //let newY = (this.#methodHandles.length > 0) ? this.#methodHandles[this.#methodHandles.length - 1].BR.y : this.#variableHandles[this.#variableHandles.length - 1].BR.y;
        let newY = 10;

        this.Resize(this.TL, new Vector2(newX, newY));
    }

    AddVariable(name, label){
        //const origin = (this.#variables.length == 0) ? this.#body.TL : this.#variableHandles[this.#variableHandles.length - 1].BL;
        const origin = new Vector2(10, 10);
        this.#AddProperty(this.#variables, this.#variableHandles, name, label, origin, false);
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

    constructor(parent, offset, scale, isMethod, text){
        let rp = (isMethod) ? [RenderProperties.FillProperties(Color.darken)] : [RenderProperties.FillProperties(Color.transparent)];
        super(parent, offset, scale, rp);
        this.transform.updateMethod = this.transform.updateWorldMatrixScaleX;
        
        let childRP = [
            RenderProperties.FillProperties(Color.light, 1),
            RenderProperties.OutlineProperties(Color.pink, 1)
        ];

        {
            let positioner = { renderPropertiesArray: [] };
            positioner.transform = new Transform(positioner);
            positioner.transform.setParent(this);
            Matrix.translate(positioner.transform.localMatrix, -0.5, 0);
            this.#socketIn = new Rectangle(positioner, new Vector2(Defaults.resizeHandle_size / 2, 0), new Vector2(Defaults.resizeHandle_size, Defaults.resizeHandle_size), childRP);
            this.#socketIn.transform.updateMethod = this.#socketIn.transform.updateWorldMatrixIgnoreScale;
            this.#textMesh = new TextMesh(
                positioner,
                text,
                [RenderProperties.FillProperties(Color.transparent)]
            );

            positioner = { renderPropertiesArray: [] };
            positioner.transform = new Transform(positioner);
            positioner.transform.setParent(this);
            Matrix.translate(positioner.transform.localMatrix, 0.5, 0);
            this.#socketOut = new Rectangle(positioner, new Vector2(-Defaults.resizeHandle_size / 2, 0), new Vector2(Defaults.resizeHandle_size, Defaults.resizeHandle_size), childRP);
            this.#socketOut.transform.updateMethod = this.#socketOut.transform.updateWorldMatrixIgnoreScale;
        }
    }
}

class TextMesh extends Rectangle {
    #text;
    #textQuads = [];
    #leftPositioner;

    get text(){
        return this.#text;
    }

    get objectData(){
        return [this].concat(this.#textQuads);
    }

    constructor(parent, text, renderPropertiesArray){
        const textMeshWidth = text.length * Defaults.target_letter_texture_width;
        let offset = new Vector2(Defaults.container_body_margin_left + (textMeshWidth / 2), 0);
        let scale = new Vector2(textMeshWidth, Defaults.target_letter_texture_height);

        super(parent, offset, scale, renderPropertiesArray);
        this.transform.updateMethod = this.transform.updateWorldMatrixIgnoreScale;
        this.#leftPositioner = { renderPropertiesArray: [] };
        this.#leftPositioner.transform = new Transform(this.#leftPositioner);
        this.#leftPositioner.transform.setParent(this);
        Matrix.translate(this.#leftPositioner.transform.localMatrix, -0.5, 0);
        this.SetText(text);
    }

    SetText(text){
        this.#text = text;
        this.#textQuads.push(new LetterQuad(this.#leftPositioner, text.charAt(0)));
        for(let i = 1; i < text.length; i++){
            //transform.offset = new Vector2(Defaults.target_letter_texture_width, 0);
            this.#textQuads.push(new LetterQuad(
                this.#textQuads[i-1],
                text.charAt(i)
            ));
        }
    }
}

class LetterQuad extends Mesh {
    get shape(){
        return [
            this.transform.worldMatrix[0], this.transform.worldMatrix[1], this.transform.worldMatrix[2],
            this.transform.worldMatrix[3], this.transform.worldMatrix[4], this.transform.worldMatrix[5],
            this.transform.worldMatrix[6], this.transform.worldMatrix[7], this.transform.worldMatrix[8]
        ];
    }

    constructor(parent, letter){
        super(
            parent,
            new Vector2(Defaults.target_letter_texture_width, 0),
            new Vector2(Defaults.target_letter_texture_width, Defaults.target_letter_texture_height),
            [RenderProperties.TextureProperties(TexturePainter.letterAtlasTextureName, TexturePainter.TextureCoordinatesFromLetter(letter))]
        );
        this.transform.updateMethod = this.transform.updateWorldMatrixIgnoreScale;
    }
}

class SContainer extends Rectangle {
    constructor(pos1, pos2, name, containerType = ContainerType.Class){
        super(SceneMesh, Vector2.zero, Vector2.one, [RenderProperties.FillProperties(Color.pink, 0)]);
    }
}