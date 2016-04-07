var up = false
var down = false
var left = false
var right = false

var keydown = function(c){
	var key = c.keyCode
	switch(key){
		case 87://w
			up = true
			break
		case 83://s
			down = true
			break
		case 65://a
			left = true
			break	
		case 68://d
			right = true
			break
		case 32://space
			socket.emit('action', 'ability', [mx,my])
			break		
		case 72://h
			break
		case 82://r
			socket.emit('switch')
			break
		case 16://shift
			socket.emit('action', 'spell', [mx,my])
		default:
	}
}

var keyup = function(c){
	var key = c.keyCode
	switch(key){
		case 87://w
			up = false
			break
		case 83://s
			down = false
			break
		case 65://a
			left = false
			break	
		case 68://d
			right = false
			break		
		default:
	}
}

