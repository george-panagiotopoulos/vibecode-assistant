# Neo4j Database Setup

This directory contains the Docker Compose configuration for the Neo4j graph database used by the Vibe Assistant for hierarchical software planning.

## Quick Start

The database is automatically started when you run the main application:

```bash
# From the project root
npm run start
```

Or start just the database:

```bash
cd database
docker-compose up -d
```

## Database Access

- **Neo4j Browser**: http://localhost:7474
- **Bolt Protocol**: bolt://localhost:7687
- **Username**: neo4j
- **Password**: vibeassistant

## Database Schema

The graph database stores software planning concerns as nodes and their relationships as edges:

### Node Structure
```cypher
(:Node {
  id: String,           // Unique identifier (e.g., "app.performance")
  name: String,         // Human-readable name
  description: String,  // Detailed description
  layer: String,        // Abstraction layer (UX, Architecture, Application, Infrastructure, Security)
  type: String,         // Node type (NFR, Standard, Requirement, Constraint)
  created_at: DateTime,
  updated_at: DateTime
})
```

### Relationship Types
- `LINKED_TO`: General association
- `DEPENDS_ON`: Dependency relationship
- `SUPPORTS`: Supporting relationship
- `CONFLICTS_WITH`: Conflicting relationship
- `ENABLES`: Enabling relationship

## Sample Data

The application includes sample data that demonstrates hierarchical software planning:

- **UX Layer**: Usability concerns
- **Architecture Layer**: System design patterns
- **Application Layer**: Code structure and practices
- **Infrastructure Layer**: Performance and availability
- **Security Layer**: Security practices and requirements

## Management Commands

### Start Database
```bash
docker-compose up -d
```

### Stop Database
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f neo4j
```

### Reset Database
```bash
docker-compose down -v  # Removes all data
docker-compose up -d
```

## Data Persistence

Data is persisted in Docker volumes:
- `neo4j_data`: Database files
- `neo4j_logs`: Log files
- `neo4j_import`: Import directory
- `neo4j_plugins`: Plugin directory

## Troubleshooting

### Database Won't Start
1. Check if ports 7474 and 7687 are available
2. Ensure Docker is running
3. Check logs: `docker-compose logs neo4j`

### Connection Issues
1. Verify the database is running: `docker-compose ps`
2. Test connection: `curl http://localhost:7474`
3. Check firewall settings

### Performance Issues
1. Increase Docker memory allocation
2. Monitor resource usage: `docker stats`
3. Check Neo4j logs for warnings

## API Integration

The backend provides REST endpoints for graph operations:

- `GET /api/graph/nodes` - Fetch all nodes and edges
- `POST /api/graph/nodes` - Create a new node
- `POST /api/graph/edges` - Create a new relationship
- `POST /api/graph/sample` - Load sample data
- `DELETE /api/graph/nodes/{id}` - Delete a node
- `DELETE /api/graph/edges/{from}/{to}` - Delete a relationship
- `POST /api/graph/clear` - Clear all data

## Development

For development, you can access the Neo4j Browser at http://localhost:7474 to:
- Visualize the graph
- Run Cypher queries
- Monitor performance
- Manage indexes and constraints

Example Cypher queries:
```cypher
// View all nodes
MATCH (n:Node) RETURN n

// View all relationships
MATCH (a:Node)-[r]->(b:Node) RETURN a, r, b

// Find nodes by layer
MATCH (n:Node {layer: 'Application'}) RETURN n

// Find dependency chains
MATCH path = (a:Node)-[:DEPENDS_ON*]->(b:Node) RETURN path
``` 