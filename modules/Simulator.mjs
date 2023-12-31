
function edge_equal(e1, e2) {
    if (
        ( e1[0] === e2[0] && e1[1] === e2[1])
        ||
        ( e1[1] === e2[0] && e1[0] === e2[1])
    ) {
        return true;
    } else {
        return false
    }
}

function edges_contain(edge_list, e) {
    let find = false;
    for (let i = 0; i < edge_list.length; i++) {
        let e_ = edge_list[i];
        if (edge_equal(e_, e)) {
            find = true;
        }
    }
    return find;
}

/**
 * @class UnionFind
 */
class UnionFind {
    constructor() {
        this.parents = {};
        this.parents_link_info = {}

        this.union_sequence = []; // a list of all union operations
        this.union_ids = {};
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

    get_parent(node) {
        return this.parents[node];
    }

    get_path_to_node(node, node_target) {
        let ret = [];

        let t = node;
        while (t!=node_target) {
            let parent = this.parents[t];
            ret.push([t, parent]);
            t = parent;
        }

        return ret;
    }

    get_path_to_root(node) {
        let root = this.find(node);
        return this.get_path_to_node(node, root);
    }

    get_first_common_ancestor(node1, node2) {
        let node1_to_root_path = this.get_path_to_root(node1);
        let node2_to_root_path = this.get_path_to_root(node2);
        
        let n1_idx = node1_to_root_path.length - 1;
        let n2_idx = node2_to_root_path.length - 1;
        while (
            n1_idx >= 0 && n2_idx >= 0 &&
            edge_equal(node1_to_root_path[n1_idx], node2_to_root_path[n2_idx])
        ) {
            n1_idx --;
            n2_idx --;
        }

        if (n1_idx >= 0) {
            return node1_to_root_path[n1_idx][1];
        } else {
            return node2_to_root_path[n2_idx][1];
        }
    }

    union(node1, node2) {
        const root1 = this.find(node1);
        const root2 = this.find(node2);

        this.union_sequence.push([node1, node2])

        if (root1 !== root2) {
            this.parents[root1] = root2;
            this.parents_link_info[root1] = {
                    union_pair_1: node1,
                    union_pair_2: node2
            };
            this.union_ids[root1] = this.union_sequence.length - 1;
        }

    }

    explain_with_logs(node1, node2) {
        /* explain but with the intermediate steps as logs
         * really not good-looking code...
         */
        this.logs = []
        return [this.explain(node1, node2), this.logs]
    }

    explain(node1, node2) {
        let result = [];

        let first_common_ancestor = this.get_first_common_ancestor(node1, node2);
        let node1_to_common_ancestor_path = this.get_path_to_node(node1, first_common_ancestor);
        let node2_to_common_ancestor_path = this.get_path_to_node(node2, first_common_ancestor);
        let path = node1_to_common_ancestor_path.concat(node2_to_common_ancestor_path.reverse());

        let newest_union_idx = 0;
        let this_edge = [];
        for (let i = 0; i < path.length; i++) {
            let idx = this.union_ids[path[i][0]];
            if (idx > newest_union_idx) {
                newest_union_idx = idx
                this_edge = path[i];
            }
        }

        let exp = this.union_sequence[newest_union_idx];
        let node1_t = exp[0];
        let node2_t = exp[1];

        this.logs.push({
            path_s2t: path,
            selected_edge: this_edge
        });

        if (edge_equal([node1_t, node2_t], [node1, node2])) {
            return [node1, node2];
        } else {
            // run two recursive call
            // join the explanations
            let node1_explanation = [];
            let node2_explanation = [];
            let this_exp = [];
            if (edges_contain(node2_to_common_ancestor_path, this_edge)) {
                node1_explanation = this.explain(node1, node2_t);
                node2_explanation = this.explain(node1_t, node2);
                this_exp = [node2_t, node1_t];
            } else if (edges_contain(node1_to_common_ancestor_path, this_edge)) {
                node1_explanation = this.explain(node1, node1_t);
                node2_explanation = this.explain(node2_t, node2);
                this_exp = [node1_t, node2_t];
            } else {
                console.log("unexpected: does not exist in the path of 1 or 2 to root");
            }

            result = result.concat(node1_explanation, this_exp, node2_explanation);
        }

        return result;
    }

    getGraph() {
        const edges = [];
        const vertices = new Set();

        for (const [node_str, parent] of Object.entries(this.parents)) {
            let node = parseInt(node_str)
            vertices.add(node);
            if (node !== parent) {
                let info = this.parents_link_info[node];
                edges.push([node, parent, info.union_pair_1, info.union_pair_2, "grey"]);
            }
        }

        return {
            vertices: Array.from(vertices),
            edges,
            uf: this
        };
    }
}

class TweakUnionFind extends UnionFind {

