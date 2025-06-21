from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import logging
import json
from datetime import datetime
import time

# RADICAL FIX: Force environment loading FIRST
from config.env_loader import env_loader
env_loader.ensure_loaded()

from config.settings import Config
from services.github_service import GitHubService
from services.bedrock_service import BedrockService
from services.prompt_service import PromptService
from services.config_service import ConfigService
from services.prompt_constructor import PromptConstructor
from services.logging_service import logging_service
from services.neo4j_service import Neo4jService

# Configure logging EARLY
log_level = env_loader.get_env('LOG_LEVEL', 'INFO')
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FORCE LOG ENVIRONMENT STATUS AT STARTUP
logger.info("🚀 STARTING VIBE ASSISTANT")
env_loader.log_environment_status()

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# RADICAL FIX: Initialize services with explicit environment checking
logger.info("🔧 Initializing services...")

try:
    config_service = ConfigService()
    logger.info("✅ ConfigService initialized")
except Exception as e:
    logger.error(f"❌ ConfigService failed: {e}")
    raise

try:
    github_service = GitHubService()
    logger.info("✅ GitHubService initialized")
except Exception as e:
    logger.error(f"❌ GitHubService failed: {e}")
    raise

try:
    bedrock_service = BedrockService()
    logger.info("✅ BedrockService initialized")
except Exception as e:
    logger.error(f"❌ BedrockService failed: {e}")
    raise

try:
    neo4j_service = Neo4jService()
    logger.info("✅ Neo4jService initialized")
except Exception as e:
    logger.error(f"❌ Neo4jService failed: {e}")
    # Don't raise here - Neo4j is optional for basic functionality
    neo4j_service = None

try:
    prompt_service = PromptService(bedrock_service, neo4j_service)
    logger.info("✅ PromptService initialized with architecture support")
except Exception as e:
    logger.error(f"❌ PromptService failed: {e}")
    raise

try:
    prompt_constructor = PromptConstructor(bedrock_service, config_service)
    logger.info("✅ PromptConstructor initialized")
except Exception as e:
    logger.error(f"❌ PromptConstructor failed: {e}")
    raise

# FORCE CHECK CONFIGURATION AT STARTUP
try:
    startup_config = config_service.get_config()
    logger.info("🔍 STARTUP CONFIGURATION CHECK:")
    logger.info(f"GitHub repo: {startup_config.get('github', {}).get('default_repo', 'NOT SET')}")
    logger.info(f"AWS region: {startup_config.get('aws', {}).get('region', 'NOT SET')}")
    logger.info(f"AWS key set: {bool(startup_config.get('aws', {}).get('access_key_id'))}")
    logger.info(f"GitHub token set: {bool(startup_config.get('github', {}).get('token'))}")
except Exception as e:
    logger.error(f"❌ Startup configuration check failed: {e}")

logger.info("🎯 All services initialized successfully!")

