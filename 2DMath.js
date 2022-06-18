class FixedVector2 {
    static #zero = new FixedVector2(0, 0);
    static get zero(){ return FixedVector2.#zero; }
    static #one  = new FixedVector2(1, 1);
    static get one(){ return FixedVector2.#one; }

    #pos = new Array(2);

    constructor(x, y){
        if(!(typeof x == 'number')) throw new Error("Not a number");
        if(!(typeof y == 'number')) throw new Error("Not a number");
        this.#pos[0] = x;
        this.#pos[1] = y;
    }

    get x(){
        return this.#pos[0];
    }

    get y(){
        return this.#pos[1];
    }
}

class Vector2 {
    #pos = new Array(2);

    constructor(x, y){
        if(!(typeof x == 'number')) throw new Error("Not a number");
        if(!(typeof y == 'number')) throw new Error("Not a number");
        this.#pos[0] = x;
        this.#pos[1] = y;
    }

    static get zero(){
        return new Vector2(0, 0);
    }

    static get one(){
        return new Vector2(1, 1);
    }

    get x(){
        return this.#pos[0];
    }

    get y(){
        return this.#pos[1];
    }

    set x(value){
        if(!(typeof value == 'number')) throw new Error("Not a number");
        this.#pos[0] = value;
    }

    set y(value){
        if(!(typeof value == 'number')) throw new Error("Not a number");
        this.#pos[1] = value;
    }

    //Always returns a new Vector without modifying the original
    Add(...number){
        if(number[0] instanceof Vector2){
            if(number.length > 1) throw new Error("too many arguments");
            return new Vector2(this.x + number[0].x, this.y + number[0].y);
        }
        if(number.length > 2) throw new Error("too many arguments");
        if(number.length == 2) return new Vector2(this.x + number[0], this.y + number[1]);
        return new Vector2(this.x + number[0], this.y + number[0]);
    }

    //Always returns a new Vector without modifying the original
    Subtract(...number){
        if(number[0] instanceof Vector2){
            if(number.length > 1) throw new Error("too many arguments");
            return new Vector2(this.x - number[0].x, this.y - number[0].y);
        }
        if(number.length > 2) throw new Error("too many arguments");
        if(number.length == 2) return new Vector2(this.x - number[0], this.y - number[1]);
        return new Vector2(this.x - number[0], this.y - number[0]);
    }

    //Always returns a new Vector without modifying the original
    Multiply(...number){
        if(number[0] instanceof Vector2){
            if(number.length > 1) throw new Error("too many arguments");
            return new Vector2(this.x * number[0].x, this.y * number[0].y);
        }
        if(number.length > 2) throw new Error("too many arguments");
        if(number.length == 2) return new Vector2(this.x * number[0], this.y * number[1]);
        return new Vector2(this.x * number[0], this.y * number[0]);
    }
}
Vector2.prototype.toString = function(){
    return "(" + this.x + ", " + this.y + ")";
}
Vector2.prototype.toJSON = function(){
    return [this.x, this.y];
}

class VecMath {
    static scene;

    static ScreenSpaceToWorldSpace(x, y){
        let cameraPosition = this.scene.camera.position;
        let cameraZoom = this.scene.camera.zoom;
        return new Vector2(
            (x - (canvas.width / 2) - cameraPosition.x) / cameraZoom,
            (-y + (canvas.height / 2) - cameraPosition.y) / cameraZoom
        );
    }

    static WorldSpaceToScreenSpace(x, y){
        let cameraPosition = this.scene.camera.position;
        let cameraZoom = this.scene.camera.zoom;
        return new Vector2(
            x * cameraZoom + cameraPosition.x + (canvas.width / 2),
            -y * cameraZoom + cameraPosition.y + (canvas.height / 2),
        );
    }

    static CheckRectangle(point, rectangle){
        return (rectangle.position.x - (rectangle.dimensions.x / 2) <= point.x && point.x <= rectangle.position.x + (rectangle.dimensions.x / 2)
            && rectangle.position.y - (rectangle.dimensions.y / 2) <= point.y && point.y <= rectangle.position.y + (rectangle.dimensions.y / 2));
    }

    static CheckRectangleOverlap(rect1, rect2){ 
        let l1 = rect1.TL;
        let r1 = rect1.BR;
        let l2 = rect2.TL;
        let r2 = rect2.BR;

        // If one rectangle is on left side of other
        if (l1.x >= r2.x || l2.x >= r1.x) {
            return false;
        }
    
        // If one rectangle is above other
        if (r1.y >= l2.y || r2.y >= l1.y) {
            return false;
        }
    
        return true;
    }

    static CheckConnection(point, connection){
        const abs = Math.abs;   //Creates a local reference of the function. Supposedly faster.

        //Get dimensions of the connection bounding box
        const w = abs(connection.A.x - connection.B.x);
        const h = abs(connection.A.y - connection.B.y);
        const a = abs(point.x - connection.A.x);
        const b = abs(point.y - connection.A.y);

        //Check if point is on connection using range
        const xDiff = abs(a - ((w / h) * b));
        if(xDiff <= System.connection_raycast_range) return true;

        const yDiff = abs(b - ((h / w) * a));
        if(yDiff <= System.connection_raycast_range) return true;

        return false;
    }

    //Need to merge with the Matrix class
    static m3 = {
        translate: function(tx, ty) {
          return [
            1, 0, 0,
            0, 1, 0,
            tx, ty, 1,
          ];
        },
      
        rotate: function(angleInRadians) {
          var c = Math.cos(angleInRadians);
          var s = Math.sin(angleInRadians);
          return [
            c,-s, 0,
            s, c, 0,
            0, 0, 1,
          ];
        },
      
        scale: function(sx, sy) {
          return [
            sx, 0, 0,
            0, sy, 0,
            0, 0, 1,
          ];
        },
      
        multiply: function(a, b) {
          var a00 = a[0 * 3 + 0];
          var a01 = a[0 * 3 + 1];
          var a02 = a[0 * 3 + 2];
          var a10 = a[1 * 3 + 0];
          var a11 = a[1 * 3 + 1];
          var a12 = a[1 * 3 + 2];
          var a20 = a[2 * 3 + 0];
          var a21 = a[2 * 3 + 1];
          var a22 = a[2 * 3 + 2];
          var b00 = b[0 * 3 + 0];
          var b01 = b[0 * 3 + 1];
          var b02 = b[0 * 3 + 2];
          var b10 = b[1 * 3 + 0];
          var b11 = b[1 * 3 + 1];
          var b12 = b[1 * 3 + 2];
          var b20 = b[2 * 3 + 0];
          var b21 = b[2 * 3 + 1];
          var b22 = b[2 * 3 + 2];
          return [
            b00 * a00 + b01 * a10 + b02 * a20,
            b00 * a01 + b01 * a11 + b02 * a21,
            b00 * a02 + b01 * a12 + b02 * a22,
            b10 * a00 + b11 * a10 + b12 * a20,
            b10 * a01 + b11 * a11 + b12 * a21,
            b10 * a02 + b11 * a12 + b12 * a22,
            b20 * a00 + b21 * a10 + b22 * a20,
            b20 * a01 + b21 * a11 + b22 * a21,
            b20 * a02 + b21 * a12 + b22 * a22,
          ];
        },
    }
}

class Matrix {
    static errorCheck(m){
        if(m.length != 9) throw new Error("Parameter is not a matrix.");
    }

    static get identity() { 
        return new Float32Array([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1,
        ]);
    }
    
    static translate = function(m, tx, ty) {
        this.errorCheck(m);
        m[6] = tx;
        m[7] = ty;
    }

    static scale = function(m, sx, sy) {
        this.errorCheck(m);
        m[0] *= sx;
        m[4] *= sy;
    }

    static setScale = function(m, sx, sy) {
        this.errorCheck(m);
        m[0] = sx;
        m[4] = sy;
    }

    static multiply = function(a, b) {
        var a00 = a[0 * 3 + 0];
        var a01 = a[0 * 3 + 1];
        var a02 = a[0 * 3 + 2];
        var a10 = a[1 * 3 + 0];
        var a11 = a[1 * 3 + 1];
        var a12 = a[1 * 3 + 2];
        var a20 = a[2 * 3 + 0];
        var a21 = a[2 * 3 + 1];
        var a22 = a[2 * 3 + 2];
        var b00 = b[0 * 3 + 0];
        var b01 = b[0 * 3 + 1];
        var b02 = b[0 * 3 + 2];
        var b10 = b[1 * 3 + 0];
        var b11 = b[1 * 3 + 1];
        var b12 = b[1 * 3 + 2];
        var b20 = b[2 * 3 + 0];
        var b21 = b[2 * 3 + 1];
        var b22 = b[2 * 3 + 2];
        return new Float32Array([
            b00 * a00 + b01 * a10 + b02 * a20,
            b00 * a01 + b01 * a11 + b02 * a21,
            b00 * a02 + b01 * a12 + b02 * a22,
            b10 * a00 + b11 * a10 + b12 * a20,
            b10 * a01 + b11 * a11 + b12 * a21,
            b10 * a02 + b11 * a12 + b12 * a22,
            b20 * a00 + b21 * a10 + b22 * a20,
            b20 * a01 + b21 * a11 + b22 * a21,
            b20 * a02 + b21 * a12 + b22 * a22,
        ]);
    }

    static multiplyMxV(a, b){
        return new Float32Array([
            a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
            a[3] * b[0] + a[4] * b[1] + a[5] * b[2],
            a[6] * b[0] + a[7] * b[1] + a[8] * b[2]
        ])
    }

    static copy(src, dst) {
        this.errorCheck(src);
        this.errorCheck(dst);
    
        dst[ 0] = src[ 0];
        dst[ 1] = src[ 1];
        dst[ 2] = src[ 2];
        dst[ 3] = src[ 3];
        dst[ 4] = src[ 4];
        dst[ 5] = src[ 5];
        dst[ 6] = src[ 6];
        dst[ 7] = src[ 7];
        dst[ 8] = src[ 8];
        dst[ 9] = src[ 9];
        dst[10] = src[10];
        dst[11] = src[11];
        dst[12] = src[12];
        dst[13] = src[13];
        dst[14] = src[14];
        dst[15] = src[15];
    
        return dst;
    }
}