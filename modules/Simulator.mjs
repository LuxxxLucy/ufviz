
/**
* @class UnionFind
*/
class UnionFind {
    constructor() {
        this.parents = {};
    }

    find(node) {
        if (!this.parents[node]) {
            this.parents[node] = node;
            return node;
        }

        if (this.parents[node] === node) {
            return node;
        }

        return this.find(this.parents[node]);
    }

    get_depth(node) {
        if (!this.parents[node] || this.parents[node] === node) {
            return 0;
        }
        return this.get_depth(this.parents[node]) + 1;
    }

    union(node1, node2) {
        const root1 = this.find(node1);
        const root2 = this.find(node2);

        if (root1 !== root2) {
            this.parents[root2] = root1;
        }
    }

    getGraph() {
        const edges = [];
        const vertices = new Set();

        for (const [node_str, parent] of Object.entries(this.parents)) {
            let node = parseInt(node_str)
            vertices.add(node);
            if (node !== parent) {
                edges.push([node, parent]);
            }
        }

        return { vertices: Array.from(vertices), edges , uf: this};
    }
}

function processUnionFindInput(input) {
    const pairRegex = /\((\d+),(\d+)\)/g;
    let match;
    let pairs = [];

    while ((match = pairRegex.exec(input)) !== null) {
        const node1 = parseInt(match[1], 10);
        const node2 = parseInt(match[2], 10);

        // Validate the pair
        if (isNaN(node1) || isNaN(node2)) {
            return 'Error: Invalid input';
        }

        // Add to pairs list
        pairs.push([node1, node2]);
    }

    if (pairs.length === 0) {
        return 'Error: No valid pairs found';
    }

    return pairs;
}

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
		this.reset();

        this.AnimateGraph =
                ForceGraph3D()
                (document.getElementById('3d-graph'))
                // .backgroundColor('white')
                .numDimensions( 2 )
                .showNavInfo( false )
                .enablePointerInteraction( true )
                .dagMode('bu') // bottom-up
                .dagLevelDistance(30)

                .linkDirectionalArrowLength(10.5)
                .linkDirectionalArrowRelPos(1)
                .linkCurvature(0.25)
                .linkWidth(3)
                .linkColor("grey")
                .linkCurvature('curvature')
                .linkCurveRotation('rotation')
                .linkDirectionalParticles(2)
                .linkDirectionalParticleWidth(0.8)
                .linkDirectionalParticleSpeed(0.006)

                .nodeOpacity(1)
                .nodeThreeObject(node => {
                    const sprite = new SpriteText(node.id);
                    sprite.material.depthWrite = false; // make sprite background transparent
                    sprite.color = "white";
                    sprite.textHeight = 8;
                    return sprite;
                })
                .graphData({nodes: [], links: []})

		this.dom = status; // DOM element for status

        this.pos = 0; // Event log position
		this.playpos = 0; // Play position
		this.playing = false; // Is play on?
		this.stopfn = null; // stop callback function

		this.H = new Map(); // Highlights
		this.F = null; // Fields

		// Variables x and y
		this.x = 0;
		this.y = 0;
	}

	/**
	* Reset instance.
	* @param {Options} [opt=null]
	*/
	reset( opt = null ) {
		opt = opt || {};

		this.step = -1;
		this.eventcnt = 0;
		this.opt = {
			maxsteps: Infinity,
		};
		Object.assign( this.opt, opt );
		if (this.opt.maxsteps === Infinity) {
			// If no max limits set, use default limits
			this.opt.maxsteps = 1000;
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

            const uf = new UnionFind();

            const input = "(1,2), (1,3), (4,3), (5,4)";
            const pairs = processUnionFindInput(input);

            const numberOfStep = this.step;
            
            if (Array.isArray(pairs)) {
                // Iterate only over the first 'numberOfStep' pairs
                for (let i = 0; i < Math.min(numberOfStep, pairs.length); i++) {
                    uf.union(pairs[i][0], pairs[i][1]);
                }
            } else {
                console.error(pairs); // Log error message if the input is invalid
            }
    
            const graph = uf.getGraph();
            this.EV.push(graph);
			yield;

			start = Date.now();
			this.progress.events = "" + this.eventcnt;
		} while(
			!this.interrupt &&
			(this.step < this.opt.maxsteps)
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
	* @param {RefFrame} rf
	*/
	setRefFrame( rf ) {
		let initlen = 1;

		// Stop animation and set position to start
		this.stop();
		this.pos = 0;
		this.playpos = 0;

		// Reset step
		this.step=0;

		// First additions
		this.tick( initlen );
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
	}

	/**
	* Show of hide edges in spatial graph.
	* @param {Object} ev Event reference
	* @param {boolean} [reverse=false] If true, reverse the process of add and remove nodes
	* @return {boolean} True, if some was made
	*/
	processSpatialEvent( ev, reverse = false ) {
        let gData =
            {
            nodes: ev.vertices.map(i => ({ id: i }))
            ,
            links: ev.edges.map(
                (a,b) => ({
                    source: a[0],
                    target: a[1],
                    target_node: {
                        ID: a[1],
                        level: ev.uf.get_depth(a[1])
                    }
                })
            )
        };
        let change = true;
        this.AnimateGraph
                .graphData(gData)
        ;
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
	}

	/**
	* Skip to the end of the animation.
	*/
	final() {
		this.stop();
		this.tick( this.EV.length );
	}

	/**
	* Report status.
	* @return {Object} Status of the Multiway3D.
	*/
	status() {
		return {
            nodes:  this.EV[ this.pos-1].vertices.length,
            edges:  this.EV[ this.pos-1].edges.length,
            events: this.pos+"/"+this.EV.length
        };
	}
}

export { Simulator };