@app.before_request
def before_request():
    """Ensure environment is loaded before each request"""
    env_loader.ensure_loaded()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with environment status"""
    env_status = {
        'aws_configured': bool(env_loader.get_env('AWS_ACCESS_KEY_ID')),
        'github_configured': bool(env_loader.get_env('GITHUB_TOKEN')),
        'github_repo_set': bool(env_loader.get_env('GITHUB_DEFAULT_REPO'))
    }
    return jsonify({
        "status": "healthy", 
        "service": "vibe-assistant",
        "environment": env_status
    })

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    """Get or update application configuration"""
    if request.method == 'GET':
        try:
            config = config_service.get_config()
            return jsonify({"success": True, "config": config})
        except Exception as e:
            logger.error(f"Error getting config: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            config_data = request.json
            updated_config = config_service.update_config(config_data)
            return jsonify({"success": True, "config": updated_config})
        except Exception as e:
            logger.error(f"Error updating config: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/test-connection/<service>', methods=['POST'])
def test_service_connection(service):
    """Test connection to various services"""
    try:
        data = request.json or {}
        
        if service == 'aws':
            # Test AWS Bedrock connection
            try:
                # Temporarily update bedrock service with new credentials if provided
                if 'aws' in data:
                    aws_config = data['aws']
                    # Create a temporary bedrock service instance for testing
                    import boto3
                    from services.bedrock_service import BedrockService
                    
                    # Test with provided credentials
                    session = boto3.Session(
                        aws_access_key_id=aws_config.get('access_key_id'),
                        aws_secret_access_key=aws_config.get('secret_access_key'),
                        region_name=aws_config.get('region', 'us-east-1')
                    )
                    
                    bedrock_client = session.client('bedrock-runtime')
                    
                    # Simple test call
                    response = bedrock_client.list_foundation_models()
                    return jsonify({"success": True, "message": "AWS Bedrock connection successful"})
                else:
                    # Test with current service
                    if bedrock_service.test_connection():
                        return jsonify({"success": True, "message": "AWS Bedrock connection successful"})
                    else:
                        return jsonify({"success": False, "error": "AWS Bedrock connection failed"})
                        
            except Exception as e:
                return jsonify({"success": False, "error": f"AWS connection failed: {str(e)}"})
        
        elif service == 'github':
            # Test GitHub connection
            try:
                github_config = data.get('github', {})
                token = github_config.get('token') or os.environ.get('GITHUB_TOKEN')
                
                if not token:
                    return jsonify({"success": False, "error": "GitHub token not provided"})
                
                # Test GitHub API access
                import requests
                headers = {'Authorization': f'token {token}'}
                response = requests.get('https://api.github.com/user', headers=headers)
                
                if response.status_code == 200:
                    user_data = response.json()
                    return jsonify({
                        "success": True, 
                        "message": f"GitHub connection successful (user: {user_data.get('login', 'unknown')})"
                    })
                else:
                    return jsonify({"success": False, "error": f"GitHub API error: {response.status_code}"})
                    
            except Exception as e:
                return jsonify({"success": False, "error": f"GitHub connection failed: {str(e)}"})
        
        elif service == 'neo4j':
            # Test Neo4j connection
            try:
                if neo4j_service and neo4j_service.is_connected():
                    return jsonify({"success": True, "message": "Neo4j connection successful"})
                else:
                    return jsonify({"success": False, "error": "Neo4j service not available or not connected"})
                    
            except Exception as e:
                return jsonify({"success": False, "error": f"Neo4j connection failed: {str(e)}"})
        
        else:
            return jsonify({"success": False, "error": f"Unknown service: {service}"}), 400
            
    except Exception as e:
        logger.error(f"Error testing {service} connection: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/repositories/files', methods=['POST'])
def get_repository_files():
    """Get file tree for a GitHub repository"""
    try:
        data = request.json
        repo_url = data.get('repo_url')
        github_token = data.get('github_token') or os.environ.get('GITHUB_TOKEN')
        
        if not repo_url:
            return jsonify({"success": False, "error": "Repository URL is required"}), 400
        
        github_service.set_token(github_token)
        file_tree = github_service.get_repository_files(repo_url)
        
        return jsonify({"success": True, "files": file_tree})
    except Exception as e:
        logger.error(f"Error getting repository files: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/repositories/file-content', methods=['POST'])
def get_file_content():
    """Get content of a specific file from repository"""
    try:
        data = request.json
        repo_url = data.get('repo_url')
        file_path = data.get('file_path')
        github_token = data.get('github_token') or os.environ.get('GITHUB_TOKEN')
        
        if not repo_url or not file_path:
            return jsonify({"success": False, "error": "Repository URL and file path are required"}), 400
        
        github_service.set_token(github_token)
        content = github_service.get_file_content(repo_url, file_path)
        
        return jsonify({"success": True, "content": content})
    except Exception as e:
        logger.error(f"Error getting file content: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/repositories/folder-contents', methods=['POST'])
def get_folder_contents():
    """Get contents of a specific folder from repository"""
    try:
        data = request.json
        repo_url = data.get('repo_url')
        folder_path = data.get('folder_path', '')  # Default to empty string for root
        github_token = data.get('github_token') or os.environ.get('GITHUB_TOKEN')
        
        if not repo_url:
            return jsonify({"success": False, "error": "Repository URL is required"}), 400
        
        github_service.set_token(github_token)
        contents = github_service.get_folder_contents(repo_url, folder_path)
        
        return jsonify({"success": True, "contents": contents})
    except Exception as e:
        logger.error(f"Error getting folder contents: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/requirements', methods=['GET', 'POST'])
def handle_requirements():
    """Handle requirements operations - Updated to remove task_type dependency"""
    if request.method == 'GET':
        try:
            config = config_service.get_config()
            # Return all available requirements without task_type filtering
            requirements = config.get('non_functional_requirements', {})
            return jsonify({"success": True, "requirements": requirements})
        except Exception as e:
            logger.error(f"Error getting requirements: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            requirements = data.get('requirements', [])
            
            # Store requirements without task_type association
            # This is now a simple storage operation for user-selected requirements
            logger.info(f"Storing {len(requirements)} requirements")
            
            return jsonify({
                "success": True, 
                "message": f"Stored {len(requirements)} requirements",
                "requirements": requirements
            })
        except Exception as e:
            logger.error(f"Error handling requirements: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/enhance-prompt', methods=['POST'])
def enhance_prompt():
    """Enhanced prompt endpoint with real Bedrock integration - Updated to support custom instructions"""
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Prompt is required'}), 400
        
        user_prompt = data['prompt']
        selected_files = data.get('selected_files', [])
        enhancement_type = data.get('enhancement_type', 'enhanced_prompt')
        nfr_requirements = data.get('requirements', [])
        custom_instructions = data.get('custom_instructions', None)
        
        # Validate and sanitize custom instructions if provided
        if custom_instructions:
            # Basic validation
            if not isinstance(custom_instructions, str):
                return jsonify({'error': 'Custom instructions must be a string'}), 400
            
            # Length validation
            if len(custom_instructions) > 2000:
                return jsonify({'error': 'Custom instructions must be 2000 characters or less'}), 400
            
            # Basic sanitization - remove potentially harmful content
            import re
            # Remove script tags and other potentially harmful content
            custom_instructions = re.sub(r'<script[^>]*>.*?</script>', '', custom_instructions, flags=re.IGNORECASE | re.DOTALL)
            custom_instructions = re.sub(r'javascript:', '', custom_instructions, flags=re.IGNORECASE)
            custom_instructions = custom_instructions.strip()
            
            if not custom_instructions:
                return jsonify({'error': 'Custom instructions cannot be empty after sanitization'}), 400
            
            # Override enhancement type for custom instructions
            enhancement_type = 'custom'
        
        logger.info(f"Processing enhance-prompt request: {user_prompt[:100]}... (type: {enhancement_type}, custom: {bool(custom_instructions)})")
        
        # Log the API request
        logging_service.log_api_request(
            endpoint='/api/enhance-prompt',
            request_data={
                'prompt': user_prompt,
                'enhancement_type': enhancement_type,
                'selected_files_count': len(selected_files),
                'requirements_count': len(nfr_requirements),
                'has_custom_instructions': bool(custom_instructions)
            }
        )
        
        # Test Bedrock connection first
        if not bedrock_service.test_connection():
            error_msg = "Bedrock connection test failed"
            logger.error(error_msg)
            logging_service.log_error("bedrock_connection", error_msg)
            return jsonify({'error': 'AI service temporarily unavailable'}), 503
        
        # Use the updated prompt service for enhancement
        try:
            enhanced_result = prompt_service.enhance_prompt(
                user_prompt=user_prompt,
                nfr_requirements=nfr_requirements,
                file_context=selected_files,
                application_architecture=None,  # No architecture for basic enhancement
                enhancement_type=enhancement_type,
                custom_instructions=custom_instructions  # Pass custom instructions
            )
            
            logger.info(f"Successfully enhanced prompt with enhancement_type: {enhancement_type}")
            
            # Log successful response
            logging_service.log_api_request(
                endpoint='/api/enhance-prompt',
                request_data={
                    'prompt': user_prompt,
                    'enhancement_type': enhancement_type,
                    'selected_files_count': len(selected_files),
                    'has_custom_instructions': bool(custom_instructions)
                },
                response_data={
                    'success': True,
                    'enhanced_length': len(enhanced_result)
                }
            )
            
            # Return response with logs for the frontend
            return jsonify({
                'enhanced_specification': enhanced_result,
                'original_input': user_prompt,
                'enhancement_type': enhancement_type,
                'metadata': {
                    'requirements_count': len(nfr_requirements),
                    'selected_files_count': len(selected_files),
                    'architecture_enhanced': False,
                    'custom_instructions_used': bool(custom_instructions),
                    'custom_instructions_length': len(custom_instructions) if custom_instructions else 0
                },
                'logs': [
                    {
                        'type': 'user_input',
                        'content': user_prompt,
                        'timestamp': datetime.now().isoformat(),
                        'metadata': {'enhancement_type': enhancement_type, 'file_count': len(selected_files)}
                    },
                    {
                        'type': 'llm_response',
                        'content': enhanced_result,
                        'timestamp': datetime.now().isoformat(),
                        'metadata': {'requirements_count': len(nfr_requirements)}
                    }
                ]
            })
            
        except Exception as e:
            error_msg = f"Error enhancing prompt: {str(e)}"
            logger.error(error_msg)
            logging_service.log_error("enhance_prompt_service", error_msg)
            return jsonify({'error': f'Failed to enhance prompt: {str(e)}'}), 500
        
    except Exception as e:
        error_msg = f"Error in enhance-prompt endpoint: {str(e)}"
        logger.error(error_msg)
        logging_service.log_error("enhance_prompt", error_msg, {'prompt': user_prompt[:100] if 'user_prompt' in locals() else 'unknown'})
        return jsonify({'error': f'Failed to enhance prompt: {str(e)}'}), 500

@app.route('/api/enhance-prompt-with-architecture', methods=['POST'])
def enhance_prompt_with_architecture():
    """Enhanced prompt endpoint with application architecture integration - Updated to support custom instructions"""
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Prompt is required'}), 400
        
        user_prompt = data['prompt']
        selected_files = data.get('selected_files', [])
        architecture_layers = data.get('architecture_layers', [])
        requirements = data.get('requirements', [])
        enhancement_type = data.get('enhancement_type', 'enhanced_prompt')
        consider_architecture = data.get('consider_architecture', False)
        custom_instructions = data.get('custom_instructions', None)
        
        # Validate and sanitize custom instructions if provided
        if custom_instructions:
            # Basic validation
            if not isinstance(custom_instructions, str):
                return jsonify({'error': 'Custom instructions must be a string'}), 400
            
            # Length validation
            if len(custom_instructions) > 2000:
                return jsonify({'error': 'Custom instructions must be 2000 characters or less'}), 400
            
            # Basic sanitization - remove potentially harmful content
            import re
            # Remove script tags and other potentially harmful content
            custom_instructions = re.sub(r'<script[^>]*>.*?</script>', '', custom_instructions, flags=re.IGNORECASE | re.DOTALL)
            custom_instructions = re.sub(r'javascript:', '', custom_instructions, flags=re.IGNORECASE)
            custom_instructions = custom_instructions.strip()
            
            if not custom_instructions:
                return jsonify({'error': 'Custom instructions cannot be empty after sanitization'}), 400
            
            # Override enhancement type for custom instructions
            enhancement_type = 'custom'
        
        logger.info(f"Processing architecture-enhanced prompt: {user_prompt[:100]}... (type: {enhancement_type}, arch: {consider_architecture}, custom: {bool(custom_instructions)})")
        
        # Log the API request
        logging_service.log_api_request(
            endpoint='/api/enhance-prompt-with-architecture',
            request_data={
                'prompt': user_prompt,
                'enhancement_type': enhancement_type,
                'selected_files_count': len(selected_files),
                'architecture_layers_count': len(architecture_layers),
                'requirements_count': len(requirements),
                'consider_architecture': consider_architecture,
                'has_custom_instructions': bool(custom_instructions)
            }
        )
        
        # Test services availability
        if not bedrock_service.test_connection():
            error_msg = "Bedrock connection test failed"
            logger.error(error_msg)
            logging_service.log_error("bedrock_connection", error_msg)
            return jsonify({'error': 'AI service temporarily unavailable'}), 503
        
        # Use the enhanced prompt service with architecture support
        try:
            # Only pass architecture layers if explicitly requested
            application_architecture = architecture_layers if consider_architecture else None
            
            # Convert requirements list to proper format if needed
            nfr_requirements = []
            if requirements:
                for req in requirements:
                    if isinstance(req, dict):
                        # Extract description or name from requirement object
                        req_text = req.get('description', req.get('name', str(req)))
                        nfr_requirements.append(req_text)
                    else:
                        nfr_requirements.append(str(req))
            
            # Call the prompt service to get the enhanced response
            enhanced_response = prompt_service.enhance_prompt(
                user_prompt=user_prompt,
                nfr_requirements=nfr_requirements,
                file_context=selected_files,
                application_architecture=application_architecture,
                enhancement_type=enhancement_type,
                return_string_only=True,  # Return only the string response
                custom_instructions=custom_instructions  # Pass custom instructions
            )
            
            # Analyze prompt complexity including architecture
            complexity_analysis = prompt_service.analyze_prompt_complexity(
                user_prompt, 
                architecture_layers if consider_architecture else []
            )
            
            # Get architecture integration status
            integration_status = prompt_service.get_architecture_integration_status()
            
            logger.info(f"Successfully built architecture-enhanced prompt with enhancement_type: {enhancement_type}")
            
            # Log successful response
            logging_service.log_api_request(
                endpoint='/api/enhance-prompt-with-architecture',
                request_data={
                    'prompt': user_prompt,
                    'enhancement_type': enhancement_type,
                    'architecture_layers_count': len(architecture_layers),
                    'consider_architecture': consider_architecture,
                    'has_custom_instructions': bool(custom_instructions)
                },
                response_data={
                    'success': True,
                    'enhanced_length': len(enhanced_response),
                    'complexity': complexity_analysis.get('estimated_complexity', 'unknown')
                }
            )
            
            # Return comprehensive response with the enhanced_prompt as a string
            return jsonify({
                'enhanced_prompt': enhanced_response,  # This is now a string from LLM
                'original_input': user_prompt,
                'enhancement_type': enhancement_type,
                'complexity_analysis': complexity_analysis,
                'integration_status': integration_status,
                'metadata': {
                    'architecture_layers_count': len(architecture_layers) if consider_architecture else 0,
                    'requirements_count': len(requirements),
                    'selected_files_count': len(selected_files),
                    'total_components': sum(layer.get('nodeCount', 0) for layer in architecture_layers) if consider_architecture else 0,
                    'neo4j_available': integration_status.get('neo4j_available', False),
                    'architecture_enhanced': consider_architecture and len(architecture_layers) > 0,
                    'custom_instructions_used': bool(custom_instructions),
                    'custom_instructions_length': len(custom_instructions) if custom_instructions else 0
                },
                'success': True
            })
            
        except Exception as e:
            error_msg = f"Error in architecture-enhanced prompt building: {str(e)}"
            logger.error(error_msg)
            logging_service.log_error("enhance_prompt_with_architecture_service", error_msg)
            return jsonify({'error': f'Failed to build architecture-enhanced prompt: {str(e)}'}), 500
        
    except Exception as e:
        error_msg = f"Error in enhance-prompt-with-architecture endpoint: {str(e)}"
        logger.error(error_msg)
        logging_service.log_error("enhance_prompt_with_architecture", error_msg, {'prompt': user_prompt[:100] if 'user_prompt' in locals() else 'unknown'})
        return jsonify({'error': f'Failed to enhance prompt with architecture: {str(e)}'}), 500

@app.route('/api/stream-response', methods=['POST'])
def stream_response():
    """Stream responses from AWS Bedrock with enhanced timeout handling"""
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Prompt is required'}), 400
        
        user_prompt = data['prompt']
        enhancement_type = data.get('enhancement_type', 'enhanced_prompt')
        max_tokens = data.get('max_tokens', 4000)
        temperature = data.get('temperature', 0.3)
        timeout = data.get('timeout', 120)  # Default 2 minutes
        
        logger.info(f"Processing streaming request: {user_prompt[:100]}... (enhancement_type: {enhancement_type}, timeout: {timeout}s)")
        
        # Log the streaming request (within request context)
        logging_service.log_api_request(
            endpoint='/api/stream-response',
            request_data={
                'prompt': user_prompt,
                'enhancement_type': enhancement_type,
                'max_tokens': max_tokens,
                'temperature': temperature,
                'timeout': timeout
            }
        )
        
        # Initialize services
        bedrock_service = BedrockService()
        prompt_service = PromptService(bedrock_service)
        
        # Test connection first
        if not bedrock_service.test_connection():
            error_msg = "Bedrock connection test failed"
            logger.error(error_msg)
            logging_service.log_error("bedrock_connection", error_msg)
            return jsonify({'error': 'AI service temporarily unavailable'}), 503
        
        # Generate system prompt from configuration using PromptService
        try:
            constructed_prompt = prompt_service.prompt_constructor.construct_enhanced_prompt(
                user_input=user_prompt,
                enhancement_type=enhancement_type
            )
            system_prompt = constructed_prompt.get('system_prompt', '')
        except Exception as e:
            logger.warning(f"Failed to construct system prompt: {str(e)}, using default")
            system_prompt = prompt_service.prompt_config.get_system_prompt('default')
        
        # Collect chunks and metadata for logging (outside generator context)
        response_chunks = []
        streaming_metadata = {
            'max_tokens': max_tokens,
            'temperature': temperature,
            'timeout': timeout,
            'enhancement_type': enhancement_type,
            'system_prompt_generated': bool(system_prompt),
            'start_time': time.time()
        }
        
        def generate():
            nonlocal response_chunks, streaming_metadata
            
            try:
                chunk_count = 0
                for chunk in bedrock_service.invoke_claude_streaming(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    timeout=timeout
                ):
                    # Collect chunk for logging
                    response_chunks.append(chunk)
                    chunk_count += 1
                    
                    # Send each chunk as Server-Sent Events
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                
                # Update metadata
                streaming_metadata.update({
                    'total_chunks': len(response_chunks),
                    'end_time': time.time(),
                    'duration': time.time() - streaming_metadata['start_time'],
                    'success': True
                })
                
                # Send completion signal
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except TimeoutError as e:
                error_msg = f"Request timeout: {str(e)}"
                logger.error(error_msg)
                
                # Update metadata for timeout
                streaming_metadata.update({
                    'total_chunks': len(response_chunks),
                    'end_time': time.time(),
                    'duration': time.time() - streaming_metadata['start_time'],
                    'success': False,
                    'error': 'timeout'
                })
                
                yield f"data: {json.dumps({'error': 'Request timeout - please try again'})}\n\n"
                
            except Exception as e:
                error_msg = f"Error in streaming: {str(e)}"
                logger.error(error_msg)
                
                # Update metadata for error
                streaming_metadata.update({
                    'total_chunks': len(response_chunks),
                    'end_time': time.time(),
                    'duration': time.time() - streaming_metadata['start_time'],
                    'success': False,
                    'error': str(e)
                })
                
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        # Create the response with proper headers
        response = Response(
            generate(),
            mimetype='text/plain',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'X-Accel-Buffering': 'no'  # Disable nginx buffering for real-time streaming
            }
        )
        
        # Log the streaming response after the generator completes
        # This is done via a callback that runs after the response is sent
        @response.call_on_close
        def log_streaming_completion():
            try:
                # Log the complete streaming response (context-safe)
                logging_service.log_streaming_response(
                    prompt=user_prompt,
                    response_chunks=response_chunks,
                    metadata=streaming_metadata
                )
            except Exception as e:
                logger.error(f"Failed to log streaming completion: {str(e)}")
        
        return response
        
    except Exception as e:
        error_msg = f"Error in stream-response endpoint: {str(e)}"
        logger.error(error_msg)
        logging_service.log_error("stream_response", error_msg)
        return jsonify({'error': f'Failed to stream response: {str(e)}'}), 500

@app.route('/api/generate-specification', methods=['POST'])
def generate_specification():
    """Generate detailed technical specification from enhanced prompt"""
    try:
        data = request.get_json()
        
        if not data or 'enhanced_prompt' not in data:
            return jsonify({
                'success': False,
                'error': 'Enhanced prompt is required'
            }), 400
        
        enhanced_prompt = data['enhanced_prompt']
        nfr_requirements = data.get('nfr_requirements', [])
        file_context = data.get('file_context', '')
        
        # Initialize Bedrock service
        bedrock_service = BedrockService()
        
        # Generate detailed specification
        specification = bedrock_service.generate_detailed_specification(
            enhanced_prompt, nfr_requirements, file_context
        )
        
        return jsonify({
            'success': True,
            'specification': specification,
            'enhanced_prompt': enhanced_prompt,
            'nfr_requirements': nfr_requirements
        })
        
    except Exception as e:
        logger.error(f"Error in generate_specification: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to generate specification: {str(e)}'
        }), 500

# Repository analysis endpoint
@app.route('/api/repository/analyze', methods=['GET'])
def analyze_repository():
    try:
        repo_path = request.args.get('repo_path', '')
        if not repo_path or not os.path.exists(repo_path):
            return jsonify({'success': False, 'error': 'Invalid repository path'}), 400
        
        analysis = {
            'total_files': 0,
            'total_size': 0,
            'file_types': {},
            'languages': {},
            'structure': {}
        }
        
        for root, dirs, files in os.walk(repo_path):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    file_size = os.path.getsize(file_path)
                    analysis['total_files'] += 1
                    analysis['total_size'] += file_size
                    
                    # Count file extensions
                    ext = os.path.splitext(file)[1].lower()
                    if ext:
                        analysis['file_types'][ext] = analysis['file_types'].get(ext, 0) + 1
                    
                    # Basic language detection
                    language_map = {
                        '.py': 'Python',
                        '.js': 'JavaScript',
                        '.jsx': 'React',
                        '.ts': 'TypeScript',
                        '.tsx': 'React TypeScript',
                        '.java': 'Java',
                        '.cpp': 'C++',
                        '.c': 'C',
                        '.html': 'HTML',
                        '.css': 'CSS',
                        '.json': 'JSON'
                    }
                    
                    if ext in language_map:
                        lang = language_map[ext]
                        analysis['languages'][lang] = analysis['languages'].get(lang, 0) + 1
                        
                except Exception:
                    continue
        
        return jsonify({'success': True, 'analysis': analysis})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/log-frontend-error', methods=['POST'])
def log_frontend_error():
    """Log frontend errors to backend"""
    try:
        data = request.get_json()
        error_message = data.get('message', 'Unknown error')
        error_stack = data.get('stack', '')
        error_url = data.get('url', '')
        
        # Log the frontend error
        logger.error(f"Frontend Error: {error_message}")
        logger.error(f"URL: {error_url}")
        if error_stack:
            logger.error(f"Stack: {error_stack}")
        
        # Also log to the logging service
        logging_service.log_error(f"Frontend: {error_message}", {
            'stack': error_stack,
            'url': error_url,
            'source': 'frontend'
        })
        
        return jsonify({'success': True, 'message': 'Error logged successfully'})
        
    except Exception as e:
        logger.error(f"Error logging frontend error: {str(e)}")
        return jsonify({'error': 'Failed to log error'}), 500

# Graph API Routes
@app.route('/api/graph/nodes', methods=['GET', 'POST'])
def handle_graph_nodes():
    """Handle graph nodes - GET all nodes and edges, POST create/update node"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    if request.method == 'GET':
        try:
            graph_data = neo4j_service.get_all_nodes_and_edges()
            return jsonify({"success": True, "data": graph_data})
        except Exception as e:
            logger.error(f"Error getting graph nodes: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            node_data = request.json
            
            # Validate required fields
            if not node_data or 'id' not in node_data or 'name' not in node_data:
                return jsonify({"success": False, "error": "Node ID and name are required"}), 400
            
            created_node = neo4j_service.create_node(node_data)
            return jsonify({"success": True, "node": created_node})
        except Exception as e:
            logger.error(f"Error creating graph node: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/layers', methods=['GET', 'POST'])
def handle_custom_layers():
    """Handle layers - GET all layers, POST create new layer"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    if request.method == 'GET':
        try:
            all_layers = neo4j_service.get_all_layers()
            return jsonify({"success": True, "layers": all_layers})
        except Exception as e:
            logger.error(f"Error getting layers: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            layer_data = request.json
            
            # Validate required fields
            if not layer_data or 'name' not in layer_data:
                return jsonify({"success": False, "error": "Layer name is required"}), 400
            
            layer_name = layer_data['name'].strip()
            layer_description = layer_data.get('description', '')
            
            if not layer_name:
                return jsonify({"success": False, "error": "Layer name cannot be empty"}), 400
            
            # Check if layer already exists
            existing_layers = neo4j_service.get_all_layers()
            if layer_name in existing_layers:
                return jsonify({"success": False, "error": "Layer already exists"}), 400
            
            created_layer = neo4j_service.create_custom_layer(layer_name, layer_description)
            return jsonify({"success": True, "layer": created_layer})
        except Exception as e:
            logger.error(f"Error creating custom layer: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/edges', methods=['POST'])
def create_graph_edge():
    """Create an edge between two nodes"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        edge_data = request.json
        
        # Validate required fields
        if not edge_data or 'from_id' not in edge_data or 'to_id' not in edge_data:
            return jsonify({"success": False, "error": "from_id and to_id are required"}), 400
        
        from_id = edge_data['from_id']
        to_id = edge_data['to_id']
        relationship_type = edge_data.get('type', 'LINKED_TO')
        
        created_edge = neo4j_service.create_edge(from_id, to_id, relationship_type)
        return jsonify({"success": True, "edge": created_edge})
    except Exception as e:
        logger.error(f"Error creating graph edge: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/sample', methods=['POST'])
def populate_sample_graph():
    """Populate the graph with sample data"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        sample_data = neo4j_service.populate_sample_data()
        return jsonify({"success": True, "data": sample_data})
    except Exception as e:
        logger.error(f"Error populating sample data: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/nodes/<node_id>', methods=['DELETE'])
def delete_graph_node(node_id):
    """Delete a specific node"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        deleted = neo4j_service.delete_node(node_id)
        if deleted:
            return jsonify({"success": True, "message": "Node deleted successfully"})
        else:
            return jsonify({"success": False, "error": "Node not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting graph node: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/edges/<from_id>/<to_id>', methods=['DELETE'])
def delete_graph_edge(from_id, to_id):
    """Delete an edge between two nodes"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        relationship_type = request.args.get('type')
        deleted = neo4j_service.delete_edge(from_id, to_id, relationship_type)
        if deleted:
            return jsonify({"success": True, "message": "Edge deleted successfully"})
        else:
            return jsonify({"success": False, "error": "Edge not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting graph edge: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/edges', methods=['DELETE'])
def delete_graph_edge_json():
    """Delete an edge between two nodes using JSON body"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        data = request.json
        from_id = data.get('fromId')
        to_id = data.get('toId')
        edge_type = data.get('edgeType')
        
        if not from_id or not to_id:
            return jsonify({"success": False, "error": "fromId and toId are required"}), 400
        
        deleted = neo4j_service.delete_edge(from_id, to_id, edge_type)
        if deleted:
            return jsonify({"success": True, "message": "Edge deleted successfully"})
        else:
            return jsonify({"success": False, "error": "Edge not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting graph edge: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/layers/<layer_name>', methods=['DELETE'])
def delete_graph_layer(layer_name):
    """Delete all nodes in a specific layer"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        deleted_count = neo4j_service.delete_layer(layer_name)
        return jsonify({
            "success": True, 
            "message": f"Layer '{layer_name}' deleted successfully",
            "deleted_nodes": deleted_count
        })
    except Exception as e:
        logger.error(f"Error deleting graph layer: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/clear', methods=['POST'])
def clear_graph():
    """Clear all graph data"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        neo4j_service.clear_all_data()
        return jsonify({"success": True, "message": "All graph data cleared"})
    except Exception as e:
        logger.error(f"Error clearing graph data: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/test-connection/aws', methods=['POST'])
def test_aws_connection():
    """Test AWS Bedrock connection"""
    try:
        # Test the connection using the existing bedrock service
        success = bedrock_service.test_connection()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'AWS Bedrock connection successful',
                'model_id': bedrock_service.model_id,
                'region': os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
            })
        else:
            return jsonify({
                'success': False,
                'error': 'AWS Bedrock connection failed'
            })
            
    except Exception as e:
        logger.error(f"AWS connection test error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'AWS connection failed: {str(e)}'
        })

@app.route('/api/graph/save', methods=['POST'])
def save_graph():
    """Save current graph with a name and optional type"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        data = request.get_json()
        graph_name = data.get('graph_name')
        graph_type = data.get('graph_type', 'nfr')  # Default to 'nfr' for backward compatibility
        
        if not graph_name or not graph_name.strip():
            return jsonify({"success": False, "error": "Graph name is required"}), 400
        
        # Validate graph_type
        valid_types = ["nfr", "application_architecture"]
        if graph_type not in valid_types:
            return jsonify({
                "success": False, 
                "error": f"Invalid graph_type '{graph_type}'. Must be one of: {valid_types}"
            }), 400
        
        # Get current graph data
        graph_data = neo4j_service.get_all_nodes_and_edges()
        
        if not graph_data['nodes']:
            return jsonify({"success": False, "error": "No graph data to save"}), 400
        
        # Save the graph with type
        success = neo4j_service.save_graph(graph_name.strip(), graph_data, graph_type)
        
        if success:
            return jsonify({
                "success": True, 
                "message": f"Graph '{graph_name}' saved successfully as {graph_type}",
                "graph_type": graph_type,
                "nodes_count": len(graph_data['nodes']),
                "edges_count": len(graph_data['edges'])
            })
        else:
            return jsonify({"success": False, "error": "Failed to save graph"}), 500
            
    except ValueError as e:
        logger.error(f"Validation error saving graph: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error saving graph: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/saved', methods=['GET'])
def get_saved_graphs():
    """Get list of all saved graphs, optionally filtered by type"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        # Get optional graph_type filter from query parameters
        graph_type = request.args.get('graph_type')
        
        saved_graphs = neo4j_service.get_saved_graphs(graph_type)
        return jsonify({"success": True, "graphs": saved_graphs})
    except ValueError as e:
        logger.error(f"Validation error getting saved graphs: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error getting saved graphs: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/saved/<graph_name>/data', methods=['GET'])
def get_saved_graph_data(graph_name):
    """Get saved graph data without loading it into the main graph"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        graph_data = neo4j_service.get_saved_graph_data(graph_name)
        
        if graph_data:
            return jsonify({
                "success": True,
                "data": graph_data
            })
        else:
            return jsonify({"success": False, "error": f"Graph '{graph_name}' not found"}), 404
            
    except Exception as e:
        logger.error(f"Error getting saved graph data: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/load/<graph_name>', methods=['POST'])
def load_graph(graph_name):
    """Load a saved graph by name"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        # Clear current graph first
        neo4j_service.clear_all_data()
        
        # Load the saved graph
        success = neo4j_service.load_graph(graph_name)
        
        if success:
            # Get the loaded data to return
            graph_data = neo4j_service.get_all_nodes_and_edges()
            return jsonify({
                "success": True, 
                "message": f"Graph '{graph_name}' loaded successfully",
                "data": graph_data
            })
        else:
            return jsonify({"success": False, "error": f"Graph '{graph_name}' not found"}), 404
            
    except Exception as e:
        logger.error(f"Error loading graph: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/saved/<graph_name>', methods=['DELETE'])
def delete_saved_graph(graph_name):
    """Delete a saved graph by name"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        success = neo4j_service.delete_saved_graph(graph_name)
        
        if success:
            return jsonify({
                "success": True, 
                "message": f"Graph '{graph_name}' deleted successfully"
            })
        else:
            return jsonify({"success": False, "error": f"Graph '{graph_name}' not found"}), 404
            
    except Exception as e:
        logger.error(f"Error deleting saved graph: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/nodes/<node_id>', methods=['PUT'])
def update_graph_node(node_id):
    """Update a specific node"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        node_data = request.json
        
        # Validate required fields
        if not node_data or 'name' not in node_data:
            return jsonify({"success": False, "error": "Node name is required"}), 400
        
        updated_node = neo4j_service.update_node(node_id, node_data)
        return jsonify({"success": True, "node": updated_node})
    except Exception as e:
        logger.error(f"Error updating graph node: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/layers/<layer_name>', methods=['PUT'])
def update_graph_layer(layer_name):
    """Update a custom layer"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        layer_data = request.json
        
        if not layer_data or 'name' not in layer_data:
            return jsonify({"success": False, "error": "Layer name is required"}), 400
        
        updated_layer = neo4j_service.update_custom_layer(layer_name, layer_data)
        return jsonify({"success": True, "layer": updated_layer})
    except Exception as e:
        logger.error(f"Error updating layer: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/export', methods=['POST'])
def export_graph():
    """Export current graph data as JSON"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        # Get export options from request
        options = request.json or {}
        include_metadata = options.get('include_metadata', True)
        
        # Export graph data
        export_data = neo4j_service.export_graph_data(include_metadata=include_metadata)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"vibe_graph_export_{timestamp}.json"
        
        # Create response with proper headers for file download
        response = Response(
            json.dumps(export_data, indent=2, ensure_ascii=False),
            mimetype='application/json',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'application/json; charset=utf-8'
            }
        )
        
        logger.info(f"Graph exported successfully: {export_data['statistics']}")
        return response
        
    except Exception as e:
        logger.error(f"Error exporting graph: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/export/info', methods=['GET'])
def get_export_info():
    """Get information about what would be exported without actually exporting"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        # Get current graph data for statistics
        graph_data = neo4j_service.get_all_nodes_and_edges()
        custom_layers = neo4j_service.get_custom_layers()
        
        # Calculate statistics
        layer_stats = {}
        for node in graph_data['nodes']:
            layer = node['layer'] or 'Other'
            if layer not in layer_stats:
                layer_stats[layer] = {'nodes': 0, 'types': set()}
            layer_stats[layer]['nodes'] += 1
            layer_stats[layer]['types'].add(node['type'])
        
        # Convert sets to lists for JSON serialization
        for layer in layer_stats:
            layer_stats[layer]['types'] = list(layer_stats[layer]['types'])
        
        export_info = {
            'statistics': {
                'total_nodes': len(graph_data['nodes']),
                'total_edges': len(graph_data['edges']),
                'total_layers': len(set(node['layer'] for node in graph_data['nodes'] if node['layer'])),
                'custom_layers_count': len(custom_layers)
            },
            'layer_statistics': layer_stats,
            'relationship_types': list(set(edge['type'] for edge in graph_data['edges'])),
            'node_types': list(set(node['type'] for node in graph_data['nodes'])),
            'custom_layers': custom_layers
        }
        
        return jsonify({"success": True, "export_info": export_info})
        
    except Exception as e:
        logger.error(f"Error getting export info: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/import/validate', methods=['POST'])
def validate_import_data():
    """Validate import data without actually importing"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        # Handle both JSON data and file uploads
        import_data = None
        
        if request.is_json:
            # Direct JSON validation
            import_data = request.json
        else:
            # File upload validation
            if 'file' not in request.files:
                return jsonify({"success": False, "error": "No file provided"}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({"success": False, "error": "No file selected"}), 400
            
            # Parse JSON from uploaded file
            try:
                file_content = file.read().decode('utf-8')
                import_data = json.loads(file_content)
            except json.JSONDecodeError as e:
                return jsonify({"success": False, "error": f"Invalid JSON file: {str(e)}"}), 400
            except UnicodeDecodeError as e:
                return jsonify({"success": False, "error": f"File encoding error: {str(e)}"}), 400
        
        if not import_data:
            return jsonify({"success": False, "error": "No import data provided"}), 400
        
        # Validate the import data
        validation_result = neo4j_service.import_graph_data(
            import_data, 
            validate_only=True
        )
        
        return jsonify({
            "success": True, 
            "validation": validation_result
        })
        
    except Exception as e:
        logger.error(f"Error validating import data: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/import', methods=['POST'])
def import_graph():
    """Import graph data from JSON"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        # Handle both JSON data and file uploads
        import_data = None
        options = {}
        
        if request.is_json:
            # Direct JSON import
            request_data = request.json
            import_data = request_data.get('import_data')
            options = request_data.get('options', {})
        else:
            # File upload
            if 'file' not in request.files:
                return jsonify({"success": False, "error": "No file provided"}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({"success": False, "error": "No file selected"}), 400
            
            # Parse JSON from uploaded file
            try:
                file_content = file.read().decode('utf-8')
                import_data = json.loads(file_content)
            except json.JSONDecodeError as e:
                return jsonify({"success": False, "error": f"Invalid JSON file: {str(e)}"}), 400
            except UnicodeDecodeError as e:
                return jsonify({"success": False, "error": f"File encoding error: {str(e)}"}), 400
            
            # Get options from form data
            options = {
                'graph_name': request.form.get('graph_name'),
                'clear_existing': request.form.get('clear_existing', 'false').lower() == 'true'
            }
        
        if not import_data:
            return jsonify({"success": False, "error": "No import data provided"}), 400
        
        # Extract options
        graph_name = options.get('graph_name')
        clear_existing = options.get('clear_existing', False)
        
        # Import the graph data
        import_result = neo4j_service.import_graph_data(
            import_data,
            graph_name=graph_name,
            clear_existing=clear_existing
        )
        
        if import_result.get('success'):
            logger.info(f"Graph imported successfully: {import_result['statistics']}")
            return jsonify(import_result)
        else:
            return jsonify(import_result), 400
        
    except Exception as e:
        logger.error(f"Error importing graph: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/graph/saved/<graph_name>/type', methods=['PUT'])
def update_graph_type(graph_name):
    """Update the type of a saved graph"""
    if not neo4j_service or not neo4j_service.is_connected():
        return jsonify({"success": False, "error": "Neo4j service not available"}), 503
    
    try:
        data = request.get_json()
        new_graph_type = data.get('graph_type')
        
        if not new_graph_type:
            return jsonify({"success": False, "error": "graph_type is required"}), 400
        
        # Validate graph_type
        valid_types = ["nfr", "application_architecture"]
        if new_graph_type not in valid_types:
            return jsonify({
                "success": False, 
                "error": f"Invalid graph_type '{new_graph_type}'. Must be one of: {valid_types}"
            }), 400
        
        # Update the graph type in Neo4j
        with neo4j_service.driver.session() as session:
            # Check if graph exists
            check_query = """
            MATCH (sg:SavedGraph {name: $graph_name})
            RETURN count(sg) as count
            """
            result = session.run(check_query, {'graph_name': graph_name})
            if result.single()['count'] == 0:
                return jsonify({"success": False, "error": f"Graph '{graph_name}' not found"}), 404
            
            # Update the graph type
            update_query = """
            MATCH (sg:SavedGraph {name: $graph_name})
            SET sg.graph_type = $graph_type, sg.updated_at = datetime()
            RETURN sg
            """
            session.run(update_query, {
                'graph_name': graph_name,
                'graph_type': new_graph_type
            })
        
        logger.info(f"Graph '{graph_name}' type updated to '{new_graph_type}'")
        return jsonify({
            "success": True, 
            "message": f"Graph '{graph_name}' type updated to '{new_graph_type}'"
        })
        
    except ValueError as e:
        logger.error(f"Validation error updating graph type: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error updating graph type: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"success": False, "error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', 'localhost')
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    app.run(debug=debug, host=host, port=port) 