const AppSettings = {
    vertexSize : 2,         //2 dimensions: x, y
    targetSupportedMeshes : 5000,
    glBytesInFloat : 4,     //Changing this value does NOT change the bytes allocated by WebGL for floats
    get vertexBufferSize(){
        return this.targetSupportedMeshes * 4 * this.vertexSize * this.glBytesInFloat;
    },
    get matrixBufferSize(){
        return this.targetSupportedMeshes * 9 * this.glBytesInFloat;
    }
}

const ColorUtils = {
    nameOfStyle : function(styleTarget){
        const names = Object.getOwnPropertyNames(Style);
        let i = 0;
        while(Style[names[i]] != styleTarget){
            i++;
            if(i > names.length) throw new Error("Not a Style");
        }
        return names[i];
    },

    colorToRGBAString : function(color){ return "rgba(" + color[0] * 255 + ", " + color[1] * 255 + ", " + color[2] * 255 + ", " + color[3] + ")"; },

    defaultTextureCoordinates : new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),

    textureCoordinatesFromStyle : function(style){
        const names = Object.getOwnPropertyNames(Color);
        let i = 0;
        while(Color[names[i]] != style){
            i++;
            if(i > names.length) throw new Error("Not a Style");
        }
        
        const epsilon = 0.005;     //Prevents color leaks
        let xMin = i / names.length + epsilon;
        let xMax = (i+1) / names.length - epsilon;
        let yMin = 0;
        let yMax = 1;

        //return [xMin, yMax, xMax, yMax, xMax, yMin, xMin, yMax, xMax, yMin, xMin, yMin];

        return new Float32Array([
            xMin, yMin,
            xMax, yMin,
            xMax, yMax,
            xMin, yMax
        ]);
    }
}

const Color = {
    wine : [0.6, 0, 0, 1],
    transparent : [0, 0, 0, 0],
    darken : [0, 0, 0, 0.2],

    white : [1, 1, 1, 1],
    black : [0, 0, 0, 1],

    light : [0.92, 0.92, 0.92, 1],
    grey : [0.5, 0.5, 0.5, 1],
    dark : [0.12, 0.12, 0.12, 1],

    red : [1, 0, 0, 1],
    orange : [1, 0.5, 0, 1],
    yellow : [0.9, 0.9, 0, 1],

    green : [0, 0.8, 0, 1],

    blue : [0, 0, 0.8, 1],
    darkBlue : [0.035, 0.082, 0.2, 1],
    lightBlue : [0.3, 0.7, 1, 1],
    secondaryBlue : [0.2, 0.6, 1, 1],
    
    purple : [0.5, 0, 1, 1],
    pink : [1, 0, 1, 1],
}

const Style = {
    background_color : Color.dark,

    clear : Color.transparent,

    container_class_primary : Color.blue,
    container_enum_primary : Color.purple,
    container_abstract_primary : Color.yellow,
    container_main_primary : Color.red,

    container_body : Color.light,

    container_resize_fill : Color.secondaryBlue,
    container_resize_outline : Color.lightBlue,

    container_visibility_fill : Color.darkBlue,

    connection_primary : Color.green,

    test : Color.pink
}

const Tools = {
    select : 1,

    create_class : 0,
    create_enum : 1,
    create_abstract : 2,
    create_main : 3,
    create_connection : 4,
    add_property : 5,
    create_method : 6,

    transform_scale : 0,
}

const Scale = {
    Default: 0,             //Inherit both X and Y scale of the parent
    InheritX: 1,
    InheritY: 2,
    IgnoreParentScale: 3,
}

const Hitbox = {
    body : -1,
    translate : 0,
    resizeTL : 1,
    resizeTR : 2,
    resizeBR : 3,
    resizeBL : 4,
    visibility : 5,

    property : 6,

    socket_in : 9,
    socket_out : 10,
}

const DrawMode = {
    Fill : 4,
    Outline : 1,
    TriangleStrip : 5
}

const Defaults = {
    characters_in_atlas : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :;_#\"\'[]()<>@=+-*/.,",
    font_size : 60,
    font_color : Color.dark,
    target_letter_texture_height : 30,
    get target_letter_texture_width(){
        return Defaults.variable_texture_scale_parameter * (Defaults.font_size * 0.50);
    },
    get variable_texture_scale_parameter(){
        return Defaults.target_letter_texture_height / (Defaults.font_size * 1.05);
    },

    container_height : 30,
    container_width : 390,
    resizeHandle_size : 10,
    translateHandle_height : 30,
    visibilityHandle_size : 20,
    container_body_margin_top : 20,
    container_body_margin_bottom : 20,
    container_body_margin_right : 20,
    container_body_margin_left : 20,
}

const System = {
    time_between_frame_renders : 6,   //In milliseconds

    gl_zoom_max : 2,
    gl_zoom_min : 0.1,

    connection_raycast_range : 10,

    zIndex_default : 10,
    zIndex_max : 100,
    zIndex_min : 0
}

const Java = {
    primitives : ["int", "float", "char", "String", "boolean", "void"],
    access_modifiers : ["public", "protected", "private"],
    regex_comments : /(\/\/[^]*?\n)|(\/\*[^]*?\*\/)/g,
    regex_whitespace : /[\n\r\t]|( [ \t]+)/g,
    regex_token_separator : /([(),.;{}+\-*\/])|[ ]+/,
}