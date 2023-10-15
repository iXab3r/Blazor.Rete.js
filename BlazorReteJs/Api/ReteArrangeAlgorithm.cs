using System.ComponentModel;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

[JsonConverter(typeof(JsonStringEnumMemberConverter))] 
public enum ReteArrangeAlgorithm
{
    /// <summary>
    /// https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html
    /// Layer-based algorithm provided by the Eclipse Layout Kernel. Arranges as many edges as possible into one direction by placing nodes into subsequent layers.
    /// This implementation supports different routing styles (straight, orthogonal, splines);
    /// if orthogonal routing is selected, arbitrary port constraints are respected, thus enabling the layout of block diagrams such as actor-oriented models or circuit schematics.
    /// Furthermore, full layout of compound graphs with cross-hierarchy edges is supported when the respective option is activated on the top level.
    /// The layer-based method was introduced by Sugiyama, Tagawa and Toda in 1981.
    /// It emphasizes the direction of edges by pointing as many edges as possible into the same direction.
    /// The nodes are arranged in layers, which are sometimes called “hierarchies”,
    /// and then reordered such that the number of edge crossings is minimized. Afterwards, concrete coordinates are computed for the nodes and edge bend points.
    /// </summary>
    [EnumMember(Value = "layered")]
    Layered,
    
    /// <summary>
    /// https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-box.html
    /// Algorithm for packing of unconnected boxes, i.e. graphs without edges.
    /// </summary>
    [EnumMember(Value = "box")]
    Box,
    
    /// <summary>
    /// https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-force.html
    /// Force-based algorithm provided by the Eclipse Layout Kernel.
    /// Implements methods that follow physical analogies by simulating forces that move the nodes into a balanced distribution.
    /// Currently the original Eades model and the Fruchterman - Reingold model are supported.
    /// Layout algorithms that follow physical analogies by simulating a system of attractive and repulsive forces.
    /// The first successful method of this kind was proposed by Eades in 1984.
    /// </summary>
    [EnumMember(Value = "force")]
    Force,
    
    /// <summary>
    /// https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-mrtree.html
    /// Tree-based algorithm provided by the Eclipse Layout Kernel.
    /// Computes a spanning tree of the input graph and arranges all nodes according to the resulting parent-children hierarchy.
    /// I pity the fool who doesn’t use Mr. Tree Layout.
    /// Specialized layout methods for trees, i.e. acyclic graphs.
    /// The regular structure of graphs that have no undirected cycles can be emphasized using an algorithm of this type.
    /// </summary>
    [EnumMember(Value = "mrtree")]
    MrTree,
    
    /// <summary>
    /// https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-radial.html
    /// A radial layout provider which is based on the algorithm of Peter Eades published in “Drawing free trees.”, published by International Institute for Advanced Study of Social Information Science, Fujitsu Limited in 1991.
    /// The radial layouter takes a tree and places the nodes in radial order around the root.
    /// The nodes of the same tree level are placed on the same radius.
    /// Radial layout algorithms usually position the nodes of the graph on concentric circles.
    /// </summary>
    [EnumMember(Value = "radial")]
    Radial,
    
    /// <summary>
    /// https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-random.html
    /// Distributes the nodes randomly on the plane, leading to very obfuscating layouts. Can be useful to demonstrate the power of “real” layout algorithms.
    /// </summary>
    [EnumMember(Value = "random")]
    Random,
    
    /// <summary>
    /// https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-rectpacking.html
    /// Algorithm for packing of unconnected boxes, i.e. graphs without edges.
    /// The given order of the boxes is always preserved and the main reading direction of the boxes is left to right.
    /// The algorithm is divided into two phases. One phase approximates the width in which the rectangles can be placed.
    /// The next phase places the rectangles in rows using the previously calculated width as bounding width and bundles rectangles with a similar height in blocks.
    /// A compaction step reduces the size of the drawing. Finally, the rectangles are expanded to fill their bounding box and eliminate empty unused spaces.
    /// </summary>
    [EnumMember(Value = "rectpacking")]
    RectanglePacking,
    
    /// <summary>
    /// https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-stress.html
    /// Minimizes the stress within a layout using stress majorization.
    /// Stress exists if the euclidean distance between a pair of nodes doesn’t match their graph theoretic distance, that is, the shortest path between the two nodes.
    /// The method allows to specify individual edge lengths.
    /// Layout algorithms that follow physical analogies by simulating a system of attractive and repulsive forces. The first successful method of this kind was proposed by Eades in 1984.
    /// </summary>
    [EnumMember(Value = "stress")]
    Stress,
}