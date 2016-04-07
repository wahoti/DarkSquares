//ABDULWAHED WAHEDI
//PETER RISSBERGER

/*notes
knockback
movement abilities
health and stamina bars
swing
parry system
physics - momentum etc
more movement abilities
spells
bosses

4/4/16
health and stamina bars check
dodge roll
sword review

4/6/16
invincible during dodge
knockback
agent movement

todo
agent movement
	calculate distance from center
	dodge further the farther from center it is
agent beam
samurai AI
fists

play test

===============================
thing properties
===============================
unreal = not a physical object
block = block projectiles
destroy_on_wall = destroy on wall
isperson = is a human player
iszombie = is NPC
isweapon = is melee weapon (used to trigger knockback)
*/

{//variables
var victor = require('victor')
var app    = require("express")()
var http   = require('http').Server(app)
var io     = require('socket.io')(http)

var people = {}
var things = {}
var things_draw = {}
var things_count = 0
var reverse = new victor(-1,-1)	
var width = 1000
var height = 1000

var boxs = {}
// boxs['box1'] = {}
// boxs['box1'].size = width/4
// boxs['box1'].x = width/2
// boxs['box1'].y = height/2
// boxs['box1'].ishole = false

// things_draw['box1'] = {}
// things_draw['box1'].x = width/2
// things_draw['box1'].y = height/2
// things_draw['box1'].size = width/4
// things_draw['box1'].color = '#000000'

	
app.set('port', 3000)
app.get('/', function(req, res){ res.sendFile(__dirname + '/index.html') })
app.get('/style.css', function(req, res){ res.sendFile(__dirname + '/style.css') })
app.get('/js/socket-io.js', function(req, res){ res.sendFile(__dirname + '/js/socket-io.js') })
app.get('/js/keys.js', function(req, res){ res.sendFile(__dirname + '/js/keys.js') })
app.get('/js/symphony.png', function(req, res){ res.sendFile(__dirname + '/js/symphony.png') })

http.listen(app.get('port'), function(){ console.log('listening on ' + app.get('port') + '...') })
}

{//functions
function knockback(p1,p2){
	p1.phase = "knockback"
	p2.phase = "knockback"
	var direction1 = new victor(p1.x - p2.x, p1.y - p2.y).normalize()
	var direction2 = new victor(p2.x - p1.x, p2.y - p1.y).normalize()
	p1.ddirection = new victor(direction1.x,direction1.y)
	p2.ddirection = new victor(direction2.x,direction2.y)
	p1.dcount = 0
	p2.dcount = 0
}
function move_weapons(person){
	for(var x in person.weapons){
		if(person.weapons[x]){
			person.weapons[x].move(person)
		}
	}
}
function update_weapons(person){
	for(var x in person.weapons){
		if(person.weapons[x]){	
			person.weapons[x].update(person)
		}
	}
}
function hit(thing, damage){
	//console.log('hit')
	if(thing.isperson || thing.iszombie){
		if(thing.phase != "dodging"){
			thing.health -= damage
			
		}
	}
	else{
		thing.health -= damage
	}
	
	
	if(thing.health <= 0){
		thing.end()
		return	
	}	
}
function game_over_zombie(zombie){
	var name = zombie.id + '-tombstone'
	things_draw[name] = {}
	things_draw[name].x = zombie.x
	things_draw[name].y = zombie.y
	things_draw[name].color = "#AA0000"
	things_draw[name].size = zombie.size
	zombie_kill_count++
	if(start){ io.sockets.emit('score', zombie_kill_count)	}
	delete things_draw[zombie.id]
	delete things[zombie.id]
	setTimeout(function(){
		delete things_draw[name]
	},5000)
}
function spawn_zombie(location){
	var name = 'zombie-' + zombie_count
	zombie_count++
	things[name] = {}
	things_draw[name] = {}
	things[name].id = name
	things[name].speed = .75
	things[name].name = 'zombie'
	things_draw[name].color = "#259325"
	things[name].size = 10
	things_draw[name].size = 10
	things[name].isperson = false
	things_draw[name].isperson = false
	var direction = new victor(0,0)
	direction.normalize()
	things[name].direction = direction
	things[name].destroy_on_wall = false
	things[name].health = 20
	things[name].iszombie = true
	var zombie_interval_1
	
	switch(location){
		case 1:
			things[name].x = 5
			things[name].y = 495
			break
		default:
			break
	}	
	
	things[name].collide = function(thing){
		if(thing.isperson){
			thing.end()
			var allplayersdead = true
			for(var x in people){
				if(!people[x].isdead){
					allplayersdead = false
				}
			}
			if(allplayersdead){
				game_end()
			}
			delete things_draw[this.id]
			delete things[this.id]
			return
		}
		return
	}
	
	things[name].step = function(){	
		things_draw[this.id].x = this.x
		things_draw[this.id].y = this.y
		
		var target = null
		var closest = 10000
		for(var x in people){
			if(people[x].isdead){ continue }
			var a = Math.pow(people[x].x - this.x, 2)
			var b = Math.pow(people[x].y - this.y, 2)
			var c = Math.sqrt(a + b)
			if(c < closest){ 
				closest = c
				target = people[x]
			}
		}
		
		if(target == null){ return }
		
		var direction = new victor(target.x - this.x, target.y - this.y)
		direction.normalize()
		this.direction = direction
		
		this._x = this.x + (this.direction.x * this.speed)
		this._y = this.y + (this.direction.y * this.speed)
		
		if(colliding(this)){ return }
		else{		
			this.x = this._x
			this.y = this._y
			return
		}
	}	
}
function colliding_check(thing){
	//NOTE this works only for squares
	_size = thing.size / 2
	this_size = thing.size / 2
	for(var x in things){
		if(things[x] != thing && !things[x].unreal){
			_size = things[x].size / 2//size is radius
			if((thing._x+_size) >= (things[x].x-_size)&&(thing._x-_size) <= (things[x].x+_size) &&
			   (thing._y+_size) >= (things[x].y-_size)&&(thing._y-_size) <= (things[x].y+_size)){ 
				return true
			}
		}
	}
	
	for(var box in boxs){
		that_size = boxs[box].size / 2
		if((thing._x+this_size) >= (boxs[box].x-that_size)&&(thing._x-this_size) <= (boxs[box].x+that_size) &&
		   (thing._y+this_size) >= (boxs[box].y-that_size)&&(thing._y-this_size) <= (boxs[box].y+that_size)){ 
			return true
		}		
	}	
	
	return false
}
function colliding(thing){
	//NOTE this works only for squares
	this_size = thing.size / 2
	
	if(thing._x < this_size || thing._x > (width-this_size) || thing._y < this_size || thing._y > (height-this_size)){
		if(thing.isperson || thing.iszombie){ return true }
		if(thing.destroy_on_wall){
			thing.end()
			return true
		}
		if(thing.trigger_on_wall){
			thing.wall_collision()
		}
	}
	
	for(var box in boxs){
		that_size = boxs[box].size / 2
		if((thing._x+this_size) >= (boxs[box].x-that_size)&&(thing._x-this_size) <= (boxs[box].x+that_size) &&
		   (thing._y+this_size) >= (boxs[box].y-that_size)&&(thing._y-this_size) <= (boxs[box].y+that_size)){ 
			if(thing.isperson || thing.iszombie){ return true }
			if(thing.destroy_on_wall && !boxs[box].ishole){
				thing.end()
				return true
			}
			if(thing.trigger_on_wall){
				thing.wall_collision()
			}				
		}		
	}
	
	for(var x in things){
		if(things[x] != thing){
			if(things[x].isweapon){
				if(things[x].owner != thing){
					that_size = things[x].size / 2
					if((thing._x+this_size) >= (things[x].x-that_size)&&(thing._x-this_size) <= (things[x].x+that_size) &&
					   (thing._y+this_size) >= (things[x].y-that_size)&&(thing._y-this_size) <= (things[x].y+that_size)){ 				
							thing.collide(things[x])
							return true
					}					
				}
			}
			else{
				that_size = things[x].size / 2
				if((thing._x+this_size) >= (things[x].x-that_size)&&(thing._x-this_size) <= (things[x].x+that_size) &&
				   (thing._y+this_size) >= (things[x].y-that_size)&&(thing._y-this_size) <= (things[x].y+that_size)){ 				
						thing.collide(things[x])
						return true
				}
			}
		}
	}
	return false
}
function spawn(thing){
	if(typeof(thing) == 'undefined'){ console.log('?') }
	do{
		thing._x = Math.round(Math.random()*(width-20)) + 10
		thing._y = Math.round(Math.random()*(height-20)) + 10
	}while(colliding_check(thing))
		
	thing.x = thing._x
	thing.y = thing._y
	things_draw[thing.id].x = thing.x
	things_draw[thing.id].y = thing.y	
}
function person_spawn(person_id){
	var person = things[person_id]
	if(person.isdead == 'false'){ return }
	spawn(person)
	things_draw[person.id].color = "#000000"		
	person.health = 10
	person.energy = 10
	person.speed = 1
	person.isdead = false
	delete things_draw[person.id + '-tombstone']
}
var update_interval = setInterval(function(){ for(var x in things){ if(things[x].step){things[x].step()}}}, 8)
var draw_interval = setInterval(function(){ io.sockets.emit('draw', things_draw) }, 16)
var energy_interval = setInterval(function(){ for(var x in people){ if(people[x].energy < 10){ people[x].energy++ } } }, 1000) 
}

