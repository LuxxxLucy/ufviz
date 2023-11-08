import { Graph3D } from "./graph3d/Graph3D.mjs";
import { SpriteText } from "./text/SpriteText.mjs";

/**
* @class User interface for Simulator
*
* Note: skeleton originally adopted from Mika Suominen Tuomas Sorakivi who implemented this for Hypergraph Rewrite
* https://github.com/met4citizen/Hypergraph)
*/
class Simulator {
	/**
	* Creates an instance of Simulator.
	* @param {Object} element DOM element of the canvas
	* @param {Object} status DOM element of the status
	* @constructor
	*/
	constructor(canvas,status) {
        this.EV = []; // graphs
		this.M = []; // LHS hits as maps
		this.reset();
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
	* Reset instance.
	* @param {Options} [opt=null]
	*/
	reset( opt = null ) {
		opt = opt || {};

		this.step = -1;
		this.M.length = 0;
		this.eventcnt = 0;
		this.opt = {
			evolution: 1,
			interactions: 5,
			timeslot: 250,
			maxsteps: Infinity,
			maxevents: Infinity,
			maxtokens: Infinity,
			noduplicates: false,
			pathcnts: true,
			bcoordinates: true,
			knn: 3,
			phasecutoff: 200,
			deduplicate: false,
			merge: true,
			wolfram: false,
			rulendx: false
		};
		Object.assign( this.opt, opt );
		if ( this.opt.maxevents === Infinity &&
				 this.opt.maxsteps === Infinity &&
			   this.opt.maxtokens === Infinity ) {
			// If no max limits set, use default limits
			this.opt.maxsteps = 50;
			this.opt.maxevents = (this.opt.evolution || 4) * 1000;
			this.opt.maxtokens = 20000;
		}

		this.timerid = null; // Timer
		this.rewritedelay = 50; // Timer delay in msec
		this.progressfn = null; // Callback for rewrite progress
		this.finishedfn = null; // Callback for rewrite finished

		this.progress = { // Real-time statistics about rewriting process
			progress: 0,
			step: "0",
			matches: "0",
			events: "0",
			post: ""
		};
		this.interrupt = false; // If true, user stopped the rewriting process
	}

	/**
	* Rewrite.
	* @generator
	*/
	*prepare_computation() {

		let start = Date.now();
		do {
			// New step
			this.step++;
			this.progress.step = "" + this.step;
			this.progress.matches = "" + 0;

		    let t0 = {
		    	id: 0,
		    	parent: [],
		    	child: [],
                edge: []
		    };
		    let t1 = {
		    	id: 1,
		    	parent: [],
		    	child: [],
                edge: [0,1,2]
		    };
		    let t2 = {
		    	id: 1,
		    	parent: [],
		    	child: [],
                edge: []
		    };
            t0.child.push(t1);
            t1.parent.push(t0);
            t1.child.push(t2);
            t2.parent.push(t1);
            // this.multiway.EV.push(t0);
            this.EV.push(t0);
			yield;

			start = Date.now();
			this.progress.matches = "" + this.M.length;
			this.progress.events = "" + this.eventcnt;
		} while(
			!this.interrupt &&
			(this.step < this.opt.maxsteps) &&
			(this.eventcnt < this.opt.maxevents)
		);
	}

	/**
	* Timer.
	* @param {Object} g Generator for rewrite
	*/
	timer(g) {
		if ( g.next().done ) {
			this.interrupt = false;
			if ( this.finishedfn ) {
				this.finishedfn();
			}
		} else {
			if ( this.progressfn ) {
				this.progress.progress = this.progress.step / this.opt.maxsteps;
				this.progressfn( this.progress );
			}
			this.timerid = setTimeout( this.timer.bind(this), this.rewritedelay, g );
		}
	}

	/**
	* Run abstract rewriting rules.
	* @param {Rules} rulestr Rewriting rules as a string
	* @param {Options} opt
	* @param {progressfn} [progressfn=null] Progress update callback function
	* @param {finishedfn} [finishedfn=null] Rewriting finished callback function
	*/
	run( rulestr, opt, progressfn = null, finishedfn = null ) {

		// Set parameters
		this.reset( opt );
		// this.rulial.setRule( rulestr );
		this.progressfn = progressfn;
		this.finishedfn = finishedfn;

		// Start rewriting process; timeout if either of the callback fns set
		let g = this.prepare_computation();
		if ( this.progressfn || this.finishedfn ) {
			this.timerid = setTimeout( this.timer.bind(this), this.rewritedelay, g );
		} else {
			while ( !g.next().done );
		}
	}

	/**
	* Cancel rewriting process.
	*/
	cancel() {
		this.progress.user = "Stopping...";
		this.interrupt = true;
	}

	/**
	* Report status.
	*/
	status() {
		return { ..."rewriter good" };
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
		return "validate rule okay";
	}

	/**
	* Set observer's reference frame
	* @param {RefFrame} rf
	*/
	setRefFrame( rf ) {
		if ( rf.hasOwnProperty("view") ) {
			let initlen = 1;
			this.observer.view = 1;

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
				this.processSpatialEvent( this.EV[ i ] );
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

		return change;
	}

	/**
	* Process events.
	* @param {number} [steps=1] Number of steps to process
	* @param {boolean} [reverse=false] If true, reverse the process of add and remove nodes
	* @return {boolean} True there are more events to process.
	*/
	tick( steps = 1, reverse = false ) {
		while ( steps > 0 && (( reverse && this.pos > 0) || ( !reverse && this.pos < this.EV.length))) {
			let ev = reverse ? this.EV[ this.pos - 1 ] : this.EV[ this.pos ];
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

		return reverse ? (this.pos > 1) : (this.pos < this.EV.length);
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
		// this.tick( this.multiway.EV.length );
		this.tick( this.EV.length );
	}

	/**
	* Report status.
	* @return {Object} Status of the Multiway3D.
	*/
	status() {
		return { ...this.G.status(), events: this.pos+"/"+this.EV.length };
	}

}

export { Simulator };
