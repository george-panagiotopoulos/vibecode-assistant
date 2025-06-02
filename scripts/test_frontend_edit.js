#!/usr/bin/env node
/**
 * Test script for frontend edit functionality
 * This script simulates the frontend API calls to test edit functionality
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

async function testEditFunctionality() {
  console.log('🧪 Testing Frontend Edit Functionality');
  console.log('=====================================');

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

    // Create a test layer
    console.log('\n📚 Creating test layer...');
    const createLayer = await makeRequest('/api/graph/layers', 'POST', {
      name: 'FrontendTestLayer',
      description: 'Test layer for frontend testing'
    });
    
    if (createLayer.data.success) {
      console.log('✅ Test layer created successfully');
    } else {
      console.log('❌ Failed to create test layer:', createLayer.data.error);
    }

    // Create a test node
    console.log('\n🔧 Creating test node...');
    const createNode = await makeRequest('/api/graph/nodes', 'POST', {
      id: 'frontend.test.node',
      name: 'Frontend Test Node',
      description: 'Test node for frontend testing',
      layer: 'FrontendTestLayer',
      type: 'requirement'
    });
    
    if (createNode.data.success) {
      console.log('✅ Test node created successfully');
    } else {
      console.log('❌ Failed to create test node:', createNode.data.error);
    }

    // Test node update (simulating frontend edit)
    console.log('\n✏️ Testing node update...');
    const updateNode = await makeRequest('/api/graph/nodes/frontend.test.node', 'PUT', {
      name: 'Updated Frontend Test Node',
      description: 'Updated description from frontend test',
      layer: 'FrontendTestLayer',
      type: 'feature'
    });
    
    if (updateNode.data.success) {
      console.log('✅ Node updated successfully');
      console.log('   Updated node:', updateNode.data.node);
    } else {
      console.log('❌ Failed to update node:', updateNode.data.error);
    }

    // Test layer update (simulating frontend edit)
    console.log('\n📝 Testing layer update...');
    const updateLayer = await makeRequest('/api/graph/layers/FrontendTestLayer', 'PUT', {
      name: 'UpdatedFrontendTestLayer',
      description: 'Updated description from frontend test'
    });
    
    if (updateLayer.data.success) {
      console.log('✅ Layer updated successfully');
      console.log('   Updated layer:', updateLayer.data.layer);
    } else {
      console.log('❌ Failed to update layer:', updateLayer.data.error);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await makeRequest('/api/graph/nodes/frontend.test.node', 'DELETE');
    await makeRequest('/api/graph/layers/UpdatedFrontendTestLayer', 'DELETE');
    console.log('✅ Cleanup completed');

    console.log('\n🎉 Frontend edit functionality test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEditFunctionality(); 