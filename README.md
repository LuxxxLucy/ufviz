# Explain

This repo implements and visualizes the $O(klog n)$ $k$-step proof producing algorithm *Explain* using a classical union find; and a $O(k)$ variant using a tweaked union find. (<Proof-producing Congruence Closure> Nieuwenhuis, R., & Oliveras, A. (2005, April) ).


## Notes on implementation

The implementation itself starts from  
the [hypergraph rewriting](https://met4citizen.github.io/Hypergraph/**
), which itself is using
[3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph)
for representing graph structures,
[ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering and
[d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the force engine.

