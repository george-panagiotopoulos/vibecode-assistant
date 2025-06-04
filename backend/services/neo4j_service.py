import os
import logging
from typing import Dict, List, Any, Optional
from neo4j import GraphDatabase, Driver
from neo4j.exceptions import ServiceUnavailable, AuthError
from datetime import datetime

logger = logging.getLogger(__name__)

class Neo4jService:
    """Service for managing Neo4j graph database operations"""
    
    def __init__(self):
        self.driver: Optional[Driver] = None
        self._connect()
    
    def _connect(self):
        """Establish connection to Neo4j database"""
        try:
            uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
            user = os.getenv('NEO4J_USERNAME', 'neo4j')
            password = os.getenv('NEO4J_PASSWORD', 'vibeassistant')
            
            self.driver = GraphDatabase.driver(uri, auth=(user, password))
            
            # Test connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            
            logger.info("✅ Neo4j connection established successfully")
            
        except (ServiceUnavailable, AuthError) as e:
            logger.error(f"❌ Failed to connect to Neo4j: {e}")
            self.driver = None
        except Exception as e:
            logger.error(f"❌ Unexpected error connecting to Neo4j: {e}")
            self.driver = None
    
    def is_connected(self) -> bool:
        """Check if Neo4j connection is active"""
        if not self.driver:
            return False
        
        try:
            with self.driver.session() as session:
                session.run("RETURN 1")
            return True
        except Exception:
            return False
    
    def close(self):
        """Close Neo4j connection"""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")
    
    def create_node(self, node_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new node in the graph"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                query = """
                MERGE (n:Node {id: $id})
                SET n.name = $name,
                    n.description = $description,
                    n.layer = $layer,
                    n.type = $type,
                    n.created_at = datetime(),
                    n.updated_at = datetime()
                RETURN n
                """
                
                result = session.run(query, {
                    'id': node_data['id'],
                    'name': node_data['name'],
                    'description': node_data.get('description', ''),
                    'layer': node_data.get('layer', ''),
                    'type': node_data.get('type', '')
                })
                
                record = result.single()
                if record:
                    node = record['n']
                    return {
                        'id': node['id'],
                        'name': node['name'],
                        'description': node['description'],
                        'layer': node['layer'],
                        'type': node['type']
                    }
                
                return node_data
                
        except Exception as e:
            logger.error(f"Error creating node: {e}")
            raise
    
    def create_edge(self, from_id: str, to_id: str, relationship_type: str = "LINKED_TO") -> Dict[str, Any]:
        """Create an edge between two nodes"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                query = f"""
                MATCH (a:Node {{id: $from_id}})
                MATCH (b:Node {{id: $to_id}})
                MERGE (a)-[r:{relationship_type}]->(b)
                SET r.created_at = datetime()
                RETURN a, r, b
                """
                
                result = session.run(query, {
                    'from_id': from_id,
                    'to_id': to_id
                })
                
                record = result.single()
                if record:
                    return {
                        'from_id': from_id,
                        'to_id': to_id,
                        'type': relationship_type,
                        'success': True
                    }
                
                return {
                    'from_id': from_id,
                    'to_id': to_id,
                    'type': relationship_type,
                    'success': False,
                    'error': 'Nodes not found'
                }
                
        except Exception as e:
            logger.error(f"Error creating edge: {e}")
            raise
    
    def get_all_nodes_and_edges(self) -> Dict[str, Any]:
        """Retrieve all nodes and their relationships"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                # Get all nodes
                nodes_query = """
                MATCH (n:Node)
                RETURN n.id as id, n.name as name, n.description as description, 
                       n.layer as layer, n.type as type
                ORDER BY n.layer, n.name
                """
                
                nodes_result = session.run(nodes_query)
                nodes = []
                for record in nodes_result:
                    nodes.append({
                        'id': record['id'],
                        'name': record['name'],
                        'description': record['description'],
                        'layer': record['layer'],
                        'type': record['type']
                    })
                
                # Get all relationships
                edges_query = """
                MATCH (a:Node)-[r]->(b:Node)
                RETURN a.id as from_id, b.id as to_id, type(r) as relationship_type
                """
                
                edges_result = session.run(edges_query)
                edges = []
                for record in edges_result:
                    edges.append({
                        'from_id': record['from_id'],
                        'to_id': record['to_id'],
                        'type': record['relationship_type']
                    })
                
                return {
                    'nodes': nodes,
                    'edges': edges
                }
                
        except Exception as e:
            logger.error(f"Error retrieving graph data: {e}")
            raise
    
    def delete_node(self, node_id: str) -> bool:
        """Delete a node and all its relationships"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                query = """
                MATCH (n:Node {id: $node_id})
                DETACH DELETE n
                RETURN count(n) as deleted_count
                """
                
                result = session.run(query, {'node_id': node_id})
                record = result.single()
                
                return record['deleted_count'] > 0 if record else False
                
        except Exception as e:
            logger.error(f"Error deleting node: {e}")
            raise
    
    def delete_edge(self, from_id: str, to_id: str, relationship_type: str = None) -> bool:
        """Delete an edge between two nodes"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                if relationship_type:
                    query = f"""
                    MATCH (a:Node {{id: $from_id}})-[r:{relationship_type}]->(b:Node {{id: $to_id}})
                    DELETE r
                    RETURN count(r) as deleted_count
                    """
                else:
                    query = """
                    MATCH (a:Node {id: $from_id})-[r]->(b:Node {id: $to_id})
                    DELETE r
                    RETURN count(r) as deleted_count
                    """
                
                result = session.run(query, {
                    'from_id': from_id,
                    'to_id': to_id
                })
                
                record = result.single()
                return record['deleted_count'] > 0 if record else False
                
        except Exception as e:
            logger.error(f"Error deleting edge: {e}")
            raise
    
    def delete_layer(self, layer_name: str) -> int:
        """Delete all nodes in a specific layer and the custom layer definition if it exists"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                # First, delete all nodes in the layer
                delete_nodes_query = """
                MATCH (n:Node {layer: $layer_name})
                DETACH DELETE n
                RETURN count(n) as deleted_count
                """
                
                result = session.run(delete_nodes_query, {'layer_name': layer_name})
                record = result.single()
                deleted_count = record['deleted_count'] if record else 0
                
                # Also delete the custom layer definition if it exists
                delete_custom_layer_query = """
                MATCH (l:CustomLayer {name: $layer_name})
                DELETE l
                RETURN count(l) as deleted_layer_count
                """
                
                layer_result = session.run(delete_custom_layer_query, {'layer_name': layer_name})
                layer_record = layer_result.single()
                deleted_layer_count = layer_record['deleted_layer_count'] if layer_record else 0
                
                if deleted_layer_count > 0:
                    logger.info(f"Deleted custom layer definition: '{layer_name}'")
                
                logger.info(f"Deleted {deleted_count} nodes from layer '{layer_name}'")
                return deleted_count
                
        except Exception as e:
            logger.error(f"Error deleting layer: {e}")
            raise
    
    def clear_all_data(self) -> bool:
        """Clear all nodes and relationships from the database (except saved graphs)"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                # Only delete nodes that are NOT SavedGraph, SavedNode, or SavedEdge
                query = """
                MATCH (n) 
                WHERE NOT n:SavedGraph AND NOT n:SavedNode AND NOT n:SavedEdge
                DETACH DELETE n
                """
                session.run(query)
                logger.info("All main graph data cleared (saved graphs preserved)")
                return True
                
        except Exception as e:
            logger.error(f"Error clearing graph data: {e}")
            raise
    
    def populate_sample_data(self) -> Dict[str, Any]:
        """Populate the graph with sample nodes and relationships"""
        sample_nodes = [
            {
                "id": "ux.usability",
                "name": "Usability",
                "description": "System should be intuitive and pleasant for the user.",
                "layer": "UX",
                "type": "NFR"
            },
            {
                "id": "infra.low_latency",
                "name": "Low Latency",
                "description": "System should respond in under 1 second.",
                "layer": "Infrastructure",
                "type": "NFR"
            },
            {
                "id": "infra.availability",
                "name": "Availability",
                "description": "System should ensure 99.99% uptime via redundancy.",
                "layer": "Infrastructure",
                "type": "NFR"
            },
            {
                "id": "security.trust",
                "name": "Security",
                "description": "No personal data compromise; secure interaction.",
                "layer": "Security",
                "type": "NFR"
            },
            {
                "id": "app.clean_structure",
                "name": "Clean Folder Structure",
                "description": "Code should follow consistent, modular structure.",
                "layer": "Application",
                "type": "Standard"
            },
            {
                "id": "app.code_efficiency",
                "name": "Code Efficiency",
                "description": "Small, fast functions that minimize CPU and memory.",
                "layer": "Application",
                "type": "Standard"
            },
            {
                "id": "app.reusability",
                "name": "Code Reusability",
                "description": "Components and functions should be reusable across modules.",
                "layer": "Application",
                "type": "Standard"
            },
            {
                "id": "app.secure_coding",
                "name": "Secure Coding Practices",
                "description": "Use static analysis, avoid injection, sanitize inputs, etc.",
                "layer": "Application",
                "type": "Standard"
            }
        ]
        
        # Sample relationships based on the linked_to data
        sample_edges = [
            ("ux.usability", "app.clean_structure", "SUPPORTS"),
            ("ux.usability", "infra.low_latency", "DEPENDS_ON"),
            ("ux.usability", "security.trust", "DEPENDS_ON"),
            ("infra.low_latency", "app.code_efficiency", "DEPENDS_ON"),
            ("infra.low_latency", "infra.availability", "LINKED_TO"),
            ("infra.availability", "infra.low_latency", "SUPPORTS"),
            ("security.trust", "app.secure_coding", "DEPENDS_ON"),
            ("app.clean_structure", "ux.usability", "SUPPORTS"),
            ("app.code_efficiency", "infra.low_latency", "SUPPORTS"),
            ("app.reusability", "app.clean_structure", "DEPENDS_ON"),
            ("app.secure_coding", "security.trust", "SUPPORTS")
        ]
        
        try:
            # Clear existing data first
            self.clear_all_data()
            
            # Create nodes
            created_nodes = []
            for node_data in sample_nodes:
                created_node = self.create_node(node_data)
                created_nodes.append(created_node)
            
            # Create edges
            created_edges = []
            for from_id, to_id, rel_type in sample_edges:
                edge = self.create_edge(from_id, to_id, rel_type)
                created_edges.append(edge)
            
            logger.info(f"Sample data populated: {len(created_nodes)} nodes, {len(created_edges)} edges")
            
            return {
                'nodes': created_nodes,
                'edges': created_edges,
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Error populating sample data: {e}")
            raise

    def save_graph(self, graph_name: str, graph_data: Dict[str, Any], graph_type: str = "nfr") -> bool:
        """Save current graph data with a name and type"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        # Validate graph_type parameter
        valid_types = ["nfr", "application_architecture"]
        if graph_type not in valid_types:
            raise ValueError(f"Invalid graph_type '{graph_type}'. Must be one of: {valid_types}")
        
        try:
            with self.driver.session() as session:
                # First, delete any existing saved nodes and edges with the same graph name
                delete_nodes_query = """
                MATCH (sn:SavedNode {graph_name: $graph_name})
                DELETE sn
                """
                session.run(delete_nodes_query, {'graph_name': graph_name})
                
                delete_edges_query = """
                MATCH (se:SavedEdge {graph_name: $graph_name})
                DELETE se
                """
                session.run(delete_edges_query, {'graph_name': graph_name})
                
                # Delete existing SavedGraph node if it exists
                delete_graph_query = """
                MATCH (sg:SavedGraph {name: $graph_name})
                DELETE sg
                """
                session.run(delete_graph_query, {'graph_name': graph_name})
                
                # Create a new saved graph node with graph_type
                create_graph_query = """
                CREATE (sg:SavedGraph {
                    name: $graph_name,
                    graph_type: $graph_type,
                    created_at: datetime(),
                    nodes_count: $nodes_count,
                    edges_count: $edges_count
                })
                RETURN sg
                """
                
                session.run(create_graph_query, {
                    'graph_name': graph_name,
                    'graph_type': graph_type,
                    'nodes_count': len(graph_data['nodes']),
                    'edges_count': len(graph_data['edges'])
                })
                
                # Save all nodes
                for node in graph_data['nodes']:
                    save_node_query = """
                    CREATE (sn:SavedNode {
                        graph_name: $graph_name,
                        id: $id,
                        name: $name,
                        description: $description,
                        layer: $layer,
                        type: $type
                    })
                    """
                    session.run(save_node_query, {
                        'graph_name': graph_name,
                        'id': node['id'],
                        'name': node['name'],
                        'description': node['description'],
                        'layer': node['layer'],
                        'type': node['type']
                    })
                
                # Save all edges
                for edge in graph_data['edges']:
                    save_edge_query = """
                    CREATE (se:SavedEdge {
                        graph_name: $graph_name,
                        from_id: $from_id,
                        to_id: $to_id,
                        type: $type
                    })
                    """
                    session.run(save_edge_query, {
                        'graph_name': graph_name,
                        'from_id': edge['from_id'],
                        'to_id': edge['to_id'],
                        'type': edge['type']
                    })
                
                logger.info(f"Graph '{graph_name}' saved successfully with type '{graph_type}'")
                return True
                
        except Exception as e:
            logger.error(f"Error saving graph '{graph_name}': {e}")
            raise

    def get_saved_graphs(self, graph_type: str = None) -> List[Dict[str, Any]]:
        """Get list of all saved graphs, optionally filtered by type"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                # Build query with optional graph_type filter
                if graph_type:
                    # Validate graph_type parameter
                    valid_types = ["nfr", "application_architecture"]
                    if graph_type not in valid_types:
                        raise ValueError(f"Invalid graph_type '{graph_type}'. Must be one of: {valid_types}")
                    
                    query = """
                    MATCH (sg:SavedGraph {graph_type: $graph_type})
                    RETURN sg.name as name, sg.graph_type as graph_type, sg.created_at as created_at, 
                           sg.nodes_count as nodes_count, sg.edges_count as edges_count
                    ORDER BY sg.created_at DESC
                    """
                    result = session.run(query, {'graph_type': graph_type})
                else:
                    query = """
                    MATCH (sg:SavedGraph)
                    RETURN sg.name as name, 
                           COALESCE(sg.graph_type, 'nfr') as graph_type,
                           sg.created_at as created_at, 
                           sg.nodes_count as nodes_count, sg.edges_count as edges_count
                    ORDER BY sg.created_at DESC
                    """
                    result = session.run(query)
                
                graphs = []
                for record in result:
                    graphs.append({
                        'name': record['name'],
                        'graph_type': record['graph_type'],
                        'created_at': record['created_at'].isoformat() if record['created_at'] else None,
                        'nodes_count': record['nodes_count'],
                        'edges_count': record['edges_count']
                    })
                
                return graphs
                
        except Exception as e:
            logger.error(f"Error getting saved graphs: {e}")
            raise

    def get_saved_graph_data(self, graph_name: str) -> Dict[str, Any]:
        """Get saved graph data without loading it into the main graph"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                # Check if the saved graph exists
                check_query = """
                MATCH (sg:SavedGraph {name: $graph_name})
                RETURN count(sg) as count
                """
                result = session.run(check_query, {'graph_name': graph_name})
                if result.single()['count'] == 0:
                    return None
                
                # Get saved nodes
                nodes_query = """
                MATCH (sn:SavedNode {graph_name: $graph_name})
                RETURN sn.id as id, sn.name as name, sn.description as description,
                       sn.layer as layer, sn.type as type
                """
                
                nodes_result = session.run(nodes_query, {'graph_name': graph_name})
                nodes = []
                for record in nodes_result:
                    nodes.append({
                        'id': record['id'],
                        'name': record['name'],
                        'description': record['description'],
                        'layer': record['layer'],
                        'type': record['type']
                    })
                
                # Get saved edges
                edges_query = """
                MATCH (se:SavedEdge {graph_name: $graph_name})
                RETURN se.from_id as from_id, se.to_id as to_id, se.type as type
                """
                
                edges_result = session.run(edges_query, {'graph_name': graph_name})
                edges = []
                for record in edges_result:
                    edges.append({
                        'from_id': record['from_id'],
                        'to_id': record['to_id'],
                        'type': record['type']
                    })
                
                return {
                    'nodes': nodes,
                    'edges': edges
                }
                
        except Exception as e:
            logger.error(f"Error getting saved graph data '{graph_name}': {e}")
            raise

    def load_graph(self, graph_name: str) -> bool:
        """Load a saved graph by name"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                # Check if the saved graph exists
                check_query = """
                MATCH (sg:SavedGraph {name: $graph_name})
                RETURN count(sg) as count
                """
                result = session.run(check_query, {'graph_name': graph_name})
                if result.single()['count'] == 0:
                    return False
                
                # Load saved nodes
                nodes_query = """
                MATCH (sn:SavedNode {graph_name: $graph_name})
                RETURN sn.id as id, sn.name as name, sn.description as description,
                       sn.layer as layer, sn.type as type
                """
                
                nodes_result = session.run(nodes_query, {'graph_name': graph_name})
                for record in nodes_result:
                    # Create the actual node
                    create_node_query = """
                    MERGE (n:Node {id: $id})
                    SET n.name = $name,
                        n.description = $description,
                        n.layer = $layer,
                        n.type = $type,
                        n.created_at = datetime(),
                        n.updated_at = datetime()
                    """
                    session.run(create_node_query, {
                        'id': record['id'],
                        'name': record['name'],
                        'description': record['description'],
                        'layer': record['layer'],
                        'type': record['type']
                    })
                
                # Load saved edges
                edges_query = """
                MATCH (se:SavedEdge {graph_name: $graph_name})
                RETURN se.from_id as from_id, se.to_id as to_id, se.type as type
                """
                
                edges_result = session.run(edges_query, {'graph_name': graph_name})
                for record in edges_result:
                    # Create the actual edge
                    create_edge_query = f"""
                    MATCH (a:Node {{id: $from_id}})
                    MATCH (b:Node {{id: $to_id}})
                    MERGE (a)-[r:{record['type']}]->(b)
                    SET r.created_at = datetime()
                    """
                    session.run(create_edge_query, {
                        'from_id': record['from_id'],
                        'to_id': record['to_id']
                    })
                
                logger.info(f"Graph '{graph_name}' loaded successfully")
                return True
                
        except Exception as e:
            logger.error(f"Error loading graph '{graph_name}': {e}")
            raise

    def delete_saved_graph(self, graph_name: str) -> bool:
        """Delete a saved graph by name"""
        try:
            with self.driver.session() as session:
                # Check if graph exists
                result = session.run(
                    "MATCH (g:SavedGraph {name: $name}) RETURN g",
                    name=graph_name
                )
                
                if not result.single():
                    return False
                
                # Delete the saved graph and all its data
                session.run(
                    """
                    MATCH (g:SavedGraph {name: $name})
                    OPTIONAL MATCH (g)-[:CONTAINS_NODE]->(n:SavedNode)
                    OPTIONAL MATCH (g)-[:CONTAINS_EDGE]->(e:SavedEdge)
                    DETACH DELETE g, n, e
                    """,
                    name=graph_name
                )
                
                logger.info(f"✅ Deleted saved graph: {graph_name}")
                return True
                
        except Exception as e:
            logger.error(f"❌ Error deleting saved graph {graph_name}: {e}")
            return False

    def get_custom_layers(self) -> List[str]:
        """Get all custom layers that have been created"""
        try:
            with self.driver.session() as session:
                result = session.run(
                    "MATCH (l:CustomLayer) RETURN l.name as name ORDER BY l.name"
                )
                
                layers = [record["name"] for record in result]
                logger.info(f"✅ Retrieved {len(layers)} custom layers")
                return layers
                
        except Exception as e:
            logger.error(f"❌ Error getting custom layers: {e}")
            return []

    def get_all_layers(self) -> List[str]:
        """Get all layers (both custom and from existing nodes)"""
        try:
            # Get custom layers
            custom_layers = self.get_custom_layers()
            
            # Get layers from existing nodes
            with self.driver.session() as session:
                result = session.run(
                    "MATCH (n:Node) WHERE n.layer IS NOT NULL RETURN DISTINCT n.layer as layer ORDER BY layer"
                )
                
                node_layers = [record["layer"] for record in result]
            
            # Combine all layers and remove duplicates
            all_layers = list(set(custom_layers + node_layers))
            all_layers.sort()
            
            logger.info(f"✅ Retrieved {len(all_layers)} total layers")
            return all_layers
                
        except Exception as e:
            logger.error(f"❌ Error getting all layers: {e}")
            return []

    def create_custom_layer(self, layer_name: str, description: str = "") -> Dict[str, Any]:
        """Create a new custom layer"""
        try:
            with self.driver.session() as session:
                # Check if layer already exists
                existing_result = session.run(
                    "MATCH (l:CustomLayer {name: $name}) RETURN l",
                    name=layer_name
                )
                
                if existing_result.single():
                    raise ValueError(f"Layer '{layer_name}' already exists")
                
                # Create the custom layer
                result = session.run(
                    """
                    CREATE (l:CustomLayer {
                        name: $name,
                        description: $description,
                        created_at: datetime()
                    })
                    RETURN l
                    """,
                    name=layer_name,
                    description=description
                )
                
                record = result.single()
                if record:
                    layer_node = record["l"]
                    created_layer = {
                        "name": layer_node["name"],
                        "description": layer_node["description"],
                        "created_at": layer_node["created_at"].isoformat() if layer_node["created_at"] else None
                    }
                    
                    logger.info(f"✅ Created custom layer: {layer_name}")
                    return created_layer
                else:
                    raise Exception("Failed to create custom layer")
                
        except Exception as e:
            logger.error(f"❌ Error creating custom layer {layer_name}: {e}")
            raise

    def update_node(self, node_id: str, node_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing node in the graph"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                # First check if the node exists
                check_query = """
                MATCH (n:Node {id: $node_id})
                RETURN n
                """
                
                result = session.run(check_query, {'node_id': node_id})
                if not result.single():
                    raise Exception(f"Node with id '{node_id}' not found")
                
                # Update the node
                query = """
                MATCH (n:Node {id: $node_id})
                SET n.name = $name,
                    n.description = $description,
                    n.layer = $layer,
                    n.type = $type,
                    n.updated_at = datetime()
                RETURN n
                """
                
                result = session.run(query, {
                    'node_id': node_id,
                    'name': node_data['name'],
                    'description': node_data.get('description', ''),
                    'layer': node_data.get('layer', ''),
                    'type': node_data.get('type', '')
                })
                
                record = result.single()
                if record:
                    node = record['n']
                    updated_node = {
                        'id': node['id'],
                        'name': node['name'],
                        'description': node['description'],
                        'layer': node['layer'],
                        'type': node['type']
                    }
                    
                    logger.info(f"Updated node: {node_id}")
                    return updated_node
                
                raise Exception("Failed to update node")
                
        except Exception as e:
            logger.error(f"Error updating node: {e}")
            raise

    def update_custom_layer(self, old_layer_name: str, new_layer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a custom layer and optionally rename all nodes in that layer"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                new_layer_name = new_layer_data.get('name', old_layer_name)
                new_description = new_layer_data.get('description', '')
                
                # Check if the custom layer exists
                check_query = """
                MATCH (l:CustomLayer {name: $old_name})
                RETURN l
                """
                
                result = session.run(check_query, {'old_name': old_layer_name})
                custom_layer_exists = result.single() is not None
                
                # If renaming to a different name, check if new name already exists
                if new_layer_name != old_layer_name:
                    existing_layers = self.get_all_layers()
                    if new_layer_name in existing_layers:
                        raise Exception(f"Layer '{new_layer_name}' already exists")
                
                # Update or create the custom layer
                if custom_layer_exists:
                    update_layer_query = """
                    MATCH (l:CustomLayer {name: $old_name})
                    SET l.name = $new_name,
                        l.description = $description,
                        l.updated_at = datetime()
                    RETURN l
                    """
                    
                    session.run(update_layer_query, {
                        'old_name': old_layer_name,
                        'new_name': new_layer_name,
                        'description': new_description
                    })
                else:
                    # Create new custom layer if it doesn't exist
                    create_layer_query = """
                    CREATE (l:CustomLayer {
                        name: $new_name,
                        description: $description,
                        created_at: datetime(),
                        updated_at: datetime()
                    })
                    RETURN l
                    """
                    
                    session.run(create_layer_query, {
                        'new_name': new_layer_name,
                        'description': new_description
                    })
                
                # If layer name changed, update all nodes in that layer
                if new_layer_name != old_layer_name:
                    update_nodes_query = """
                    MATCH (n:Node {layer: $old_name})
                    SET n.layer = $new_name,
                        n.updated_at = datetime()
                    RETURN count(n) as updated_count
                    """
                    
                    result = session.run(update_nodes_query, {
                        'old_name': old_layer_name,
                        'new_name': new_layer_name
                    })
                    
                    record = result.single()
                    updated_count = record['updated_count'] if record else 0
                    
                    logger.info(f"Updated {updated_count} nodes from layer '{old_layer_name}' to '{new_layer_name}'")
                
                logger.info(f"Updated custom layer: '{old_layer_name}' -> '{new_layer_name}'")
                
                return {
                    'name': new_layer_name,
                    'description': new_description,
                    'old_name': old_layer_name
                }
                
        except Exception as e:
            logger.error(f"Error updating custom layer: {e}")
            raise

    def export_graph_data(self, include_metadata: bool = True) -> Dict[str, Any]:
        """Export complete graph data in a structured JSON format"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                # Get all nodes with their properties
                nodes_query = """
                MATCH (n:Node)
                RETURN n.id as id, n.name as name, n.description as description, 
                       n.layer as layer, n.type as type,
                       n.created_at as created_at, n.updated_at as updated_at
                ORDER BY n.layer, n.name
                """
                
                nodes_result = session.run(nodes_query)
                nodes = []
                for record in nodes_result:
                    node_data = {
                        'id': record['id'],
                        'name': record['name'],
                        'description': record['description'],
                        'layer': record['layer'],
                        'type': record['type']
                    }
                    
                    # Include timestamps if metadata is requested
                    if include_metadata:
                        node_data.update({
                            'created_at': record['created_at'].isoformat() if record['created_at'] else None,
                            'updated_at': record['updated_at'].isoformat() if record['updated_at'] else None
                        })
                    
                    nodes.append(node_data)
                
                # Get all relationships with their properties
                edges_query = """
                MATCH (a:Node)-[r]->(b:Node)
                RETURN a.id as from_id, b.id as to_id, type(r) as relationship_type,
                       r.created_at as created_at
                """
                
                edges_result = session.run(edges_query)
                edges = []
                for record in edges_result:
                    edge_data = {
                        'from_id': record['from_id'],
                        'to_id': record['to_id'],
                        'type': record['relationship_type']
                    }
                    
                    # Include timestamps if metadata is requested
                    if include_metadata:
                        edge_data['created_at'] = record['created_at'].isoformat() if record['created_at'] else None
                    
                    edges.append(edge_data)
                
                # Get custom layers
                custom_layers = self.get_custom_layers()
                
                # Build export data structure
                export_data = {
                    'format_version': '1.0',
                    'export_timestamp': datetime.now().isoformat(),
                    'graph_data': {
                        'nodes': nodes,
                        'edges': edges,
                        'custom_layers': custom_layers
                    },
                    'statistics': {
                        'total_nodes': len(nodes),
                        'total_edges': len(edges),
                        'total_layers': len(set(node['layer'] for node in nodes if node['layer'])),
                        'custom_layers_count': len(custom_layers)
                    }
                }
                
                if include_metadata:
                    # Add layer statistics
                    layer_stats = {}
                    for node in nodes:
                        layer = node['layer'] or 'Other'
                        if layer not in layer_stats:
                            layer_stats[layer] = {'nodes': 0, 'types': set()}
                        layer_stats[layer]['nodes'] += 1
                        layer_stats[layer]['types'].add(node['type'])
                    
                    # Convert sets to lists for JSON serialization
                    for layer in layer_stats:
                        layer_stats[layer]['types'] = list(layer_stats[layer]['types'])
                    
                    export_data['metadata'] = {
                        'layer_statistics': layer_stats,
                        'relationship_types': list(set(edge['type'] for edge in edges)),
                        'node_types': list(set(node['type'] for node in nodes))
                    }
                
                logger.info(f"✅ Graph data exported: {len(nodes)} nodes, {len(edges)} edges")
                return export_data
                
        except Exception as e:
            logger.error(f"❌ Error exporting graph data: {e}")
            raise

    def import_graph_data(self, import_data: Dict[str, Any], graph_name: str = None, 
                         clear_existing: bool = False, validate_only: bool = False) -> Dict[str, Any]:
        """Import graph data from exported JSON format"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            # Validate import data structure
            validation_result = self._validate_import_data(import_data)
            if not validation_result['valid']:
                return validation_result
            
            if validate_only:
                return validation_result
            
            graph_data = import_data['graph_data']
            nodes = graph_data['nodes']
            edges = graph_data['edges']
            custom_layers = graph_data.get('custom_layers', [])
            
            import_stats = {
                'nodes_created': 0,
                'nodes_updated': 0,
                'edges_created': 0,
                'layers_created': 0,
                'errors': []
            }
            
            with self.driver.session() as session:
                # Clear existing data if requested
                if clear_existing:
                    self.clear_all_data()
                    logger.info("Cleared existing graph data before import")
                
                # Create custom layers first
                for layer_name in custom_layers:
                    try:
                        create_layer_query = """
                        MERGE (l:CustomLayer {name: $layer_name})
                        SET l.created_at = datetime()
                        RETURN l
                        """
                        result = session.run(create_layer_query, {'layer_name': layer_name})
                        if result.single():
                            import_stats['layers_created'] += 1
                    except Exception as e:
                        import_stats['errors'].append(f"Error creating layer '{layer_name}': {str(e)}")
                
                # Import nodes
                for node in nodes:
                    try:
                        # Check if node already exists
                        check_query = "MATCH (n:Node {id: $id}) RETURN n"
                        existing = session.run(check_query, {'id': node['id']}).single()
                        
                        if existing:
                            # Update existing node
                            update_query = """
                            MATCH (n:Node {id: $id})
                            SET n.name = $name,
                                n.description = $description,
                                n.layer = $layer,
                                n.type = $type,
                                n.updated_at = datetime()
                            RETURN n
                            """
                            session.run(update_query, {
                                'id': node['id'],
                                'name': node['name'],
                                'description': node['description'],
                                'layer': node['layer'],
                                'type': node['type']
                            })
                            import_stats['nodes_updated'] += 1
                        else:
                            # Create new node
                            create_query = """
                            CREATE (n:Node {
                                id: $id,
                                name: $name,
                                description: $description,
                                layer: $layer,
                                type: $type,
                                created_at: datetime(),
                                updated_at: datetime()
                            })
                            RETURN n
                            """
                            session.run(create_query, {
                                'id': node['id'],
                                'name': node['name'],
                                'description': node['description'],
                                'layer': node['layer'],
                                'type': node['type']
                            })
                            import_stats['nodes_created'] += 1
                            
                    except Exception as e:
                        import_stats['errors'].append(f"Error importing node '{node['id']}': {str(e)}")
                
                # Import edges
                for edge in edges:
                    try:
                        # Check if both nodes exist
                        check_nodes_query = """
                        MATCH (a:Node {id: $from_id})
                        MATCH (b:Node {id: $to_id})
                        RETURN a, b
                        """
                        nodes_exist = session.run(check_nodes_query, {
                            'from_id': edge['from_id'],
                            'to_id': edge['to_id']
                        }).single()
                        
                        if not nodes_exist:
                            import_stats['errors'].append(
                                f"Cannot create edge {edge['from_id']} -> {edge['to_id']}: one or both nodes don't exist"
                            )
                            continue
                        
                        # Create edge (MERGE to avoid duplicates)
                        create_edge_query = f"""
                        MATCH (a:Node {{id: $from_id}})
                        MATCH (b:Node {{id: $to_id}})
                        MERGE (a)-[r:{edge['type']}]->(b)
                        SET r.created_at = datetime()
                        RETURN r
                        """
                        result = session.run(create_edge_query, {
                            'from_id': edge['from_id'],
                            'to_id': edge['to_id']
                        })
                        
                        if result.single():
                            import_stats['edges_created'] += 1
                            
                    except Exception as e:
                        import_stats['errors'].append(f"Error importing edge {edge['from_id']} -> {edge['to_id']}: {str(e)}")
                
                # Save as named graph if graph_name is provided
                if graph_name:
                    try:
                        current_graph_data = self.get_all_nodes_and_edges()
                        self.save_graph(graph_name, current_graph_data)
                        logger.info(f"Imported graph saved as '{graph_name}'")
                    except Exception as e:
                        import_stats['errors'].append(f"Error saving imported graph as '{graph_name}': {str(e)}")
                
                logger.info(f"✅ Graph import completed: {import_stats}")
                
                return {
                    'success': True,
                    'message': 'Graph data imported successfully',
                    'statistics': import_stats,
                    'total_errors': len(import_stats['errors'])
                }
                
        except Exception as e:
            logger.error(f"❌ Error importing graph data: {e}")
            raise

    def _validate_import_data(self, import_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate the structure and content of import data"""
        errors = []
        warnings = []
        
        # Check required top-level fields
        if not isinstance(import_data, dict):
            return {'valid': False, 'errors': ['Import data must be a JSON object']}
        
        if 'graph_data' not in import_data:
            errors.append('Missing required field: graph_data')
        
        if 'format_version' not in import_data:
            warnings.append('Missing format_version field')
        elif import_data['format_version'] != '1.0':
            warnings.append(f"Unknown format version: {import_data['format_version']}")
        
        if errors:
            return {'valid': False, 'errors': errors, 'warnings': warnings}
        
        graph_data = import_data['graph_data']
        
        # Validate graph_data structure
        if not isinstance(graph_data, dict):
            errors.append('graph_data must be an object')
            return {'valid': False, 'errors': errors, 'warnings': warnings}
        
        if 'nodes' not in graph_data:
            errors.append('Missing required field: graph_data.nodes')
        elif not isinstance(graph_data['nodes'], list):
            errors.append('graph_data.nodes must be an array')
        
        if 'edges' not in graph_data:
            errors.append('Missing required field: graph_data.edges')
        elif not isinstance(graph_data['edges'], list):
            errors.append('graph_data.edges must be an array')
        
        if errors:
            return {'valid': False, 'errors': errors, 'warnings': warnings}
        
        # Validate nodes
        node_ids = set()
        for i, node in enumerate(graph_data['nodes']):
            if not isinstance(node, dict):
                errors.append(f'Node at index {i} must be an object')
                continue
            
            # Check required node fields
            required_fields = ['id', 'name', 'layer', 'type']
            for field in required_fields:
                if field not in node:
                    errors.append(f'Node at index {i} missing required field: {field}')
                elif not isinstance(node[field], str):
                    errors.append(f'Node at index {i} field {field} must be a string')
            
            if 'id' in node:
                if node['id'] in node_ids:
                    errors.append(f'Duplicate node ID: {node["id"]}')
                node_ids.add(node['id'])
        
        # Validate edges
        for i, edge in enumerate(graph_data['edges']):
            if not isinstance(edge, dict):
                errors.append(f'Edge at index {i} must be an object')
                continue
            
            # Check required edge fields
            required_fields = ['from_id', 'to_id', 'type']
            for field in required_fields:
                if field not in edge:
                    errors.append(f'Edge at index {i} missing required field: {field}')
                elif not isinstance(edge[field], str):
                    errors.append(f'Edge at index {i} field {field} must be a string')
            
            # Check if referenced nodes exist
            if 'from_id' in edge and edge['from_id'] not in node_ids:
                errors.append(f'Edge at index {i} references non-existent from_id: {edge["from_id"]}')
            if 'to_id' in edge and edge['to_id'] not in node_ids:
                errors.append(f'Edge at index {i} references non-existent to_id: {edge["to_id"]}')
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'statistics': {
                'nodes_count': len(graph_data['nodes']),
                'edges_count': len(graph_data['edges']),
                'unique_node_ids': len(node_ids)
            }
        } 