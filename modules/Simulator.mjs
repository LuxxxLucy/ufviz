import { Rulial } from "./Rulial.mjs";
import { Rewriter } from "./Rewriter.mjs";
import { Graph3D } from "./graph3d/Graph3D.mjs";
import { HDC } from "./HDC.mjs";
import { SpriteText } from "./SpriteText.mjs";

/**
* @class User interface for rewriter
* @author Mika Suominen
* @author Tuomas Sorakivi
*/
class Simulator extends Rewriter {

	/**
	* Reference frame
	* @typedef {Object} RefFrame
	* @property {number} view Viewmode, 1 = space (default), 2 = time
	* @property {boolean} leaves If true, show only leaves of the multiway system
	* @property {number} branches Field for branches to show, 0 = all
	*/

	/**
	* Creates an instance of Simulator.
	* @param {Object} element DOM element of the canvas
	* @param {Object} status DOM element of the status
	* @constructor
	*/
	constructor(canvas,status) {
		super();
    this.G = new Graph3D(canvas);
		this.dom = status; // DOM element for status

		this.maxtokenid = -1; // Max token id shown in phase view

    this.pos = 0; // Event log position
		this.playpos = 0; // Play position
		this.playing = false; // Is play on?
		this.stopfn = null; // stop callback function

		// Observer's reference frame
		this.observer = {
			view: 1, // space view
			leaves: true, // show only leaves
			branches: 0 // show all branches
		};

		this.H = new Map(); // Highlights
		this.F = null; // Fields

		// Variables x and y
		this.x = 0;
		this.y = 0;
		this.G.FG
			.onNodeClick( Simulator.onNodeClick.bind(this) )
			.onNodeRightClick( Simulator.onNodeRightClick.bind(this) )
			.nodeThreeObjectExtend( true );
	}

	/**
	* Click on node, set x
	* @param {Object} n Node object
	* @param {Object} event Event object
	*/
	static onNodeClick( n, event) {
		this.x = n.id;
		this.G.FG.nodeThreeObject( Simulator.nodeThreeObject.bind(this) );
		this.refresh();
	}

	/**
	* Right click on node, set y
	* @param {Object} n Node object
	* @param {Object} event Event object
	*/
	static onNodeRightClick( n, event) {
		this.y = n.id;
		this.G.FG.nodeThreeObject( Simulator.nodeThreeObject.bind(this) );
		this.refresh();
	}

	/**
	* Display x and/or y.
	* @param {Object} n Node object
	*/
	static nodeThreeObject( n ) {
		if ( n.id === this.x ) {
			if ( n.id === this.y ) {
				n.big = true;
				return new SpriteText("x=y",26,"DarkSlateGray");
			} else {
				n.big = true;
				return new SpriteText("x",26,"DarkSlateGray");
			}
		} else if ( n.id === this.y ) {
			n.big = true;
			return new SpriteText("y",26,"DarkSlateGray");
		} else {
			n.big = false;
			return false;
		}
	}

	/**
	* Check rewriting rule by passing it to algorithmic parser.
	* @param {string} rulestr Rewriting rule in string format.
	* @return {string} Rewriting rule in standard string format.
	*/
	validateRule( rulestr ) {
		let r = new Rulial();
		r.setRule( rulestr );
		return r.getRule();
	}

	/**
	* Set observer's reference frame
	* @param {RefFrame} rf
	*/
	setRefFrame( rf ) {
		if ( rf.hasOwnProperty("view") ) {
			let initlen;
			switch( rf.view ) {
				case "time":
					this.observer.view = 2;
					initlen = 1;
					break;
				case "phase":
					this.observer.view = 3;
					initlen = this.rulial.initial.length;
					this.maxtokenid = -1;
					break;
				default: // space
					this.observer.view = 1;
					initlen = this.rulial.initial.length;
			}

			// Stop animation and set position to start
			this.stop();
			this.pos = 0;
			this.playpos = 0;

			// Reset graph
			this.G.reset( this.observer.view );

			// First additions
			this.tick( initlen );
		}

		if ( ( rf.hasOwnProperty("branches") && rf.branches !== this.observer.branches ) ||
	 			 ( rf.hasOwnProperty("leaves") && rf.leaves !== this.observer.leaves ) ) {
			let update = false;
			if ( rf.hasOwnProperty("branches") ) {
				this.observer.branches = rf.branches;
				update = true;
			}
			if ( rf.hasOwnProperty("leaves") ) {
				this.observer.leaves = rf.leaves;
				if ( this.observer.view === 1 ) update = true;
			}
			if ( update ) {
				this.processSpatialEvent( this.multiway.EV[ i ] );
			}
			this.refresh();
		}

	}

