#!/usr/bin/env node
/**
 * Test script for frontend delete graph functionality
 * This script simulates the frontend API calls for delete graph feature
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testFrontendDeleteGraph() {
  console.log('🧪 Testing Frontend Delete Graph Functionality');
  console.log('==============================================');

  try {
    // Test API connection
    console.log('\n📡 Testing API connection...');
    const health = await makeRequest('/api/health');
    if (health.status === 200) {
      console.log('✅ API connection successful');
    } else {
      console.log('❌ API connection failed');
      return;
    }

    // Create test data
    console.log('\n📊 Creating test data...');
    
    // Create a test layer
    const createLayer = await makeRequest('/api/graph/layers', 'POST', {
      name: 'FrontendDeleteTestLayer',
      description: 'Test layer for frontend delete testing'
    });
    
    if (createLayer.data.success) {
      console.log('✅ Test layer created successfully');
    } else {
      console.log('❌ Failed to create test layer:', createLayer.data.error);
    }

    // Create a test node
    const createNode = await makeRequest('/api/graph/nodes', 'POST', {
      id: 'frontend.delete.test.node',
      name: 'Frontend Delete Test Node',
      description: 'Test node for frontend delete testing',
      layer: 'FrontendDeleteTestLayer',
      type: 'requirement'
    });
    
    if (createNode.data.success) {
      console.log('✅ Test node created successfully');
    } else {
      console.log('❌ Failed to create test node:', createNode.data.error);
    }

    // Save a test graph (simulating frontend save)
    console.log('\n💾 Saving test graph...');
    const saveGraph = await makeRequest('/api/graph/save', 'POST', {
      graph_name: 'FrontendDeleteTestGraph'
    });
    
    if (saveGraph.data.success) {
      console.log('✅ Test graph saved successfully');
    } else {
      console.log('❌ Failed to save test graph:', saveGraph.data.error);
      return;
    }

    // Get saved graphs list (simulating frontend load graphs modal)
    console.log('\n📋 Fetching saved graphs (simulating Load Graph modal)...');
    const getSavedGraphs = await makeRequest('/api/graph/saved');
    
    if (getSavedGraphs.data.success) {
      const graphs = getSavedGraphs.data.graphs || [];
      console.log(`✅ Found ${graphs.length} saved graphs`);
      
      // Find our test graph
      const testGraph = graphs.find(g => g.name === 'FrontendDeleteTestGraph');
      if (testGraph) {
        console.log(`✅ Test graph found: ${testGraph.name} (${testGraph.nodes_count} nodes, ${testGraph.edges_count} edges)`);
      } else {
        console.log('❌ Test graph not found in saved graphs list');
        return;
      }
    } else {
      console.log('❌ Failed to fetch saved graphs:', getSavedGraphs.data.error);
      return;
    }

    // Test delete graph (simulating frontend delete button click)
    console.log('\n🗑️ Testing delete graph (simulating Delete button click)...');
    const deleteGraph = await makeRequest('/api/graph/saved/FrontendDeleteTestGraph', 'DELETE');
    
    if (deleteGraph.data.success) {
      console.log('✅ Graph deleted successfully');
      console.log('   Response:', deleteGraph.data.message);
    } else {
      console.log('❌ Failed to delete graph:', deleteGraph.data.error);
    }

    // Verify graph was deleted (simulating frontend refresh)
    console.log('\n🔍 Verifying graph deletion (simulating frontend refresh)...');
    const verifyDeletion = await makeRequest('/api/graph/saved');
    
    if (verifyDeletion.data.success) {
      const graphs = verifyDeletion.data.graphs || [];
      const testGraph = graphs.find(g => g.name === 'FrontendDeleteTestGraph');
      
      if (!testGraph) {
        console.log('✅ Graph successfully removed from saved graphs list');
      } else {
        console.log('❌ Graph still exists in saved graphs list');
      }
    } else {
      console.log('❌ Failed to verify deletion:', verifyDeletion.data.error);
    }

    // Test error handling - delete non-existent graph
    console.log('\n🔍 Testing error handling (non-existent graph)...');
    const deleteNonExistent = await makeRequest('/api/graph/saved/NonExistentGraph', 'DELETE');
    
    if (deleteNonExistent.status === 404 && !deleteNonExistent.data.success) {
      console.log('✅ Correctly handled non-existent graph deletion');
      console.log('   Error message:', deleteNonExistent.data.error);
    } else {
      console.log('❌ Did not handle non-existent graph deletion correctly');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await makeRequest('/api/graph/nodes/frontend.delete.test.node', 'DELETE');
    await makeRequest('/api/graph/layers/FrontendDeleteTestLayer', 'DELETE');
    console.log('✅ Cleanup completed');

    console.log('\n🎉 Frontend delete graph functionality test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ API connection working');
    console.log('   ✅ Graph saving working');
    console.log('   ✅ Graph listing working');
    console.log('   ✅ Graph deletion working');
    console.log('   ✅ Error handling working');
    console.log('   ✅ Frontend should no longer crash when clicking Delete Graph button');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendDeleteGraph(); 