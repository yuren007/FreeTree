define(function () {
    'use strict';
	function FDMisc() {

	}
	
	FDMisc.isNumber = function(v){
		return typeof v === 'number' && isFinite(v);
	}
	
	FDMisc.calculateLength = function(positions) {
        var length = 0;
        for (var i = 1; i < positions.length; ++i) {
            length += FreeDo.Cartesian3.distance(positions[i-1], positions[i]);
        }
        return length;
    }
	
    FDMisc.getLengthText = function(length) {
        return length > 1000 ? (length/1000).toFixed(2) + "千米" : length.toFixed(2) + "米"
    }
	
    FDMisc.getCenter = function(p1, p2) {
        var p = new FreeDo.Cartesian3();
        FreeDo.Cartesian3.add(p1, p2, p);
        FreeDo.Cartesian3.multiplyByScalar(p, 0.5, p);
        return p;
    }
	
	return FDMisc;
})

Function.prototype.createDelegate = function(obj, args, appendArgs){
	var method = this;
	var isNumber = typeof appendArgs === 'number' && isFinite(appendArgs);
	return function() {
		var callArgs = args || arguments;
		if (appendArgs === true){
			callArgs = Array.prototype.slice.call(arguments, 0);
			callArgs = callArgs.concat(args);
		}else if (isNumber){
			callArgs = Array.prototype.slice.call(arguments, 0); // copy arguments first
			var applyArgs = [appendArgs, 0].concat(args); // create method call params
			Array.prototype.splice.apply(callArgs, applyArgs); // splice them in
		}
		return method.apply(obj || window, callArgs);
	};
}