weapons = {
	punch: object = {
		cost: 1,
		weight: 1,
		
	}
}

bots = {//npc
	agent: object = {
		//first AI
		//shoots bullets and dodges
		//IDEA
		//dodge in random direction away from target player
		//shoots beams at all players
		spawn: function(){
			var id = 'agent' + things_count
			things_count++
			
			things[id] = {}
			things_draw[id] = {}
			
			things[id].id = id
			things_draw[id].id = id
			things[id].iszombie = true
			things_draw[id].iszombie = true			
			
			things[id].x = -100
			things[id]._x = -100
			things[id].y = -100
			things[id]._y= -100
			things_draw[id].x = -100
			things_draw[id].y = -100

			things[id].ddirection = new victor(0,0)
			things[id].dcount = 0
			things[id].ddistance = 15
			things[id].dspeed = 20
			
			things[id].dodgeCD = 200
			things[id].dodgeCD_ = 0 
			
			things[id].health = 20
			things[id].speed = .5
			things[id].direction = new victor(0,0)
			things[id].size = 20
			things_draw[id].size = things[id].size
			
			things[id].xQuad = 0
			things[id].xQuad_ = false
			things[id].yQuad = 0
			things[id].yQuad_ = false
			
			things_draw[id].color = "#000000"
			
			things[id].phase = "default"
			
			things[id].collide = function(thing){
				
			}
			
			things[id].end = function(){
				// this.x = -100
				// this.y = -100
				// this.dead = true
				// things_draw[this.id].x = -100
				// things_draw[this.id].y = -100				
				hold_id = this.id
				delete things[hold_id]
				delete things_draw[hold_id]
			}
			
			things[id].step = function(){
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y
				things_draw[this.id].energy = this.energy
				things_draw[this.id].health = this.health
				things_draw[this.id].phase = this.phase
				
				this._x = this.x
				this._y = this.y
				_size = this.size/2

				var xQuad = this.x/width
				var yQuad = this.y/height
				if(this.xQuad != xQuad){
					this.xQuad = xQuad
					this.xQuad_ = true
				}
				else{
					this.xQuad_ = false
				}
				if(this.yQuad != yQuad){
					this.yQuad = yQuad
					this.yQuad_ = true
				}
				else{
					this.yQuad_ = false
				}
				
				
				switch(this.phase){
					case 'default':
						// var xQuad = this.x/width
						// var yQuad = this.y/height
						// if(this.xQuad_){
							// this.direction = new victor(1)
						// }
						if(xQuad > .5 && yQuad > .5){
							//bottom right
							if(this.xQuad_ || this.yQuad_){ this.direction = new victor(1000-this.x,1000-this.y).normalize() }
							this._x += this.direction.x*this.speed
							this._y += this.direction.y*this.speed
						}
						else if(xQuad > .5 && yQuad < .5){
							//top right
							if(this.xQuad_ || this.yQuad_){ this.direction = new victor(1000-this.x,-this.y).normalize() }
							this._x += this.direction.x*this.speed
							this._y += this.direction.y*this.speed
						}
						else if(xQuad < .5 && yQuad < .5){
							//top left
							if(this.xQuad_ || this.yQuad_){ this.direction = new victor(-this.x,-this.y).normalize() }
							this._x += this.direction.x*this.speed
							this._y += this.direction.y*this.speed
						}
						else if(xQuad < .5 && yQuad > .5){
							//bottom left
							if(this.xQuad_ || this.yQuad_){ this.direction = new victor(-this.x,1000-this.x).normalize() }
							this._x += this.direction.x*this.speed
							this._y += this.direction.y*this.speed
						}					
						this.dodgeCD_++
						if(this.dodgeCD_ >= this.dodgeCD){
							this.dodgeCD_ = 0
							this.dcount = 0
							// var xQuad = this.x/width
							// var yQuad = this.y/height
							if(xQuad > .5 && yQuad > .5){
								//bottom right
								this.ddirection = new victor(Math.random() - 1, Math.random() - 1).normalize()								
							}
							else if(xQuad > .5 && yQuad < .5){
								//top right
								this.ddirection = new victor(Math.random() - 1, Math.random()).normalize()								
							}
							else if(xQuad < .5 && yQuad < .5){
								//top left
								this.ddirection = new victor(Math.random(), Math.random()).normalize()								
							}
							else if(xQuad < .5 && yQuad > .5){
								//bottom left
								this.ddirection = new victor(Math.random(), Math.random() - 1).normalize()								
							}
							// this.ddirection = new victor(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize()
							this.phase = 'dodging'
						}
						break
					case 'dodging':
						this._x += this.ddirection.x * this.dspeed
						this._y += this.ddirection.y * this.dspeed
						this.dcount += 1
						if(this.dcount == this.ddistance){ this.phase = "default" }					
						break
					default:
						console.log('no state')
				}
				
				// update_weapons(this)
				//for knockback, have colliding change _x/_y
				if(colliding(this)){ return }
				else{
					// move_weapons(this)
					this.x = this._x
					this.y = this._y
					return
			}
	}
			
			spawn(things[id])
		}
	}
}
	
