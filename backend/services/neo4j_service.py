import os
import logging
from typing import Dict, List, Any, Optional
from neo4j import GraphDatabase, Driver
from neo4j.exceptions import ServiceUnavailable, AuthError

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
        """Delete all nodes in a specific layer"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                query = """
                MATCH (n:Node {layer: $layer_name})
                DETACH DELETE n
                RETURN count(n) as deleted_count
                """
                
                result = session.run(query, {'layer_name': layer_name})
                record = result.single()
                deleted_count = record['deleted_count'] if record else 0
                
                logger.info(f"Deleted {deleted_count} nodes from layer '{layer_name}'")
                return deleted_count
                
        except Exception as e:
            logger.error(f"Error deleting layer: {e}")
            raise
    
    def clear_all_data(self) -> bool:
        """Clear all nodes and relationships from the database"""
        if not self.driver:
            raise Exception("Neo4j connection not available")
        
        try:
            with self.driver.session() as session:
                query = "MATCH (n) DETACH DELETE n"
                session.run(query)
                logger.info("All graph data cleared")
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