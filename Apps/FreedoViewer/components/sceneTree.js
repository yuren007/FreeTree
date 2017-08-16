define([],function () {
	function FDscenetree() {
	}
	FDscenetree.prototype.dataProc = function () {
		var resouce = window.ctrl.getXMLData();
		window.ctrl._ui.XMLData = resouce;
		/*Vue.component('item', {
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
		      		return this.model.cids
		    	}
		  	},
		  	methods: {
		  		dataOptions: function(item, id) {
		  			for(var i in item){
		  				if(item[i].id == id){
		  					if(item[i].cids != '')return false;
		  					for(var j in resouce){
		  						var temp = {};
		  						temp.name = resouce[j].name;
		  						temp.id = resouce[j].id;
		  						temp.cids = resouce[j].cids;
		  						item[i].cids.push(temp);
		  					}
		  				} else {
		  					this.dataOptions(resouce[i].cids, id);
		  				}
		  			}
		  		},
		    	toggle: function (id) {
		      		if (this.isFolder) {
		        		this.open = !this.open;
						resouce = window.ctrl.getXMLData(id);
						this.dataOptions(data, id);
		      		}
		    	}
		  	}
		})*/
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
                toggle: function (id,childData) {
                      if (this.isFolder) {
                        this.open = !this.open;
                      }
                }
              }
        })
	}
	return FDscenetree;
})




