# WebGL Project
This small web app serves as a file system used to visualize the organisation of a code base and the relationship between its various classes.
To test it out, simply fork the project and open the "index.html" file in your browser

## Using the app

### Moving around the scene
Clicking and dragging with the Middle Mouse Button will pan the screen in the direction of the mouse movement. 
Scrolling will Zoom in / Zoom out.

### Creating and modifying classes
Using the toolbar on the left hand side, you can create new classes and add properties to those classes (variables or methods). 
When adding a property, select the "Add property" tool, click on the class you wish to add a property on, and type in the property (i.e "int index" will create a variable, however "boolean IsActive()" will create a method). The app will parse your input and display its relationship to any custom classes that it uses.

*Example: If you create a class ***Car*** that contains a variable of type **Engine**, the app will draw a Connection from that variable to the class Engine. If you create a method ***GetEngineType()*** that returns an object of type **EngineType**, it will also create a Connection to the class EngineType.*

You can also add parameters to your methods by simply typing them out in the popup the exact same way you would in an IDE (each parameter must be separated by commas).
For example, a method called ***GetFoodInfo*** that takes as parameter a instance of the class ***Food*** and returns an object of type ***FoodInfo*** will automatically link itself to the 2 classes, Food and FoodInfo.

*To see the above example on your screen, create a class of any name, then use the "Add Property" tool and type in:*
>FoodInfo GetFoodInfo(Food dish)

*You will then see 2 extra classes created and automatically linked to your class.*


### Transforming classes
To move classes around the scene, use the "Select" tool and click & drag the top of the container to wherever you wish to position your class.
To resize a class container, use the "Scale" tool and click and drag from any of the light blue corners of your class.

## Importing an existing codebase
If you already have a few files on hand (currently the only files supported are **.java** files), you can upload them using the "Choose files" button at the bottom of the toolsbar.
This will import and parse your files into the app, creating and linking all of the classes provided for you.

## Note from the developer

This project is to help me learn the basics of a Graphics API as well as to understand the good practices vs bad practices. Throughout the development, I learned how to leverage the power of dedicated hardware through the use of Buffers and Uniforms, as well as some higher level concepts such as *Instanced Drawing, Batching draw calls, Texture atlasing, Scene Graph based Transforms and Text Rendering*.
This has helped me understand techniques and concepts often found in Game Development such as *memory management and garbage collection, CPU vs GPU draw time, Vertex Shader vs Fragment Shader, and more*.
I also have a better understanding of the separation of logic demonstrated by the *MVC design pattern* and the advantages it brings.

## Known Issues
- Overlapping geometry doesn't have z-index sorting.
- Deleting/Removing and Hiding a class does not work.
- - Resizing a class container doesn't hide overflowing text
- Java language parser lacks many keywords and functionalities (i.e tokens such as @Override, import statements, support for multiple classes in a single file, constructors).
- Zooming always pulls the camera closer to the center, rather than towards the cursor