    union(node1, node2) {
        const root1 = this.find(node1);
        const root2 = this.find(node2);

        this.union_sequence.push([node1, node2])

        if (root1 !== root2) {

            // reverse the edges from node1 to root1
            let tmp_node = node1;
            let tmp_node_parent = this.parents[tmp_node];

            while (tmp_node_parent !== tmp_node) {
                let parent_of_parent = this.parents[tmp_node_parent];
                this.parents[tmp_node_parent] = tmp_node;
                this.parents_link_info[tmp_node_parent] = this.parents_link_info[tmp_node];
                tmp_node = tmp_node_parent;
                tmp_node_parent = parent_of_parent
            }

            this.parents[node1] = node2;
            this.parents_link_info[node1] = {
                    union_pair_1: node1,
                    union_pair_2: node2
            };
            this.union_ids[root1] = this.union_sequence.length - 1;

        }
    }

    explain(node1, node2) {
        let result = [];

        let first_common_ancestor = this.get_first_common_ancestor(node1, node2);
        let node1_to_common_ancestor_path = this.get_path_to_node(node1, first_common_ancestor);
        let node2_to_common_ancestor_path = this.get_path_to_node(node2, first_common_ancestor);
        let path = node1_to_common_ancestor_path.concat(node2_to_common_ancestor_path.reverse());

        this.logs.push({
            path_s2t: path,
        });
        return path;
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
    constructor(canvas, status) {
        this.reset();

        this.AnimateGraph =
            ForceGraph3D()
            (document.getElementById('3d-graph'))
            .numDimensions(2)
            .showNavInfo(false)
            .enablePointerInteraction(true)
            .dagMode('bu') // bottom-up
            .cooldownTime(5000)
            .dagLevelDistance(30)

            .backgroundColor('white')

            .linkDirectionalArrowLength(3)
            .linkDirectionalArrowRelPos(1)
            .linkCurvature(0)
            .linkCurveRotation(0)
            .linkWidth(3)
            .linkOpacity(0.6)
            .linkDirectionalParticles(2)
            .linkDirectionalParticleWidth(0.8)
            .linkDirectionalParticleSpeed(0.006)

            .linkThreeObjectExtend(true)
            .linkThreeObject(link => {
                // add text for the link information
                const sprite = new SpriteText(`(${link.union_pair_1} == ${link.union_pair_2})`);
                sprite.textHeight = 2;

                sprite.color = 'orange';
                sprite.backgroundColor = 'rgba(0,0,190,0.6)';
                sprite.borderColor = 'lightgrey';
                sprite.borderWidth = 0.5;
                sprite.borderRadius = 3;
                sprite.padding = [6, 2];
                sprite.position.x = 45;
                sprite.position.y = 15;

                return sprite;
            })
            .linkPositionUpdate((sprite, { start, end }) => {
                // Position sprite
                const middlePos = Object.assign(...['x', 'y', 'z'].map(c => ({
                  [c]: start[c] + (end[c] - start[c]) / 2 // calc middle point
                })));
                middlePos.z = 8;
                Object.assign(sprite.position, middlePos);
            })

            .nodeOpacity(1)
            .nodeThreeObject(node => {
                const sprite = new SpriteText(node.id);
                sprite.material.depthWrite = true;
                sprite.color = "blue";
                sprite.textHeight = 5;

                sprite.backgroundColor = 'orange';
                sprite.borderColor = 'lightgrey';
                sprite.borderWidth = 0.5;
                sprite.borderRadius = 3;
                sprite.padding = [6, 2];
                sprite.position.z = 8;
                return sprite;
            })
            .nodeVal(4)
            .nodeRelSize(3)

            .forceEngine("d3");

        this.AnimateGraph.d3Force('link').iterations(2);
        this.AnimateGraph.d3Force('link').distance(20);
        this.AnimateGraph.d3Force('center').strength(0.1);
        this.AnimateGraph.d3Force('charge').strength(-200);
        this.AnimateGraph.d3Force('charge').distanceMin(50);
        this.AnimateGraph.d3VelocityDecay(0.8);
        this.AnimateGraph.graphData({
                nodes: [],
                links: []
            });


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
    reset(opt = null) {
        opt = opt || {};

        this.EV = []; // graphs
        this.step = 0;
        this.eventcnt = 0;
        this.opt = {
            maxsteps: Infinity,
        };
        Object.assign(this.opt, opt);
        if (this.opt.maxsteps === Infinity) {
            // If no max limits set, use default limits
            this.opt.maxsteps = 1000;
        }
        this.mode = parseInt(this.opt.mode);

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
    * prepare_computation() {


        const input = "(1,8), (7,2), (3,13), (7,1), (6,7), (9,5),(9,3),(14,11),(10,4),(12,9),(4,11),(10,7)";
        const pairs = processUnionFindInput(input);

        let start = Date.now();
        this.step = 0;

        this.build_steps = pairs.length;

        do {
            // New step
            this.step++;
            this.progress.step = "" + this.step;
            this.progress.matches = "" + 0;

            let uf = [];
            if (this.mode === 1) {
                uf = new UnionFind();
            } else {
                uf = new TweakUnionFind();
            }

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
        } while (
            !this.interrupt &&
            (this.step < this.build_steps)
        );

        if (this.step >= this.build_steps) {
            let uf = [];
            if (this.mode === 1) {
                uf = new UnionFind();
            } else {
                uf = new TweakUnionFind();
            }

            const numberOfStep = this.build_steps;

            if (Array.isArray(pairs)) {
                // Iterate only over the first 'numberOfStep' pairs
                for (let i = 0; i < Math.min(numberOfStep, pairs.length); i++) {
                    uf.union(pairs[i][0], pairs[i][1]);
                }
            } else {
                console.error(pairs); // Log error message if the input is invalid
            }

            let [explanations, ret_logs] = uf.explain_with_logs(1,4);

            // run explain, and get the edge out.
            // annotate the edge with color. and create a new copy of the graph
            // where is the original graph plus with new highlighted color edges.
            let already_selected_edges = [];
            for (let i = 0 ; i < ret_logs.length ; i++) {
                let log = ret_logs[i];

                {
                    let graph = uf.getGraph();
                    let path = log["path_s2t"];

                    for ( const [s,t] of path) {
                        let info = uf.parents_link_info[s];
                        let e = [s, t, info.union_pair_1, info.union_pair_2, "blue"];
                        graph.edges.push(e)
                    }

                    for ( const e of already_selected_edges) {
                        graph.edges.push(e)
                    }

                    this.EV.push(graph);
                }

                if ('selected_edge' in log) {
                    let selected_edge = log["selected_edge"];
                    let [s,t] = selected_edge;
                    let info = uf.parents_link_info[s];
                    let e = [s, t, info.union_pair_1, info.union_pair_2, "yellow"];
                    already_selected_edges.push(e)

                    let graph = uf.getGraph();
                    for ( const e of already_selected_edges) {
                        graph.edges.push(e)
                    }
                    this.EV.push(graph);
                }
                
            }
        }
    }

    /**
     * Timer.
     * @param {Object} g Generator for rewrite
     */
    timer(g) {
        if (g.next().done) {
            this.interrupt = false;
            if (this.finishedfn) {
                this.finishedfn();
            }
        } else {
            if (this.progressfn) {
                this.progress.progress = this.progress.step / this.build_steps;
                this.progressfn(this.progress);
            }
            this.timerid = setTimeout(this.timer.bind(this), this.rewritedelay, g);
        }
    }

    /**
     * Run abstract rewriting rules.
     * @param {Rules} rulestr Rewriting rules as a string
     * @param {Options} opt
     * @param {progressfn} [progressfn=null] Progress update callback function
     * @param {finishedfn} [finishedfn=null] Rewriting finished callback function
     */
    run(rulestr, opt, progressfn = null, finishedfn = null) {

        // Set parameters
        this.reset(opt);
        this.progressfn = progressfn;
        this.finishedfn = finishedfn;

        // Start rewriting process; timeout if either of the callback fns set
        let g = this.prepare_computation();
        if (this.progressfn || this.finishedfn) {
            this.timerid = setTimeout(this.timer.bind(this), this.rewritedelay, g);
        } else {
            while (!g.next().done);
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
        return {
            ..."rewriter good"
        };
    }

    /**
     * Display x and/or y.
     * @param {Object} n Node object
     */
    static nodeThreeObject(n) {
        if (n.id === this.x) {
            if (n.id === this.y) {
                n.big = true;
                return new SpriteText("x=y", 26, "DarkSlateGray");
            } else {
                n.big = true;
                return new SpriteText("x", 26, "DarkSlateGray");
            }
        } else if (n.id === this.y) {
            n.big = true;
            return new SpriteText("y", 26, "DarkSlateGray");
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
    validateRule(rulestr) {
        return "validate rule okay";
    }

    /**
     * @param {RefFrame} rf
     */
    setRefFrame(rf) {
        let initlen = 0;


        // Stop animation and set position to start
        this.stop();
        this.pos = 0;
        this.playpos = 0;
        this.AnimateGraph.graphData({
                nodes: [],
                links: []
            });

        // Reset step
        this.step = 0;

        // First additions
        this.tick(initlen);
    }

    /**
     * Refresh UI.
     */
    refresh() {
        if (this.dom) {
            let s = this.status();
            let str = "";
            Object.keys(s).forEach(k => {
                str += '<span class="label up">' + k + '</span><span class="label status">' + s[k] + '</span>';
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
    processSpatialEvent(ev, reverse = false) {
        let normal_edges = 
            ev.edges.map(
                (a, b) => ({
                    source: a[0],
                    target: a[1],
                    target_node: {
                        ID: a[1],
                        level: ev.uf.get_depth(a[1])
                    },
                    union_pair_1: a[2],
                    union_pair_2: a[3],
                    color: a[4],
                })
            );
        let gData = {
            nodes: ev.vertices.map(i => ({
                id: i
            })),
            links:  [ ...normal_edges ]
        };
        let change = true;
        let { nodes, links } = this.AnimateGraph.graphData();

        // remove nodes that no longer exist
        if (gData.nodes.length > 0) {
            for (let i = 0; i < nodes.length; i++) {
                let n = nodes[i];
                let find = false;
                for (const n_ of gData.nodes) {
                    if (n_.id === n.id) {
                        find = true;
                    }
                }
                if (!find) {
                    nodes.splice(i, 1);
                }
            }

            // add new nodes
            for (const n of gData.nodes) {
                let find = false;
                for (const n_ of nodes) {
                    if (n_.id === n.id) {
                        find = true;
                    }
                }
                if (!find) {
                    nodes.push(n);
                }
            }
        } else {
            nodes = [];
        }


        this.AnimateGraph
            .linkAutoColorBy(d => d.color)
            .graphData({nodes: nodes, links: gData.links});

        return change;
    }

    /**
     * Process events.
     * @param {number} [steps=1] Number of steps to process
     * @param {boolean} [reverse=false] If true, reverse the process of add and remove nodes
     * @return {boolean} True there are more events to process.
     */
    tick(steps = 1, reverse = false) {
        while (steps > 0 && ((reverse && this.pos > 0) || (!reverse && this.pos < this.EV.length))) {
            if (reverse) {
                this.pos--;
            } else {
                this.pos++;
            }

            let ev = this.pos === 0 ? {
                    vertices: [],
                    edges: [],
                    uf: []
                } :
                this.EV[this.pos - 1];


            let changed = false;
            changed = this.processSpatialEvent(ev, reverse);
            if (changed) {
                steps--;
                if (reverse) {
                    this.playpos = 0;
                } else {
                    this.playpos++;
                }
            }
        }
        this.refresh();

        return reverse ? (this.pos > 0) : (this.pos < this.EV.length);
    }

    /**
     * Timed update process.
     */
    update() {
        const steps = Math.min(15, Math.ceil((this.playpos + 1) / 10));
        if (this.tick(steps)) {
            if (this.playing) setTimeout(this.update.bind(this), 250);
        } else {
            this.stop();
            if (this.stopfn) this.stopfn();
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
    play(stopcallbackfn = null) {
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
        this.tick(this.EV.length);
    }

    /**
     * Report status.
     * @return {Object} Status of the Multiway3D.
     */
    status() {
        return {
            nodes: this.pos === 0 ? 0 : this.EV[this.pos - 1].vertices.length,
            edges: this.pos === 0 ? 0 : this.EV[this.pos - 1].edges.length,
            events: this.pos + "/" + this.EV.length
        };
    }
}

export {
    Simulator
};
