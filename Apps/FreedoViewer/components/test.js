
// 定义
var MyComponent = Vue.extend({
	props: [''],
    template: "<div><p class='FD-title-name'>分析</p>\
			    <div class='FD-fx-buttons'>\
			        <button class='btn btn-default' title='线段量测' @click='one'><i class='fa fa-expand'></i> 线段量测</button>\
			        <button class='btn btn-default' title='折线量测' @click=''><i class='fa fa-level-up'></i> 折线量测</button>\
					<button class='btn btn-default' title='取消' @click='cancel'><i class='fa fa-times'></i> 取消</button>\
			    </div></div>",
    methods: {
    	getCtrl: function () {
    	    return ctrl;
    	},
    	one: function () {
    		getCtrl().setAnalysisMode('LINE_DISTANCE')
    		// this.$emit('cc','LINE_DISTANCE');
    		console.log(123123);
    	},
    	two: function () {
			// getCtrl().setAnalysisMode('SEGMENTS_DISTANCE')
    	},
    	cancel: function () {
    		// getCtrl().setAnalysisMode('CANCEL')
    		this.$emit('getCtrl().setAnalysisMode','CANCEL');
    	}
    }
})

// 注册
Vue.component('my-component', MyComponent);


