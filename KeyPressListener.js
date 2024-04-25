
class KeyPressListener {
   constructor(keyCode, callback) {
     let keySafe = true;
     this.keydownFunction = function(event) {
       if (event.key === keyCode) {
          if (keySafe) {
             keySafe = false;
             callback();
          }  
       }
    };
    this.keyupFunction = function(event) {
       if (event.key === keyCode) {
          keySafe = true;
       }         
    };
    document.addEventListener("keydown", this.keydownFunction);
    document.addEventListener("keyup", this.keyupFunction);
   }
 
   unbind() { 
     document.removeEventListener("keydown", this.keydownFunction);
     document.removeEventListener("keyup", this.keyupFunction);
   }
 }
 