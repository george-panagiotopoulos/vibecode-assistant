import json
import os
import logging
from typing import Dict, Any, List
from config.env_loader import env_loader

logger = logging.getLogger(__name__)

class ConfigService:
    """Service for managing application configuration"""
    
    def __init__(self, config_file='config/user_config.json'):
        self.config_file = config_file
        self.env_file = '.env'
        # Force environment loading
        env_loader.ensure_loaded()
        self.ensure_config_file_exists()
    
    def ensure_config_file_exists(self):
        """Ensure the config file and directory exist"""
        try:
            # Create config directory if it doesn't exist
            config_dir = os.path.dirname(self.config_file)
            if config_dir and not os.path.exists(config_dir):
                os.makedirs(config_dir)
            
            # Create default config file if it doesn't exist
            if not os.path.exists(self.config_file):
                self._create_default_config()
                
        except Exception as e:
            logger.error(f"Error ensuring config file exists: {str(e)}")
    
    def _create_default_config(self):
        """Create a default configuration file"""
        default_config = {
            "non_functional_requirements": {
                "development": [
                    "Use TypeScript for type safety and better developer experience",
                    "Implement proper error handling with try-catch blocks and user feedback",
                    "Follow REST API conventions for endpoints and HTTP status codes",
                    "Include unit tests with at least 80% code coverage",
                    "Use responsive design principles for mobile compatibility",
                    "Implement proper input validation and sanitization",
                    "Follow security best practices (authentication, authorization, data protection)",
                    "Use meaningful variable and function names with clear documentation",
                    "Implement logging for debugging and monitoring purposes",
                    "Consider performance implications and optimize for speed"
                ],
                "refactoring": [
                    "Maintain existing functionality while improving code structure",
                    "Eliminate code duplication through proper abstraction",
                    "Improve variable and function naming for better readability",
                    "Extract complex logic into separate, testable functions",
                    "Optimize performance bottlenecks identified through profiling",
                    "Update and maintain comprehensive test coverage",
                    "Improve error handling and edge case management",
                    "Enhance documentation and inline comments",
                    "Follow consistent coding style and conventions",
                    "Consider backward compatibility when making changes"
                ],
                "testing": [
                    "Write comprehensive unit tests covering all functions and methods",
                    "Include integration tests for API endpoints and database interactions",
                    "Test edge cases, boundary conditions, and error scenarios",
                    "Use meaningful test descriptions that explain what is being tested",
                    "Implement mocking for external dependencies and services",
                    "Ensure tests are independent and can run in any order",
                    "Include performance tests for critical application paths",
                    "Test user interface components and user interactions",
                    "Validate data integrity and consistency in tests",
                    "Use code coverage tools to identify untested code paths"
                ]
            },
            "system_prompt": {
                "development": "You are an expert software developer with deep knowledge of modern web technologies, best practices, and design patterns. Focus on creating clean, maintainable, and scalable solutions.",
                "refactoring": "You are an expert code reviewer and software architect specializing in improving existing codebases. Focus on enhancing structure, performance, and maintainability while preserving functionality.",
                "testing": "You are an expert QA engineer and test automation specialist. Focus on comprehensive testing strategies, edge cases, and ensuring software quality and reliability."
            },
            "preferences": {
                "default_task_type": "development",
                "auto_enhance_prompts": True,
                "include_file_context": True,
                "max_file_size_kb": 1000,
                "auto_enhance": False,
                "include_file_content": True,
                "max_file_size": 100,
                "editor_theme": "light"
            }
        }
        
        try:
            with open(self.config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
            logger.info(f"Created default configuration file: {self.config_file}")
        except Exception as e:
            logger.error(f"Error creating default config: {str(e)}")
    
    def get_config(self) -> Dict[str, Any]:
        """Get the current configuration, merging user config with environment variables"""
        try:
            # FORCE environment reload
            env_loader.ensure_loaded()
            
            # Load user configuration
            with open(self.config_file, 'r') as f:
                config = json.load(f)
            
            # ADD AWS and GitHub sections from environment variables ONLY
            config['aws'] = {
                'access_key_id': env_loader.get_env('AWS_ACCESS_KEY_ID', ''),
                'secret_access_key': env_loader.get_env('AWS_SECRET_ACCESS_KEY', ''),
                'region': env_loader.get_env('AWS_DEFAULT_REGION', 'us-east-1'),
                'model_id': env_loader.get_env('AWS_BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20240620-v1:0')
            }
            
            config['github'] = {
                'token': env_loader.get_env('GITHUB_TOKEN', ''),
                'default_repo': env_loader.get_env('GITHUB_DEFAULT_REPO', '')
            }
            
            config['neo4j'] = {
                'uri': env_loader.get_env('NEO4J_URI', 'bolt://localhost:7687'),
                'username': env_loader.get_env('NEO4J_USERNAME', 'neo4j'),
                'password': env_loader.get_env('NEO4J_PASSWORD', 'vibeassistant')
            }
            
            # LOG what we're returning
            logger.debug(f"Config loaded - GitHub repo: {config['github']['default_repo']}")
            logger.debug(f"Config loaded - AWS key set: {bool(config['aws']['access_key_id'])}")
            logger.debug(f"Config loaded - Neo4j URI: {config['neo4j']['uri']}")
            
            return config
        except FileNotFoundError:
            logger.warning("Config file not found, creating default")
            self._create_default_config()
            return self.get_config()
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing config file: {str(e)}")
            raise Exception("Configuration file is corrupted")
        except Exception as e:
            logger.error(f"Error reading config: {str(e)}")
            raise Exception(f"Failed to read configuration: {str(e)}")
    
    def update_config(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update configuration with new values and save to .env file"""
        try:
            # Handle environment variable updates
            env_updates = {}
            
            # Extract AWS config for .env
            if 'aws' in updates:
                aws_config = updates['aws']
                if 'access_key_id' in aws_config:
                    env_updates['AWS_ACCESS_KEY_ID'] = aws_config['access_key_id']
                if 'secret_access_key' in aws_config:
                    env_updates['AWS_SECRET_ACCESS_KEY'] = aws_config['secret_access_key']
                if 'region' in aws_config:
                    env_updates['AWS_DEFAULT_REGION'] = aws_config['region']
                if 'model_id' in aws_config:
                    env_updates['AWS_BEDROCK_MODEL_ID'] = aws_config['model_id']
            
            # Extract GitHub config for .env
            if 'github' in updates:
                github_config = updates['github']
                if 'token' in github_config:
                    env_updates['GITHUB_TOKEN'] = github_config['token']
                if 'default_repo' in github_config:
                    env_updates['GITHUB_DEFAULT_REPO'] = github_config['default_repo']
            
            # Extract Neo4j config for .env
            if 'neo4j' in updates:
                neo4j_config = updates['neo4j']
                if 'uri' in neo4j_config:
                    env_updates['NEO4J_URI'] = neo4j_config['uri']
                if 'username' in neo4j_config:
                    env_updates['NEO4J_USERNAME'] = neo4j_config['username']
                if 'password' in neo4j_config:
                    env_updates['NEO4J_PASSWORD'] = neo4j_config['password']
            
            # Update .env file
            if env_updates:
                self._update_env_file(env_updates)
            
            # Load current config from file (without env overrides)
            with open(self.config_file, 'r') as f:
                config = json.load(f)
            
            # Remove AWS, GitHub, and Neo4j from updates as they go to .env
            filtered_updates = {k: v for k, v in updates.items() if k not in ['aws', 'github', 'neo4j']}
            
            # Deep merge the remaining updates
            if filtered_updates:
                config = self._deep_merge(config, filtered_updates)
                
                # Save updated config to file
                with open(self.config_file, 'w') as f:
                    json.dump(config, f, indent=2)
            
            logger.info("Configuration updated successfully")
            
            # Force reload environment variables
            env_loader.ensure_loaded()
            
            # Return the merged config with environment variables
            return self.get_config()
            
        except Exception as e:
            logger.error(f"Error updating config: {str(e)}")
            raise Exception(f"Failed to update configuration: {str(e)}")
    
    def _update_env_file(self, env_updates: Dict[str, str]):
        """Update the .env file with new environment variables"""
        try:
            # Read existing .env file
            env_vars = {}
            if os.path.exists(self.env_file):
                with open(self.env_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            env_vars[key] = value
            
            # Update with new values
            env_vars.update(env_updates)
            
            # Write back to .env file
            with open(self.env_file, 'w') as f:
                for key, value in env_vars.items():
                    f.write(f"{key}={value}\n")
            
            logger.info(f"Updated .env file with {len(env_updates)} variables")
            
        except Exception as e:
            logger.error(f"Error updating .env file: {str(e)}")
            raise Exception(f"Failed to update .env file: {str(e)}")
    
    def _deep_merge(self, base: Dict, updates: Dict) -> Dict:
        """Deep merge two dictionaries"""
        result = base.copy()
        
        for key, value in updates.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def get_requirements(self, task_type: str = None) -> Dict[str, List[str]]:
        """
        Get non-functional requirements - Updated to remove task_type dependency
        
        Returns:
            Dict containing all available requirements
        """
        config = self.get_config()
        requirements = config.get('non_functional_requirements', {})
        
        # Return all requirements without task_type filtering
        return requirements

    def update_requirements(self, requirements: List[str]) -> Dict[str, List[str]]:
        """
        Update non-functional requirements - Updated to remove task_type dependency
        
        Args:
            requirements: List of requirements to store
            
        Returns:
            Dict containing updated requirements
        """
        config = self.get_config()
        
        # Store requirements in a general category
        if 'non_functional_requirements' not in config:
            config['non_functional_requirements'] = {}
        
        config['non_functional_requirements']['general'] = requirements
        
        self.update_config(config)
        
        logger.info(f"Requirements updated: {len(requirements)} items")
        
        return config['non_functional_requirements']
    
    def get_system_prompt(self, enhancement_type: str = 'enhanced_prompt') -> str:
        """
        Get system prompt for enhancement type - Updated to use enhancement_type instead of task_type
        
        Args:
            enhancement_type: Type of enhancement (full_specification, enhanced_prompt, rephrase)
            
        Returns:
            System prompt string
        """
        config = self.get_config()
        system_prompts = config.get('system_prompts', {})
        return system_prompts.get(enhancement_type, system_prompts.get('default', ''))
    
    def update_system_prompt(self, enhancement_type: str, prompt: str) -> None:
        """
        Update system prompt for enhancement type - Updated to use enhancement_type instead of task_type
        
        Args:
            enhancement_type: Type of enhancement
            prompt: New system prompt
        """
        config = self.get_config()
        
        if 'system_prompts' not in config:
            config['system_prompts'] = {}
        
        config['system_prompts'][enhancement_type] = prompt
        
        self.update_config(config)
        
        logger.info(f"System prompt updated for enhancement type: {enhancement_type}")
    
    def get_github_config(self) -> Dict[str, str]:
        """Get GitHub configuration"""
        try:
            config = self.get_config()
            return config.get('github', {})
        except Exception as e:
            logger.error(f"Error getting GitHub config: {str(e)}")
            return {}
    
    def get_aws_config(self) -> Dict[str, str]:
        """Get AWS configuration"""
        try:
            config = self.get_config()
            return config.get('aws', {})
        except Exception as e:
            logger.error(f"Error getting AWS config: {str(e)}")
            return {}
    
    def validate_config(self) -> Dict[str, Any]:
        """Validate the current configuration - Updated to remove task_type dependencies"""
        try:
            config = self.get_config()
            validation_result = {
                'is_valid': True,
                'errors': [],
                'warnings': []
            }
            
            # Check GitHub config
            github_config = config.get('github', {})
            if not github_config.get('token'):
                validation_result['warnings'].append("GitHub token not configured")
            
            # Check AWS config
            aws_config = config.get('aws', {})
            if not aws_config.get('access_key_id') or not aws_config.get('secret_access_key'):
                validation_result['errors'].append("AWS credentials not configured")
                validation_result['is_valid'] = False
            
            # Check enhancement types configuration
            system_prompts = config.get('system_prompts', {})
            required_enhancement_types = ['full_specification', 'enhanced_prompt', 'rephrase']
            for enhancement_type in required_enhancement_types:
                if enhancement_type not in system_prompts:
                    validation_result['warnings'].append(f"No system prompt defined for {enhancement_type}")
            
            # Check non-functional requirements (general validation)
            requirements = config.get('non_functional_requirements', {})
            if not requirements:
                validation_result['warnings'].append("No non-functional requirements configured")
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Error validating config: {str(e)}")
            return {
                'is_valid': False,
                'errors': [f"Configuration validation failed: {str(e)}"],
                'warnings': []
            }
    
    def export_config(self) -> str:
        """Export configuration as JSON string"""
        try:
            config = self.get_config()
            # Remove sensitive information for export
            export_config = config.copy()
            if 'github' in export_config and 'token' in export_config['github']:
                export_config['github']['token'] = '***HIDDEN***'
            if 'aws' in export_config:
                if 'access_key_id' in export_config['aws']:
                    export_config['aws']['access_key_id'] = '***HIDDEN***'
                if 'secret_access_key' in export_config['aws']:
                    export_config['aws']['secret_access_key'] = '***HIDDEN***'
            
            return json.dumps(export_config, indent=2)
            
        except Exception as e:
            logger.error(f"Error exporting config: {str(e)}")
            raise Exception(f"Failed to export configuration: {str(e)}")
    
    def backup_config(self) -> str:
        """Create a backup of the current configuration"""
        try:
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"{self.config_file}.backup_{timestamp}"
            
            config = self.get_config()
            with open(backup_filename, 'w') as f:
                json.dump(config, f, indent=2)
            
            logger.info(f"Configuration backed up to: {backup_filename}")
            return backup_filename
            
        except Exception as e:
            logger.error(f"Error backing up config: {str(e)}")
            raise Exception(f"Failed to backup configuration: {str(e)}")
    
    def get_neo4j_config(self) -> Dict[str, str]:
        """Get Neo4j configuration"""
        return {
            'uri': env_loader.get_env('NEO4J_URI', 'bolt://localhost:7687'),
            'username': env_loader.get_env('NEO4J_USERNAME', 'neo4j'),
            'password': env_loader.get_env('NEO4J_PASSWORD', 'vibeassistant')
        } 