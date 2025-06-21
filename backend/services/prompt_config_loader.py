import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class PromptConfigLoader:
    """
    Utility class for loading and managing prompt configuration from JSON file.
    Provides a clean interface for accessing configuration data with fallbacks.
    """
    
    def __init__(self, config_path: str = None):
        """
        Initialize the configuration loader.
        
        Args:
            config_path: Path to the configuration file. If None, uses default path.
        """
        if config_path is None:
            # Default path relative to the backend directory
            current_dir = Path(__file__).parent.parent.parent
            config_path = current_dir / "config" / "prompt_config.json"
        
        self.config_path = Path(config_path)
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from JSON file with error handling."""
        try:
            if not self.config_path.exists():
                logger.warning(f"Configuration file not found: {self.config_path}")
                return self._get_fallback_config()
            
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                logger.info(f"Successfully loaded configuration from {self.config_path}")
                return config
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in configuration file: {e}")
            return self._get_fallback_config()
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            return self._get_fallback_config()
    
    def _get_fallback_config(self) -> Dict[str, Any]:
        """
        Provide a minimal fallback configuration if loading fails.
        Updated to remove unused enhancement_instructions and focus on system_prompts.
        """
        return {
            "system_prompts": {
                "default": "You are an expert AI coding assistant. Provide detailed, actionable specifications for coding projects.",
                "full_specification": "You are an expert business analyst and technical architect specializing in comprehensive project planning. Create detailed functional and non-functional specifications with complete task breakdowns. Your specifications should include clear business benefits, detailed task lists, and proper testing phases.",
                "enhanced_prompt": "You are an expert AI coding assistant specializing in structured implementation planning. Create clear 8-12 step implementation plans where each step includes both functional and non-functional requirements. Focus on actionable steps with clear requirement alignment.",
                "rephrase": "You are an expert technical writer specializing in prompt optimization. Your task is to rephrase user input to make it more concise, clear, and effective for LLM processing while preserving the original intent and requirements."
            },
            
            "validation_rules": {
                "min_prompt_length": 10,
                "max_file_display": 10,
                "max_components_per_layer": 10,
                "max_total_components": 50
            },
            
            "file_patterns": {
                "extensions": [
                    "py", "js", "ts", "tsx", "java", "cpp", "c", "h", "hpp",
                    "css", "scss", "html", "json", "xml", "yaml", "yml"
                ],
                "regex_patterns": [
                    "`([^`]+\\.[a-zA-Z0-9]+)`",
                    "([a-zA-Z0-9_/.-]+\\.[a-zA-Z0-9]+)",
                    "(\\w+\\.py)",
                    "(\\w+\\.js)",
                    "(\\w+\\.tsx?)",
                    "(\\w+\\.java)"
                ]
            }
        }

    def get_system_prompt(self, prompt_type: str = "default") -> str:
        """
        Get system prompt by type.
        Updated to work with the new enhancement-focused system prompts.
        
        Args:
            prompt_type: Type of prompt (default, full_specification, enhanced_prompt, rephrase)
            
        Returns:
            System prompt string
        """
        try:
            system_prompts = self.config.get("system_prompts", {})
            return system_prompts.get(prompt_type, system_prompts.get("default", "You are an expert AI coding assistant."))
        except Exception as e:
            logger.error(f"Error getting system prompt for type '{prompt_type}': {str(e)}")
            return "You are an expert AI coding assistant."

    def get_task_context(self, task_type: str) -> str:
        """
        Get task context - deprecated but maintained for backward compatibility.
        Returns empty string as task contexts have been removed.
        
        Args:
            task_type: Type of task (no longer used)
            
        Returns:
            Empty string (task contexts removed)
        """
        logger.warning("get_task_context is deprecated - task contexts have been removed from the system")
        return ""

    def get_task_guidelines(self, task_type: str) -> List[str]:
        """
        Get task guidelines - deprecated but maintained for backward compatibility.
        Returns empty list as task guidelines have been removed.
        
        Args:
            task_type: Type of task (no longer used)
            
        Returns:
            Empty list (task guidelines removed)
        """
        logger.warning("get_task_guidelines is deprecated - task guidelines have been removed from the system")
        return []
    
    def get_architecture_guidelines(self) -> List[str]:
        """
        Get architecture-specific guidelines.
        
        Returns:
            List of architecture guideline strings
        """
        return self.config.get("architecture_guidelines", [])
    
    def get_validation_rule(self, rule_name: str) -> Any:
        """
        Get validation rule by name.
        
        Args:
            rule_name: Name of the validation rule
            
        Returns:
            Rule value or None if not found
        """
        validation_rules = self.config.get("validation_rules", {})
        return validation_rules.get(rule_name)
    
    def get_prompt_template(self, template_name: str) -> str:
        """
        Get prompt template by name.
        
        Args:
            template_name: Name of the template
            
        Returns:
            Template string
        """
        prompt_templates = self.config.get("prompt_templates", {})
        return prompt_templates.get(template_name, "")
    
    def get_file_patterns(self) -> Dict[str, List[str]]:
        """
        Get file patterns for file detection.
        
        Returns:
            Dictionary containing file extensions and regex patterns
        """
        return self.config.get("file_patterns", {
            "extensions": ["py", "js", "ts", "java", "cpp"],
            "regex_patterns": []
        })
    
    def reload_config(self) -> bool:
        """
        Reload configuration from file.
        
        Returns:
            True if reload was successful, False otherwise
        """
        try:
            self.config = self._load_config()
            logger.info("Configuration reloaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to reload configuration: {e}")
            return False
    
    def get_config_status(self) -> Dict[str, Any]:
        """
        Get comprehensive status information about the configuration.
        Updated to reflect the removal of enhancement_instructions and focus on system_prompts.
        
        Returns:
            Dict containing configuration status and statistics
        """
        try:
            return {
                "config_loaded": bool(self.config),
                "config_path": str(self.config_path),
                "config_exists": self.config_path.exists(),
                "system_prompts_count": len(self.config.get("system_prompts", {})),
                "validation_rules_count": len(self.config.get("validation_rules", {})),
                "file_patterns_count": len(self.config.get("file_patterns", {}).get("extensions", [])),
                "available_system_prompts": list(self.config.get("system_prompts", {}).keys()),
                "architecture_aware": True,
                "dynamic_prompts_enabled": True,
                "last_loaded": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting config status: {str(e)}")
            return {
                "config_loaded": False,
                "error": str(e),
                "last_loaded": datetime.now().isoformat()
            } 