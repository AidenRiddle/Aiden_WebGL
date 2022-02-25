class Debug {
    static #debugWindow = document.getElementById("debugStats");
    static #debugElements = []     //list of debug elements currently being displayed
    static #debugQueue = []     //Queued elements: either updates to already existing elements, or new elements;
    static #debugQueueMaxElements = 100;
    static #displayStyle = [];
    
    static #debugRoutine;
    static #debugActiveState;

    static #updateFrequency = 24;
    static #updateFrequencyInMilliseconds = (1 / this.#updateFrequency) * 1000;

    static #counters = new Object();

    static #average = new Object();
    static #averageSampleSizeMap = new Object();
    
    static #max = new Object();

    static get debugStack(){
        return this.#debugElements;
    }

    //Queue a string for logging
    static Log(str, ...vars){
        this.#debugQueue.push({str, color : Color.white, vars});
    }

    //Create / reset a Counter
    static StartCounter(str, startValue = 0){
        this.#counters[str] = startValue;
    }

    //Increment a Counter
    static Count(str, increment = 1){
        if(!(str in this.#counters)) throw new Error("Debug counter not initialized");
        this.#counters[str] += increment;
        this.#debugQueue.push({str, color : Color.green, vars : [this.#counters[str]]});
    }

    static GetCount(str){
        return this.#counters[str];
    }

    //Create / reset an Average
    static StartAverage(str, sampleSize = 5){   //A 'sampleSize' of -1 means no limit.
        this.#average[str] = [];
        this.#averageSampleSizeMap[str] = sampleSize;
    }

    //Increment an Average
    static Average(str, value){
        if(!(str in this.#average)) throw new Error("Debug average not initialized");
        this.#average[str].push(value);
        if(this.#average[str].length == this.#averageSampleSizeMap[str] + 1) this.#average[str].shift();
        let result = 0;
        let valueCount = 0;
        for(let n of this.#average[str]){
            valueCount++;
            result += n;
        }
        result = result / valueCount;
        this.#debugQueue.push({str, color : Color.yellow, vars : [result]});
    }

    //Create / update a Max
    static Max(str, value){
        if(!(str in this.#max)) this.#max[str] = -1;
        this.#max[str] = Math.max(this.#max[str], value);
        this.#debugQueue.push({str, color : Color.lightBlue, vars : [this.#max[str]]});
    }

    //Determines whether to create a new <p> element for a log, or to simply update a previous one
    static #PrintToStack(){
        if(this.#debugQueue.length < 1) return false;
        let i = (this.#debugQueue.length > this.#debugQueueMaxElements) ? this.#debugQueue.length - this.#debugQueueMaxElements : 0;

        for(i; i < this.#debugQueue.length; i++){
            let s = this.#debugQueue[i];
            let j = 0;
            for(let t of this.#debugElements){
                if(t.includes(s.str)) break;
                j++;
            }

            let elements = "(";
            for(let u of s.vars){
                elements += u.toString();
                elements += ",";
            }
            elements = elements.slice(0, -1); 
            elements += ")";

            if(j < this.#debugElements.length){
                this.#debugElements[j] = s.str + elements;
            }else{
                this.#debugElements.push(s.str + elements);
                this.#displayStyle.push(s.color);
            }
        }

        //Clear the queue before returning.
        this.#debugQueue = [];

        return true;
    }

    static #Dump = () => {
        let copy = this.#debugElements;
        this.#debugElements = [];
        return copy;
    }

    static #Update = () => {
        if(!this.#PrintToStack()) return;   //If nothing has been printed, don't update the DOM.

        while(this.#debugWindow.childElementCount < this.#debugElements.length){
            let p = document.createElement("p");
            p.style.color = ColorUtils.colorToRGBAString(this.#displayStyle[this.#debugWindow.childElementCount])
            this.#debugWindow.appendChild(p);
        }
        for(let i = 0; i < this.#debugWindow.childElementCount; i++){
            this.#debugWindow.children[i].textContent = this.#debugElements[i];
        }
    }

    static #Initialize(){
        this.#debugRoutine = setInterval(this.#Update, this.#updateFrequencyInMilliseconds);
    }

    static #ShutDown(){
        clearInterval(this.#debugRoutine);
    }

    static ToggleDebugMode = () => {
        this.#debugActiveState = !this.#debugActiveState;
        if(this.#debugActiveState){
            document.getElementById("console-window").style.display = "block";
            this.#Initialize();
        }else{
            document.getElementById("console-window").style.display = "none";
            this.#ShutDown();
        }
    }
}