	/**
	* Refresh UI.
	*/
	refresh() {
		if ( this.dom ) {
			let s = this.status();
			let str = "";
			Object.keys(s).forEach( k => {
				str += '<span class="label up">'+k+'</span><span class="label status">'+s[k]+'</span>';
			});
			this.dom.innerHTML = str;
		}
		this.G.refresh(); // Refresh graph
	}

	/**
	* Show of hide edges in spatial graph.
	* @param {Object} ev Event reference
	* @param {boolean} [reverse=false] If true, reverse the process of add and remove nodes
	* @return {boolean} True, if some was made
	*/
	processSpatialEvent( ev, reverse = false ) {
		const tokens = [ ...ev.child, ...ev.parent ];

		let change = false;
		let bfn = (a,x) => a | (x.id <= ev.id ? x.b :0);
		if ( this.observer.branches ) {
			tokens.forEach( t => {
				let b = t.parent.reduce( bfn, 0 );
				if ( this.observer.leaves ) {
					b &= ~t.child.reduce( bfn, 0 );
				}
				if ( b & this.observer.branches ) {
					if ( !this.G.T.has( t ) && !reverse) {
						this.G.add(t,1);
						change = true;
					} else if ( this.G.T.has( t ) && reverse ) {
						this.G.del(t);
						change = true;
					}
				} else {
					if ( this.G.T.has( t ) && !reverse) {
						this.G.del(t);
						change = true;
					} else if ( !this.G.T.has( t ) && reverse) {
						this.G.add(t,1);
						change = true;
					}
				}
			});
		} else {
			tokens.forEach( t => {
				if ( this.observer.leaves && t.child.some( x => x.id <= ev.id ) ) {
					if ( this.G.T.has( t ) && !reverse) {
						this.G.del(t);
						change = true;
					}
					else if ( !this.G.T.has( t ) && reverse) {
						this.G.add(t,1);
						change = true;
					}
				} else {
					if ( !this.G.T.has( t ) && !reverse) {
						this.G.add(t,1);
						change = true;
					} else if ( this.G.T.has( t ) && reverse) {
						this.G.del(t);
						change = true;
					}
				}
			});
		}

		return change;
	}

	/**
	* Process events.
	* @param {number} [steps=1] Number of steps to process
	* @param {boolean} [reverse=false] If true, reverse the process of add and remove nodes
	* @return {boolean} True there are more events to process.
	*/
	tick( steps = 1, reverse = false ) {
		while ( steps > 0 && (( reverse && this.pos > 0) || ( !reverse && this.pos < this.multiway.EV.length))) {
			let ev = reverse ? this.multiway.EV[ this.pos - 1 ] : this.multiway.EV[ this.pos ];
			let changed = false;
			changed = this.processSpatialEvent( ev, reverse);
			if ( changed ) {
				steps--;
				if ( reverse ) {
					this.playpos = 0;
				} else {
					this.playpos++;
				}
			}
			if (reverse) {
				this.pos--;
			} else {
				this.pos++;
			}
		}
		this.refresh();

		return reverse ? (this.pos > 1) : (this.pos < this.multiway.EV.length);
	}

	/**
	* Timed update process.
	*/
	update() {
		const steps = Math.min( 15, Math.ceil( ( this.playpos + 1 ) / 10) );
		if ( this.tick( steps ) ) {
			if ( this.playing ) setTimeout( this.update.bind(this), 250 );
		} else {
			this.stop();
			if ( this.stopfn ) this.stopfn();
		}
	}

	/**
	* Callback for animation end.
	* @callback stopcallbackfn
	*/

	/**
	* Play animation.
	* @param {stopcallbackfn} stopcallbackfn Animation stopped callback function
	*/
	play( stopcallbackfn = null ) {
		this.G.FG.enablePointerInteraction( false );
		this.stopfn = stopcallbackfn;
		this.playpos = 0;
		this.playing = true;
		this.update();
	}

	/**
	* Stop animation.
	*/
	stop() {
		this.playing = false;
		this.G.FG.enablePointerInteraction( true );
	}

	/**
	* Skip to the end of the animation.
	*/
	final() {
		this.stop();
		this.G.force(-1,10);
		this.tick( this.multiway.EV.length );
	}

	/**
	* Report status.
	* @return {Object} Status of the Multiway3D.
	*/
	status() {
		return { ...this.G.status(), events: this.pos+"/"+this.multiway.EV.length };
	}

}

export { Simulator };
