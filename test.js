'use strict';

let poly = new Container(new Vector2(0, 0), new Vector2(20, 20));
const canvas = document.getElementById("RenderCanvas");
const gl = new Graphics(Color.black);

var test = function(){
    let input = new InputManager(canvas);
    input.SwitchSystem(InputSystem.CollisionTest);
    gl.AddObjectToScene(poly);
}

test();