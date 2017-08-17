define([],function () {
	function FDscenetree() {
	}
	FDscenetree.prototype.dataProc = function () {
	    var data = []
		var resouce = window.ctrl.getXMLData();
        resouce.parentE.forEach((e) => {
            data.push(e);
        })
		window.ctrl._ui.XMLData = data;
        Vue.component('item', {
              template: '#scene-template',
              props: {
                model: Object
              },
              data: function () {
                return {
					open: false
                }
              },
              computed: {
                isFolder: function () {
                    return this.model.cids && this.model.cids.length
                }
              },
              methods: {
                toggle: function (clickHere) {
                    resouce = window.ctrl.getXMLData(clickHere)
                    if (this.isFolder) {
                        this.model.childE = resouce.childE;
                        this.open = !this.open;
                    }
                }
              }
        })
	}
	return FDscenetree;
})