actions = {//abilities
	axe: object = {
		cost: 1,
		go: function(player, coord){	
			if(player.weapons['axe']){
				player.weapons['axe'].rspeed = (player.weapons['axe'].rspeed * -1)
				return
			}
			else{
			{//init
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things[name].id = name
			things[name].name = 'axe'
			things[name]._size = 20
			things[name].damage = 5
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			direction.rotate(-1.5).normalize()			
			things[name].direction = direction
			things[name].counter = 0
			things[name].collisions = []
			things[name].rspeed = .15
			things[name].duration = .2
			things[name].owner = player			
			// things[name].unreal = true
			}
			
			//do sections
			things[name].sections = {}
			var length = [0,1,2,3,4,5]
			var offset = 15
			for(var x in length){
				var _name =  things[name].id + '_' + x
				things[_name] = {}
				things[_name].id = _name
				things[_name].name = 'axe'
				things[_name].owner = player
				things[_name].isweapon = true
				things[_name].speed = 0
				things[_name].direction = things[name].direction
				things[_name].block = true
				things[_name].size = things[name]._size
				offset += things[_name]._size
				things[_name].x = player.x + (offset*direction.x)
				things[_name].y = player.y + (offset*direction.y)
				things[_name].collide = function(thing){
					if(thing.name == "portal"){
						this.end()
						return
					}
					if(things[name].collisions.indexOf(thing.id) < 0){				
						if(thing.isperson || thing.iszombie){
							hit(thing, things[name].damage)
							knockback(thing, this.owner)
						}
						if(thing.isweapon){
							if(thing.owner != this.owner){
								knockback(thing.owner, this.owner)
							}
						}
						else{ things[name].collisions.push(thing.id) }
					}											
					return
				}
				things[_name].end = function(){}
				things[_name].step = function(){}
				
				things_draw[_name] = {}
				things_draw[_name].x = things[_name].x
				things_draw[_name].y = things[_name].y
				things_draw[_name].color = "#000000"
				things_draw[_name].size = things[_name].size
				
				things[name].sections[_name] = things[_name]
			}
			
			player.weapons['axe'] = things[name]
			
			things[name].update = function(person){
				this.direction.rotate(person.weapons['axe'].rspeed).normalize()
	
				var offset = 20
				for(var x in this.sections){
					offset += this._size
					things_draw[this.sections[x].id].x = this.sections[x].x
					things_draw[this.sections[x].id].y = this.sections[x].y					
					this.sections[x]._x = person.x + (offset*this.direction.x)
					this.sections[x]._y = person.y + (offset*this.direction.y)
				}
				
				// person.weapons['axe']._x = person.weapons['axe'].x
				// person.weapons['axe']._y = person.weapons['axe'].y
				// if(person.up){ person.weapons['axe']._y -= person.speed }
				// else if(person.down){ person.weapons['axe']._y += person.speed }
				// if(person.left){ person.weapons['axe']._x -= person.speed }
				// else if(person.right){ person.weapons['axe']._x += person.speed }
				person.weapons['axe']._colliding()				
			}
			
			things[name].move = function(person){
				for(var x in this.sections){
					this.sections[x].x = this.sections[x]._x
					this.sections[x].y = this.sections[x]._y
				}
			}
								
			things[name].end = function(){
				for(var x in this.sections){
					delete things_draw[this.sections[x].id]
					delete things[this.sections[x].id]
					delete this.sections[x]
				}
				
				delete things_draw[this.id]
				delete this.owner.weapons['axe']				
				delete things[this.id]
				delete this
			}
			
			things[name].collide = function(thing){ }

			things[name]._colliding = function(){ for(var x in this.sections){ colliding(this.sections[x]) } }
			
			things[name].step = function(){	 }

			setTimeout(function(){ if(things[name]){ things[name].end()} }, things[name].duration*1000)
		}
		}
	},	
	beam: object = {
		cost: 3,
		go: function(player, coord){
			var shots = 0
			beam_interval = setInterval(function(){
				if(shots >= 10){
					clearInterval(this)
					return
				}
				shots++				
				
				var name = player.id + '-' + things_count
				things_count++
				things[name] = {}
				things_draw[name] = {}
				things[name].id = name
				things[name].speed = 30
				things[name].name = 'beam'
				things_draw[name].color = '#FF00FF'
				things[name].size = 10
				things_draw[name].size = 10
				things[name].damage = 3
				things[name].isperson = false
				things_draw[name].isperson = false
				var direction = new victor(coord[0] - player.x, coord[1] - player.y)
				direction.normalize()
				things[name].direction = direction
				things[name].x = player.x + (30*direction.x)
				things[name].y = player.y + (30*direction.y)
				things[name].destroy_on_wall = true
				things[name].collisions = []
				
				things[name].end = function(){
					delete things_draw[this.id]
					delete things[this.id]
					delete this
				}			
				
				things[name].collide = function(thing){
					if(thing.block){
						this.end()
						return
					}				
					if(things[name].collisions.indexOf(thing.id) > -1){ return }
					if(thing.isperson || thing.iszombie){ hit(thing, things[name].damage) }	
					things[name].collisions.push(thing.id)
					return
				}	
				
				things[name].step = function(){		
					this._x = this.x + (this.direction.x * this.speed)
					this._y = this.y + (this.direction.y * this.speed)
					this.x = this._x
					this.y = this._y
					things_draw[this.id].x = this.x
					things_draw[this.id].y = this.y					
					colliding(this)
					return
				}	
			
			
			},10)	

			//setTimeout(function(){clearInterval(beam_interval)}, 500)
		}
	},
	bounce: object = {
		cost: 1,
		go: function(player, coord){
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 0
			things[name].name = 'bounce'
			things_draw[name].color = "#00FFFF"
			things[name].size = 20
			things_draw[name].size = 20
			things[name].isperson = false
			things_draw[name].isperson = false
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (30*direction.x)
			things[name].y = player.y + (30*direction.y)
			things[name].destroy_on_wall = false
			things[name].timer = 0
			
			things[name].end = function(){
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}			
			
			things[name].collide = function(thing){
				if(thing.isperson){ return }
				thing.direction.multiply(reverse)
				return
			}	
			
			things[name].step = function(){		
				this.timer++
		
				if(this.timer >= 1000){
					delete things_draw[this.id]
					delete things[this.id]
					delete this
					return
				}
				
				if((this.timer)%2 == 0) {
					this.size += 1
					things_draw[this.id].size = this.size
				}
				else {
					this.size -= 1
					things_draw[this.id].size = this.size
				}	
	
				this._x = this.x
				this._y = this.y
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y					
				colliding(this)
				return
			}			
		}
	},	
	dodge: object = {
		cost: 1,
		go: function(player, coord){
			if(player.phase == "moving"){
				var dx = player.x
				var dy = player.y
				if(player.up){ dy -= 1 }
				else if(player.down){ dy += 1 }
				if(player.left){ dx -= 1 }
				else if(player.right){ dx += 1 }
				if((dx - player.x) == 0 && (dy - player.y) == 0){ return }
				else{
					player.dcount = 0
					player.ddirection = new victor(dx - player.x, dy - player.y)
					player.ddirection.normalize()
					player.phase = "dodging"
				}
			}
		}
	},
	explode: object = {
		cost: 1,
		go: function(player, coord){
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 2
			things[name].name = 'explode'
			things_draw[name].color = "#FFAA00"
			things[name].size = 20
			things_draw[name].size = 20
			things[name].damage = 20
			things[name].isperson = false
			things_draw[name].isperson = false
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (30*direction.x)
			things[name].y = player.y + (30*direction.y)
			things[name].destroy_on_wall = false
			things[name].trigger_on_wall = true
			things[name].hit = false
			things[name].hit_timer = 0
			things[name].collisions = []			
			
			things[name].end = function(){
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}			
			
			things[name].wall_collision = function(){
				this.hit = true
			}
			
			things[name].collide = function(thing){	
				if(thing.name == "bounce"){ return }	
				if(things[name].collisions.indexOf(thing.id) > -1){ return }				
				this.hit = true
				if(thing.isperson || thing.iszombie){
					hit(thing, things[name].damage)
				}	
				things[name].collisions.push(thing.id)
				return
			}	
			
			things[name].step = function(){	
				if(this.hit){
					this.size ++
					things_draw[this.id].size ++
					this.hit_timer ++
					if(this.hit_timer >= 300){
						delete things_draw[this.id]
						delete things[this.id]
						delete this
						return
					}
					this._x = this.x
					this._y = this.y
					colliding(this)
					return
				}
				
				this._x = this.x + (this.direction.x * this.speed)
				this._y = this.y + (this.direction.y * this.speed)
				this.x = this._x
				this.y = this._y
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y					
				colliding(this)
				return
			}			
		}
	},
	freeze: object = {
		cost: 2,
		go: function(player, coord){
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 4
			things[name].name = 'freeze'
			things_draw[name].color = "#00EEEE"
			things[name].size = 80
			things_draw[name].size = 80
			things[name].isperson = false
			things_draw[name].isperson = false
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (80*direction.x)
			things[name].y = player.y + (80*direction.y)
			things[name].destroy_on_wall = true
			things[name].collisions = []
			
			things[name].end = function(){
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}			
			
			things[name].collide = function(thing){
				
				if(thing.name == "bounce"){ return }
				if(things[name].collisions.indexOf(thing.id) > -1){ return }
				
				var hold = things_draw[thing.id].color
				thing.speed = 0
				things_draw[thing.id].color = "#00EEEE"
				setTimeout(function(){
					thing.speed = 1
					if(!things_draw[thing.id]){return}
					if(things_draw[thing.id].color == "#00EEEE"){ things_draw[thing.id].color = hold }	
				}, 6000)
				things[name].collisions.push(thing.id)
				return				
			}	
			
			things[name].step = function(){		
				this._x = this.x + (this.direction.x * this.speed)
				this._y = this.y + (this.direction.y * this.speed)
				this.x = this._x
				this.y = this._y
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y					
				colliding(this)
				return
			}			
		}
	},	
	gatling: object = {
		cost: 3,
		go: function(player, coord){
			var shots = 0
			
			var marker = player.id + '-' + things_count
			var name = player.id + '-' + things_count
			things_count++
			things_draw[name] = {}
			things_draw[name].x = coord[0]
			things_draw[name].y = coord[1]		
			things_draw[name].size = 20
			things_draw[name].color = '#5c5c5c'
			
			beam_interval =setInterval(function(){
				if(shots >= 50){
					delete things_draw[marker]
					clearInterval(this)
					return
				}
				shots++				
				
				var name = player.id + '-' + things_count
				things_count++
				things[name] = {}
				things_draw[name] = {}
				things[name].id = name
				things[name].speed = 5
				things[name].name = 'gatling'
				things_draw[name].color = "#666611"
				things[name].size = 10
				things_draw[name].size = 10
				things[name].damage = 4
				things[name].isperson = false
				things_draw[name].isperson = false
				var direction = new victor(coord[0] - player.x, coord[1] - player.y)
				direction.normalize()
				things[name].direction = direction
				things[name].x = player.x + (30*direction.x)
				things[name].y = player.y + (30*direction.y)
				things[name].destroy_on_wall = true
				
				things[name].end = function(){
					delete things_draw[this.id]
					delete things[this.id]
					delete this
				}			
				
				things[name].collide = function(thing){
					if(thing.block){
						this.end()
						return
					}				
					if(thing.isperson || thing.iszombie){
						hit(thing, things[name].damage)
						things[name].end()
					}					
					return
				}	
				
				things[name].step = function(){		
					this._x = this.x + (this.direction.x * this.speed)
					this._y = this.y + (this.direction.y * this.speed)
					this.x = this._x
					this.y = this._y
					things_draw[this.id].x = this.x
					things_draw[this.id].y = this.y					
					colliding(this)
					return
				}	
			
			
			},100)	
		}
	},	
	hulk: object = {
		cost: 20,
		go: function(player, coord){
			player.speed = 3
			player.size = 80
			player.color = "#04B404"
			player.health = 50
			
			player.collide = function(thing){
				
				if(thing.isperson || thing.iszombie){
					hit(thing, 50) 
				}
				return
			}
			things_draw[player.id].size = 80
			things_draw[player.id].color = "#04B404"
			setTimeout(function(){
				player.speed = 1
				player.size = 10
				player.color = "#000000"
				player.health = 10
				player.collide = function(thing){ }
				things_draw[player.id].size = 10
				things_draw[player.id].color = "#000000"
			}, 10000)
		}
	},	
	invisible: object = {
		cost: 1,
		go: function(player, coord){
			things_draw[player.id].invisible = true
			things_draw[player.id].color = "#FFFFFF"
			setTimeout(function(){
				things_draw[player.id].invisible = false
				things_draw[player.id].color = "#000000"
			}, 7000)
		}
	},		
	kamehameha: object = {
		cost: 3,
		go: function(player, coord){	
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 30
			things[name].damage = 20
			things[name].name = 'kamehameha'
			things_draw[name].color = "#3399FF"
			things[name].size = 0
			things_draw[name].size = 0
			
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (60*direction.x)
			things[name].y = player.y + (60*direction.y)
			
			things_draw[name].x = things[name].x
			things_draw[name].y = things[name].y				
			
			things[name].destroy_on_wall = true	
			things[name].collisions = []
			
			things[name].end = function(){
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}
			
			things[name].collide = function(thing){
				if(thing.block){
					this.end()
					return
				}				
				if(things[name].collisions.indexOf(thing.id) > -1){ return }	
				if(thing.isperson || thing.iszombie){ hit(thing, things[name].damage) }	
				things[name].collisions.push(thing.id)				
			}
			
			things[name].counter = 0
			
			things[name].step = function(){	
				this.counter ++
				if((this.counter)%2 == 0) {
					this.size ++
					things_draw[this.id].size = this.size
				}
				if(this.size < 50){ return }
		
				this._x = this.x + (this.direction.x * this.speed)
				this._y = this.y + (this.direction.y * this.speed)
				this.x = this._x
				this.y = this._y
				
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y					
				colliding(this)
				return
			}			
		}
	},		
	lazer: object = {
		cost: 5,
		go: function(player, coord){
			if(player.weapons['lazer']){ player.weapons['lazer'].end() }
			var name = player.id + '-lazer-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 0
			things[name].name = 'lazer'
			things_draw[name].color = "#FF0000"
			things[name].size = 0
			things[name].damage = 100
			things_draw[name].size = things[name].size
			things[name].isperson = false
			things_draw[name].isperson = false
			things[name].iszombie = false
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (50*direction.x)
			things[name].y = player.y + (50*direction.y)
			things_draw[name].x = things[name].x
			things_draw[name].y = things[name].y				
			things[name].destroy_on_wall = false	
			things[name].block = true
			things[name].counter = 0
			things[name].collisions = []
			things[name].activated = false
			
			//do sections
			things[name].sections = {}
			var length = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]
			var offset = 200
			for(var x in length){
				var _name =  things[name].id + '_' + x
				things[_name] = {}
				things[_name].id = _name
				things[_name].name = 'lazer'
				things[_name].speed = 0
				things[_name].direction = things[name].direction
				things[_name].block = true
				things[_name].size = things[name].size
				offset += 100
				things[_name].x = player.x + (offset*direction.x)
				things[_name].y = player.y + (offset*direction.y)
				things[_name].collide = function(thing){
					if(things[name].activated == false){ return }
					if(thing.name == "portal"){ return }
					if(things[name].collisions.indexOf(thing.id) > -1){ return }				
					if(thing.isperson || thing.iszombie){ hit(thing, things[name].damage) }	
					things[name].collisions.push(thing.id)					
					return
				}
				things[_name].end = function(){}
				things[_name].step = function(){}
				
				things_draw[_name] = {}
				things_draw[_name].x = things[_name].x
				things_draw[_name].y = things[_name].y
				things_draw[_name].color = things_draw[name].color
				things_draw[_name].size = 3
				
				things[name].sections[_name] = things[_name]
			}
			
			player.weapons['lazer'] = things[name]
			things[name].owner = player
			
			things[name].update = function(person){
				if(this.activated){
					for(var x in person.weapons['lazer'].sections){
						person.weapons['lazer'].sections[x].size += 1
						things_draw[person.weapons['lazer'].sections[x].id].size += 1
					}
				}
				
				things_draw[person.weapons['lazer'].id].x = person.weapons['lazer'].x
				things_draw[person.weapons['lazer'].id].y = person.weapons['lazer'].y			
				person.weapons['lazer']._x = person.weapons['lazer'].x
				person.weapons['lazer']._y = person.weapons['lazer'].y
				if(person.up){ person.weapons['lazer']._y -= person.speed }
				else if(person.down){ person.weapons['lazer']._y += person.speed }
				if(person.left){ person.weapons['lazer']._x -= person.speed }
				else if(person.right){ person.weapons['lazer']._x += person.speed }
				person.weapons['lazer']._colliding()				
			}
			
			things[name].move = function(person){
				this.x = this._x
				this.y = this._y
				var offset = 0
				for(var x in this.sections){
					offset += 50
					this.sections[x].x = this._x + (offset*this.direction.x)
					this.sections[x].y = this._y + (offset*this.direction.y)
					this.sections[x]._x = this.sections[x].x
					this.sections[x]._y = this.sections[x].y
					things_draw[this.sections[x].id].x = this.sections[x].x
					things_draw[this.sections[x].id].y = this.sections[x].y
				}
			}
								
			things[name].end = function(){
				for(var x in this.sections){
					delete things_draw[this.sections[x].id]
					delete things[this.sections[x].id]
					delete this.sections[x]
				}
				
				delete things_draw[this.id]
				delete this.owner.weapons['lazer']				
				delete things[this.id]
				delete this
			}
			
			things[name].swing = function(coord){
				var direction = new victor(coord[0] - player.x, coord[1] - player.y)
				direction.normalize()
				this.direction = direction
				this.x = player.x + (20*direction.x)
				this.y = player.y + (20*direction.y)
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y	
				
				var offset = 0
				for(var x in this.sections){
					offset += this.size
					this.sections[x].x = player.x + (offset*this.direction.x)
					this.sections[x].y = player.y + (offset*this.direction.y)
				}				
			}
			
			things[name].collide = function(thing){	
				if(things[name].activated == false){ return }
				if(thing.name == "portal"){ return }
				if(thing.block){ return }				
				if(things[name].collisions.indexOf(thing.id) > -1){ return }				
				if(thing.isperson || thing.iszombie){ hit(thing, things[name].damage) }	
				things[name].collisions.push(thing.id)
				return
			}

			things[name]._colliding = function(){
				for(var x in this.sections){ colliding(this.sections[x]) }
			}
			
			things[name].step = function(){	 }

			setTimeout(function(){
				if(things[name]){
					things_draw[name].color = "#FF3399"
					things[name].activated = true
				}
			}, 1000)		
			setTimeout(function(){
				if(things[name]){
					things[name].end()
				}
			}, 1500)
		}
	},	
	lion: object = {
		cost: 5,
		go: function(player, coord){
			
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 2
			things[name].name = 'lion'
			things_draw[name].color = "#CC3300"
			things[name].size = 30
			things_draw[name].size = 30
			things[name].isperson = false
			things_draw[name].isperson = false
			things[name].iszombie = true
			things[name].health = 40
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (40*direction.x)
			things[name].y = player.y + (40*direction.y)
			things[name].destroy_on_wall = false	
			things[name].creator = player.id
			things[name].damage = 30
			things[name].phase = 'zombie'
			
			things[name].end = function(){
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}
			
			things[name].collide = function(thing){
				if(thing.isperson){ hit(thing, this.damage) }
			}
	
			things[name].step = function(){	
				var target = null
				var closest = 10000
				for(var x in people){
					if(this.creator == x){ continue }
					if(people[x].isdead){ continue }
					var a = Math.pow(people[x].x - this.x, 2)
					var b = Math.pow(people[x].y - this.y, 2)
					var c = Math.sqrt(a + b)
					if(c < closest){ 
						closest = c
						target = people[x]
					}
				}
				
				if(target == null){ return }
				
				var direction = new victor(target.x - this.x, target.y - this.y)
				direction.normalize()
				this.direction = direction
				
				this._x = this.x + (this.direction.x * this.speed)
				this._y = this.y + (this.direction.y * this.speed)
				
				if(colliding(this)){ return }
				else{		
					things_draw[this.id].x = this.x
					things_draw[this.id].y = this.y
					this.x = this._x
					this.y = this._y
					return
				}
			}
		}
	},	
	mine: object = {
		cost: 1,
		go: function(player, coord){
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 0
			things[name].name = 'mine'
			things_draw[name].color = "#FFAA00"
			things[name].size = 20
			things_draw[name].size = 20
			things[name].damage = 20
			things[name].isperson = false
			things_draw[name].isperson = false
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (40*direction.x)
			things[name].y = player.y + (40*direction.y)
			things[name].destroy_on_wall = false
			things[name].trigger_on_wall = true
			things[name].hit = false
			things[name].hit_timer = 0
			things[name].collisions = []
			things[name].timer = 0
			
			things[name].end = function(){
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}			
			
			things[name].wall_collision = function(){
				this.hit = true
			}
			
			things[name].collide = function(thing){	
				console.log(thing)
				if(thing.name == "bounce"){ return }	
				if(things[name].collisions.indexOf(thing.id) > -1){ return }				
				this.hit = true
				if(thing.isperson || thing.iszombie){
					hit(thing, things[name].damage)
				}	
				things[name].collisions.push(thing.id)
				return
			}	
			
			things[name].step = function(){
				if(this.hit){
					this.size ++
					things_draw[this.id].size ++
					this.hit_timer ++
					if(this.hit_timer >= 300){
						delete things_draw[this.id]
						delete things[this.id]
						delete this
						return
					}
					this._x = this.x
					this._y = this.y
					colliding(this)
					return
				}
				
				this.timer++
				
				if(this.timer == 60){
					this.timer = 0
				}
				
				if((this.timer)%2 == 0) {
					this.size += 8
					things_draw[this.id].size +=8
				}
				else {
					this.size -= 5
					things_draw[this.id].size -= 5
				}				
				
				this._x = this.x + (this.direction.x * this.speed)
				this._y = this.y + (this.direction.y * this.speed)
				this.x = this._x
				this.y = this._y
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y					
				colliding(this)
				return
			}			
		}
	},	
	nuke: object = {
		cost: 4,
		go: function(player, coord){
			var name = player.id + '-' + things_count
			things_count++
			things_draw[name] = {}
			things_draw[name].x = coord[0]
			things_draw[name].y = coord[1]		
			things_draw[name].size = 50
			things_draw[name].color = '#00FF00'
			
			things[name] = {}
			things_count++
			things[name].id = name
			things[name].name = 'nuke'
			things_draw[name].color = "#00FF00"
			things[name].size = 0
			things[name].damage = 100
			things[name].x = coord[0]
			things[name].y = coord[1]
			things[name]._x = coord[0]
			things[name]._y = coord[1]
			things[name].destroy_on_wall = false
			things[name].counter = 0
			things[name].detonated = false
			things[name].collisions = []			
			
			things[name].end = function(){
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}			
			
			things[name].collide = function(thing){
				if(things[name].collisions.indexOf(thing.id) > -1){ return }
				if(thing.isperson || thing.iszombie){
					hit(thing, things[name].damage)
				}
				things[name].collisions.push(thing.id)				
				return
			}	
			
			things[name].step = function(){
				this.counter+=1
				if(this.counter/60 == 5){
					if(!this.detonated){
						this.detonated = true
						this.counter = 0
					}
				}
				if(this.detonated){
					this.size += 3
					things_draw[this.id].size = this.size
					if(this.size <= 600){
						things_draw[this.id].color = "#FFFF00"
					}
					if(this.size <= 400){
						things_draw[this.id].color = "#FF9933"
					}					
					if(this.size <= 200){
						things_draw[this.id].color = "#FF0000"
					}		
					colliding(this)
					if(this.size >= 600){
						this.end()
						return
					}
				}
			}
		}
	},	
	parry: object = {
		cost: 1,
		go: function(player, coord){	
			var wname = 'parry'
			if(player.weapons[wname]){ player.weapons[wname].end() }
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 0
			things[name].name = wname
			things_draw[name].color = "#00DD00"
			things[name].size = 15
			things[name].damage = 30
			things_draw[name].size = things[name].size
			things[name].isperson = false
			things_draw[name].isperson = false
			things[name].iszombie = false
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (25*direction.x)
			things[name].y = player.y + (25*direction.y)
			things_draw[name].x = things[name].x
			things_draw[name].y = things[name].y				
			things[name].destroy_on_wall = false	
			things[name].block = false
			things[name].counter = 0
			things[name].collisions = []
			things[name].separation = 10
			
			things[name].collide = function(thing){								
				if(thing.name == "portal"){
					this.end()
					return
				}
				if(!thing.isperson && thing.owner != player){
					thing.direction.multiply(reverse)
				}
				if(thing.block){
					this.end()
					return
				}				
				if(things[name].collisions.indexOf(thing.id) > -1){ return }				
				if(thing.isperson || thing.iszombie){ hit(thing, things[name].damage) }	
				things[name].collisions.push(thing.id)
				return
			}			
			
			//do sections
			things[name].sections = {}
			var length = [0,1,2,3]
			var offset = things[name].size + 10
			for(var x in length){
				var _name =  things[name].id + '_' + x
				things[_name] = {}
				things_draw[_name] = {}
				things[_name].id = _name
				things[_name].name = wname
				things[_name].speed = 0
				things[_name].direction = new victor(direction.x, direction.y)
				if(x < 2){
					things[_name].tag = 1
					things[_name].x = player.x + (offset*direction.x)
					things[_name].y = player.y + (offset*direction.y)				
					offset += things[_name].size + things[name].separation
				}
				if(x == 2){
					things[_name].tag = 2
					things[_name].direction.rotate(1).normalize()
					things[_name].x = player.x + ((things[name].size + 10)*direction.x)
					things[_name].y = player.y + ((things[name].size + 10)*direction.y)	
				}
				if(x == 3){
					things[_name].tag = 3
					things[_name].direction.rotate(-1).normalize()
					things[_name].x = player.x + ((things[name].size + 10)*direction.x)
					things[_name].y = player.y + ((things[name].size + 10)*direction.y)				
				}
				things[_name].block = false
				things[_name].size = things[name].size
				things[_name].collide = things[name].collide
				things[_name].end = function(){}
				things[_name].step = function(){}
				
				things_draw[_name].x = things[_name].x
				things_draw[_name].y = things[_name].y
				things_draw[_name].size = things[_name].size
				things_draw[_name].color = things_draw[name].color
				
				things[name].sections[_name] = things[_name]
			}
			
			player.weapons[wname] = things[name]
			things[name].owner = player
		
			things[name].update = function(person){
				things_draw[person.weapons[wname].id].x = person.weapons[wname].x
				things_draw[person.weapons[wname].id].y = person.weapons[wname].y			
				person.weapons[wname]._x = person.weapons[wname].x
				person.weapons[wname]._y = person.weapons[wname].y
				if(person.up){ person.weapons[wname]._y -= person.speed }
				else if(person.down){ person.weapons[wname]._y += person.speed }
				if(person.left){ person.weapons[wname]._x -= person.speed }
				else if(person.right){ person.weapons[wname]._x += person.speed }
				person.weapons[wname]._colliding()				
			}
			
			things[name].move = function(person){
				this.x = this._x
				this.y = this._y
				var offset = things[name].size + 10
				for(var x in this.sections){
					if(this.sections[x].tag == 2){
						this.sections[x].x = this._x + (things[name].size + 10)*this.sections[x].direction.x
						this.sections[x].y = this._y + (things[name].size + 10)*this.sections[x].direction.y					
					}
					if(this.sections[x].tag == 3){
						this.sections[x].x = this._x + (things[name].size + 10)*this.sections[x].direction.x
						this.sections[x].y = this._y + (things[name].size + 10)*this.sections[x].direction.y
					}					
					if(this.sections[x].tag == 1){
						this.sections[x].x = this._x + (offset*this.direction.x)
						this.sections[x].y = this._y + (offset*this.direction.y)
						offset += this.size+things[name].separation
					}
					this.sections[x]._x = this.sections[x].x
					this.sections[x]._y = this.sections[x].y
					things_draw[this.sections[x].id].x = this.sections[x].x
					things_draw[this.sections[x].id].y = this.sections[x].y
				}
			}
								
			things[name].end = function(){
				for(var x in this.sections){
					delete things_draw[this.sections[x].id]
					delete things[this.sections[x].id]
					delete this.sections[x]
				}
				
				delete things_draw[this.id]
				delete this.owner.weapons[wname]				
				delete things[this.id]
				delete this
			}
			
			things[name].swing = function(coord){
				// var direction = new victor(coord[0] - player.x, coord[1] - player.y)
				// direction.normalize()
				// this.direction = direction
				// this.x = player.x + (20*direction.x)
				// this.y = player.y + (20*direction.y)
				// things_draw[this.id].x = this.x
				// things_draw[this.id].y = this.y	
				
				// var offset = 0
				// for(var x in this.sections){
					// offset += this.size
					// this.sections[x].x = player.x + (offset*this.direction.x)
					// this.sections[x].y = player.y + (offset*this.direction.y)
				// }				
			}

			things[name]._colliding = function(){
				//colliding(this)
				for(var x in this.sections){ colliding(this.sections[x]) }
			}
			
			things[name].step = function(){	 }

			setTimeout(function(){ if(things[name]){ things[name].end()} }, 800)
		}
	},		
	portal: object = {
		cost: 1,
		go: function(player, coord){
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 0
			things[name].name = 'portal'
			things_draw[name].color = "#FF00FF"
			things[name].size = 20
			things_draw[name].size = 20
			things[name].isperson = false
			things_draw[name].isperson = false
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (30*direction.x)
			things[name].y = player.y + (30*direction.y)
			things[name].destroy_on_wall = false
			things[name].timer = 0
	
			things[name].end = function(){
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}	
			
			things[name].collide = function(thing){		
				if(thing.name == 'sword'){ return }
				spawn(thing)
				return
			}	
			
			things[name].step = function(){		
				this.timer++
		
				if(this.timer >= 1000){
					delete things_draw[this.id]
					delete things[this.id]
					delete this
					return
				}
				
				if((this.timer)%2 == 0) {
					this.size += 5
					things_draw[this.id].size +=5
				}
				else {
					this.size -= 5
					things_draw[this.id].size -= 5
				}	
	
				this._x = this.x
				this._y = this.y
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y					
				colliding(this)
				return
			}			
		}
	},	
	rock: object = {
		cost: 2,
		go: function(player, coord){
			if(player.weapons['rock']){ 
				//throw rock
				player.weapons['rock'].thrown = true
				player.weapons['rock'].collisions = []
				return
			}
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 3
			things[name].name = 'rock'
			things_draw[name].color = "#777777"
			things[name].size = 70
			things_draw[name].size = 70
			things[name].damage = 20
			things[name].isperson = false
			things_draw[name].isperson = false
			things[name].iszombie = false
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (60*direction.x)
			things[name].y = player.y + (60*direction.y)
			things_draw[name].x = things[name].x
			things_draw[name].y = things[name].y				
			things[name].destroy_on_wall = true	
			things[name].thrown = false
			things[name].block = true
			things[name].collisions = []	
			
			player.weapons['rock'] = things[name]
			things[name].owner = player
			
			things[name].move = function(person){
				this.x = this._x
				this.y = this._y
			}
			
			things[name].update = function(person){
				if(this.thrown){ return }
				things_draw[person.weapons['rock'].id].x = person.weapons['rock'].x
				things_draw[person.weapons['rock'].id].y = person.weapons['rock'].y			
				person.weapons['rock']._x = person.weapons['rock'].x
				person.weapons['rock']._y = person.weapons['rock'].y
				if(person.up){ person.weapons['rock']._y -= person.speed }
				else if(person.down){ person.weapons['rock']._y += person.speed }
				if(person.left){ person.weapons['rock']._x -= person.speed }
				else if(person.right){ person.weapons['rock']._x += person.speed }
				colliding(person.weapons['rock'])
			}
			
			things[name].end = function(){
				delete player.weapons['rock']
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}
			
			things[name].collide = function(thing){
				if(thing.name == "portal"){
					this.thrown = true
					return
				}
				if(thing.block && this.thrown == true){
					this.end()
					return
				}				
				if(things[name].collisions.indexOf(thing.id) > -1){ return }	
				if(thing.isperson || thing.iszombie){ hit(thing, things[name].damage) }	
				things[name].collisions.push(thing.id)
				return
			}

			things[name].step = function(){	
				if(!this.thrown){ return }
				this._x = this.x + (this.direction.x * this.speed)
				this._y = this.y + (this.direction.y * this.speed)
				this.x = this._x
				this.y = this._y
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y					
				colliding(this)
				return
			}			
		}
	},		
	shield: object = {
		cost: 1,
		go: function(player, coord){
			if(player.has_shield == true){
				player.shield.end()
				return
			}
			player.has_shield = true
			player.health = 1000
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].name = 'shield'
			things_draw[name].color = "#000000"
			things[name].size = 60
			things_draw[name].size = 60
			things[name].isperson = false
			things_draw[name].isperson = false
			things[name].x = player.x
			things[name].y = player.y
			things[name].destroy_on_wall = false			
			
			things[name].block = true
			
			things[name].timer = 0
			things[name].counter = 0
			things[name].owner = player
			player.shield = things[name]
			
			things[name].end = function(){
				this.owner.health = 10
				this.owner.has_shield = false
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}			
			
			things[name].collide = function(thing){	

				return
			}	
			
			things[name].step = function(){	
				this.counter += 1
				if(this.counter == 60){
					this.counter = 0
					this.timer += 1
					if(this.timer == 5){
						this.end()
						return
					}
				}
				
				this._x = this.owner.x
				this._y = this.owner.y
				this.x = this._x
				this.y = this._y
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y					
				colliding(this)
				return
			}			
		}
	},	
	shoot: object = {
		cost: 0,
		go: function(player, coord){
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 6
			things[name].name = 'shoot'
			things_draw[name].color = "#FF0000"
			things[name].size = 16
			things[name].damage = 3
			things_draw[name].size = things[name].size
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (30*direction.x)
			things[name].y = player.y + (30*direction.y)
			things[name].destroy_on_wall = true
			
			things[name].end = function(){
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}			
			
			things[name].collide = function(thing){
				if(thing.block){
					things[name].end()
					return
				}
				if(thing.isperson || thing.iszombie){
					hit(thing, things[name].damage)
					things[name].end()
				}	
				return
			}	
			
			things[name].step = function(){		
				this._x = this.x + (this.direction.x * this.speed)
				this._y = this.y + (this.direction.y * this.speed)
				this.x = this._x
				this.y = this._y
				things_draw[this.id].x = this.x
				things_draw[this.id].y = this.y					
				colliding(this)
				return
			}			
		}
	},	
	sprint: object = {
		cost: 2,
		go: function(player, coord){
			player.speed = 3
			player.sprinting = true
			setTimeout(function(){
				player.speed = 1
			}, 1000)
		}
	},		
	sword: object = {
		cost: 1,
		go: function(player, coord){	
			if(player.weapons['sword']){ player.weapons['sword'].end() }
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things[name].id = name
			things[name].name = 'sword'
			things[name]._size = 20
			things[name].damage = 5
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].unreal = false
			things[name].counter = 0
			things[name].collisions = []
			things[name].owner = player
			
			//do sections
			things[name].sections = {}
			var length = [0,1,2,3,4,5]
			var offset = 15
			for(var x in length){
				var _name =  things[name].id + '_' + x
				things[_name] = {}
				things[_name].id = _name
				things[_name].name = 'sword'
				things[_name].owner = things[name].owner
				things[_name].isweapon = true
				things[_name].direction = things[name].direction
				things[_name].block = true
				things[_name].size = things[name]._size
				offset += things[_name].size
				things[_name].x = player.x + (offset*direction.x)
				things[_name].y = player.y + (offset*direction.y)
				things[_name].collide = function(thing){
					if(thing.name == "portal"){
						this.end()
						return
					}
					// if(thing.block){
						// things[name].end()
						// return
					// }}
					if(things[name].collisions.indexOf(thing.id) < 0){				
						if(thing.isperson || thing.iszombie){
							hit(thing, things[name].damage)
							knockback(thing, this.owner)
						}
						if(thing.isweapon){
							if(thing.owner != this.owner){
								knockback(thing.owner, this.owner)
							}
						}
						else{ things[name].collisions.push(thing.id) }
					}										
					return
				}
				things[_name].end = function(){}
				things[_name].step = function(){}
				
				things_draw[_name] = {}
				things_draw[_name].x = things[_name].x
				things_draw[_name].y = things[_name].y
				things_draw[_name].color = "#000000"
				things_draw[_name].size = things[_name].size
				
				things[name].sections[_name] = things[_name]
			}
			
			player.weapons['sword'] = things[name]
			
			things[name].update = function(person){
				var offset = 20
				for(var x in this.sections){
					offset += this._size
					things_draw[this.sections[x].id].x = this.sections[x].x
					things_draw[this.sections[x].id].y = this.sections[x].y					
					this.sections[x]._x = person.x + (offset*this.direction.x)
					this.sections[x]._y = person.y + (offset*this.direction.y)
					colliding(this.sections[x])
				}				
			}
			
			things[name].move = function(person){
				for(var x in this.sections){
					this.sections[x].x = this.sections[x]._x
					this.sections[x].y = this.sections[x]._y
				}			
			}
								
			things[name].end = function(){
				for(var x in this.sections){
					delete things_draw[this.sections[x].id]
					delete things[this.sections[x].id]
					delete this.sections[x]
				}
				
				delete things_draw[this.id]
				delete this.owner.weapons['sword']				
				delete things[this.id]
				delete this
			}
			
			things[name].collide = function(thing){	}

			things[name]._colliding = function(){ for(var x in this.sections){ colliding(this.sections[x]) } }
			
			things[name].step = function(){	}

			setTimeout(function(){ if(things[name]){ things[name].end()} }, 500)
		}
	},											
	zombie: object = {
		cost: 1,
		go: function(player, coord){
			
			var name = player.id + '-' + things_count
			things_count++
			things[name] = {}
			things_draw[name] = {}
			things[name].id = name
			things[name].speed = 1
			things[name].name = 'zombie'
			things_draw[name].color = "#259325"
			things[name].size = 10
			things_draw[name].size = 10
			things[name].isperson = false
			things_draw[name].isperson = false
			things[name].iszombie = true
			things[name].health = 20
			var direction = new victor(coord[0] - player.x, coord[1] - player.y)
			direction.normalize()
			things[name].direction = direction
			things[name].x = player.x + (20*direction.x)
			things[name].y = player.y + (20*direction.y)
			things[name].destroy_on_wall = false	
			things[name].creator = player.id
			things[name].damage = 20
			things[name].phase = 'zombie'
			
			things[name].end = function(){
				delete things_draw[this.id]
				delete things[this.id]
				delete this
			}
			
			things[name].collide = function(thing){
				if(thing.isperson){ hit(thing, this.damage) }
			}
	
			things[name].step = function(){	
				var target = null
				var closest = 10000
				for(var x in people){
					if(this.creator == x){ continue }
					if(people[x].isdead){ continue }
					var a = Math.pow(people[x].x - this.x, 2)
					var b = Math.pow(people[x].y - this.y, 2)
					var c = Math.sqrt(a + b)
					if(c < closest){ 
						closest = c
						target = people[x]
					}
				}
				
				if(target == null){ return }
				
				var direction = new victor(target.x - this.x, target.y - this.y)
				direction.normalize()
				this.direction = direction
				
				this._x = this.x + (this.direction.x * this.speed)
				this._y = this.y + (this.direction.y * this.speed)
				
				if(colliding(this)){ return }
				else{		
					things_draw[this.id].x = this.x
					things_draw[this.id].y = this.y
					this.x = this._x
					this.y = this._y
					return
				}
			}
		}
	}	
}

