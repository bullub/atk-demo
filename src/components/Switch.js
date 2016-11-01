(function(global, Vue, undefined){
    (function(){
        function getCurrentScriptBase() {
            var src = document.currentScript.src,
                lidx = src.lastIndexOf("/")
        
            return src.substring(0, lidx);
        }
        var styleLink = document.createElement('link');
        styleLink.rel = "stylesheet";
        styleLink.href = getCurrentScriptBase() + "/" + "Switch.css";
        document.head.appendChild(styleLink);
    }());
var Switch = Vue.extend({
    template: '\
  <div>\
    <div>this is template body{{msg}}</div>\
  </div>\
',
    data(){
      return {
        msg: 'hello vue'
      }
    },
    aaa1fdd(){

    },
    components: {
    }
  }
);

global.Switch = Switch;

Vue.component('vue-switch', Switch);


}(window, Vue));