io.on('connection', function(client){//socket io
	people[client.id] = {}
	var P = people[client.id]
	P.id = client.id
	P.health = 10
	P.energy = 10
	P.speed = 1
	P.size = 10
	P.isperson = true
	P.up = false
	P.down = false
	P.left = false
	P.right = false
	P.color = "#000000"
	P.m1 = actions['sword']
	P.m2 = actions['axe']
	P.space = actions['dodge']
	P.collide = function(thing){  }
	
	//new shit
	P.ddirection = new victor(0,0)
	P.dspeed = 10
	P.dcount = 0
	P.ddistance = 15
	P.phase = "moving"
	P.set1 = weapons["punch"]
	P.set2 = weapons["punch"]
	P.equip = 1
	
	P.weapons = {}
	
	P.end = function(){
		var hold_id = this.id
		this.isdead = true	
		
		for(var x in this.weapons){ if(this.weapons[x]){ this.weapons[x].end() } }
		
		var name = this.id + '-tombstone'
		things_draw[name] = {}
		things_draw[name].isperson = false	
		things_draw[name].size = 10
		things_draw[name].x = this.x
		things_draw[name].y = this.y
		things_draw[name].color = "#AAAAAA"
		
		this.x = -100
		this.y = -100
		
		setTimeout(function(){ person_spawn(hold_id) } ,10000)		
	}
	
	P.step = function(){
		things_draw[this.id].x = this.x
		things_draw[this.id].y = this.y
		things_draw[this.id].energy = this.energy
		things_draw[this.id].health = this.health
		things_draw[this.id].phase = this.phase
		
		this._x = this.x
		this._y = this.y
		_size = this.size/2
		if(this.phase == "moving"){
			if(this.up){ this._y -= this.speed }
			else if(this.down){ this._y += this.speed }
			if(this.left){ this._x -= this.speed }
			else if(this.right){ this._x += this.speed }	
		}
		else if(this.phase == "dodging"){
			this._x += this.ddirection.x * this.dspeed
			this._y += this.ddirection.y * this.dspeed
			this.dcount += 1
			if(this.dcount == this.ddistance){ this.phase = "moving" }
		}
		else if(this.phase == "knockback"){
			this._x += this.ddirection.x * this.dspeed
			this._y += this.ddirection.y * this.dspeed
			this.dcount += 1
			if(this.dcount == this.ddistance){ this.phase = "moving" }
		}
		
		update_weapons(this)
		//for knockback, have colliding change _x/_y
		if(colliding(this)){ return }
		else{
			move_weapons(this)
			this.x = this._x
			this.y = this._y
			return
		}
	}

	things_draw[client.id] = {}
	things_draw[client.id].isperson = true	
	things_draw[client.id].size = 10
	things_draw[client.id].color = "#000000"
	
	things[client.id] = P
	spawn(P)
	client.emit('init', P)	
	console.log('connected (' + people[client.id].x + ', ' + people[client.id].y + ')')	
	
	client.on('disconnect', function(){
		delete people[client.id]
		delete things_draw[client.id]
		delete things[client.id]
	})
	
	client.on('keys', function(up, down, left, right){
		people[client.id].up = up
		people[client.id].down = down
		people[client.id].left = left
		people[client.id].right = right
	})
	
	client.on('action', function(which, coord){
		if(people[client.id].isdead){ return }
		switch(which){
			case 'left':
				if(people[client.id].energy <= 0){ break }
				people[client.id].energy -= people[client.id].m1.cost
				people[client.id].m1.go(people[client.id], coord)
				break
			case 'right':
				if(people[client.id].energy <= 0){ break }
				people[client.id].energy -= people[client.id].m2.cost
				people[client.id].m2.go(people[client.id], coord)
				break
			case 'space':
				if(people[client.id].energy <= 0){ break }
				people[client.id].energy -= people[client.id].space.cost
				people[client.id].space.go(people[client.id], coord)
				break
			default:
		}
	})		
	
	client.on('agent',function(bot){
		switch(bot){
			case 'agent':
				bots['agent'].spawn()
				break
			default:
		}
	})
	
	client.on('respawn',function(){ 
		//person_spawn(P)
	})
	
	client.on('change',function(action, key){
		switch(key){
			case 'left':
				people[client.id].m1 = actions[action]
				break
			case 'right':
				people[client.id].m2 = actions[action]
				break
			case 'space':
				people[client.id].space = actions[action]
				break
			default:
		}
	})	
	
	client.on('mouse', function(mx, my){
		people[client.id].mouse_x = mx
		people[client.id].mouse_y = my
	})
	
	client.on('switch', function(){
		if(people[client.id].equip == 1){ people[client.id].equip = 2 }
		else{ people[client.id].equip = 1 }
	})
	
	// client.on('help', function(){
		
	// }
})