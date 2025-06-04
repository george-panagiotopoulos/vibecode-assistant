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
        Updated to remove unused task_contexts and legacy system_prompts.
        """
        return {
            "system_prompts": {
                "default": "You are an expert AI coding assistant. Provide detailed, actionable specifications for coding projects.",
                "full_specification": "You are an expert business analyst and technical architect specializing in comprehensive project planning. Create detailed functional and non-functional specifications with complete task breakdowns. Your specifications should include clear business benefits, detailed task lists, and proper testing phases.",
                "enhanced_prompt": "You are an expert AI coding assistant specializing in structured implementation planning. Create clear 8-12 step implementation plans where each step includes both functional and non-functional requirements. Focus on actionable steps with clear requirement alignment.",
                "rephrase": "You are an expert technical writer specializing in prompt optimization. Your task is to rephrase user input to make it more concise, clear, and effective for LLM processing while preserving the original intent and requirements."
            },
            
            "enhancement_instructions": {
                "full_specification": {
                    "title": "FULL SPECIFICATION REQUEST",
                    "description": "Create a comprehensive functional and non-functional specification with detailed task planning.",
                    "requirements": [
                        "Start with a detailed description of the task including goals and business benefits",
                        "Create a comprehensive list of tasks needed to complete the project",
                        "If there are more than 10 tasks, organize them into logical task groups",
                        "Add one round of testing at the end of each task group",
                        "Each task should include relevant functional and non-functional requirements",
                        "Consider all inputs: user requirements, non-functional requirements, selected files, and architecture context"
                    ]
                },
                "enhanced_prompt": {
                    "title": "ENHANCED IMPLEMENTATION PLAN",
                    "description": "Create a structured 8-12 step implementation plan.",
                    "requirements": [
                        "Provide exactly 8-12 implementation steps",
                        "Each step must include both functional and non-functional requirements",
                        "Clearly outline requirements relevant to each specific step",
                        "Place any transversal non-functional requirements at the end",
                        "Structure as a numbered list with clear step descriptions",
                        "Consider all inputs: user requirements, non-functional requirements, selected files, and architecture context"
                    ]
                },
                "rephrase": {
                    "title": "PROMPT OPTIMIZATION",
                    "description": "Rephrase the user input to make it more concise and effective for LLM processing.",
                    "requirements": [
                        "Make the language more concise and clear",
                        "Preserve the original intent and all requirements",
                        "Optimize for LLM understanding and processing",
                        "Do not add new instructions or split into tasks",
                        "Focus only on improving clarity and conciseness"
                    ]
                }
            },
            
            "validation_rules": {
                "min_prompt_length": 10,
                "max_file_display": 10,
                "max_components_per_layer": 10,
                "max_total_components": 50,
                "complexity_thresholds": {
                    "low": 150,
                    "medium": 300,
                    "high": 500
                }
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
        Get validation rule value.
        
        Args:
            rule_name: Name of the validation rule
            
        Returns:
            Rule value or None if not found
        """
        validation_rules = self.config.get("validation_rules", {})
        return validation_rules.get(rule_name)
    
    def format_enhancement_instructions(self, enhancement_type: str, task_type: str) -> str:
        """
        Format enhancement instructions for a specific enhancement type and task type.
        
        Args:
            enhancement_type: Type of enhancement (full_specification, enhanced_prompt, rephrase)
            task_type: Type of task (development, refactoring, testing)
            
        Returns:
            Formatted enhancement instructions string
        """
        try:
            # Map legacy enhancement types to new ones
            mapped_type = self._map_enhancement_type(enhancement_type)
            
            enhancement_config = self.config.get('enhancement_instructions', {}).get(mapped_type, {})
            
            if not enhancement_config:
                logger.warning(f"No enhancement instructions found for type: {mapped_type}")
                enhancement_config = self.config.get('enhancement_instructions', {}).get('default', {})
            
            # Build the instructions
            instructions = []
            
            # Title
            title = enhancement_config.get('title', 'ENHANCEMENT INSTRUCTIONS')
            instructions.append(f"## {title}")
            instructions.append("")
            
            # Description with task type substitution
            description = enhancement_config.get('description', '')
            if '{task_type}' in description:
                description = description.replace('{task_type}', task_type)
            instructions.append(description)
            instructions.append("")
            
            # Requirements
            requirements = enhancement_config.get('requirements', [])
            if requirements:
                instructions.append("### Requirements:")
                for req in requirements:
                    instructions.append(f"- {req}")
                instructions.append("")
            
            # Structure (for full_specification and enhanced_prompt)
            structure = enhancement_config.get('structure', [])
            if structure:
                instructions.append("### Structure:")
                for item in structure:
                    instructions.append(f"- {item}")
                instructions.append("")
            
            # Output format (for rephrase)
            output_format = enhancement_config.get('output_format', [])
            if output_format:
                instructions.append("### Output Format:")
                for item in output_format:
                    instructions.append(f"- {item}")
                instructions.append("")
            
            # Important note
            important_note = enhancement_config.get('important_note', '')
            if important_note:
                instructions.append(f"**Important:** {important_note}")
                instructions.append("")
            
            # Add task guidelines
            task_guidelines = self.get_task_guidelines(task_type)
            if task_guidelines:
                instructions.append("### Task Guidelines:")
                for guideline in task_guidelines:
                    instructions.append(f"- {guideline}")
                instructions.append("")
            
            return "\n".join(instructions)
            
        except Exception as e:
            logger.error(f"Error formatting enhancement instructions: {str(e)}")
            return self._get_fallback_enhancement_instructions(enhancement_type, task_type)

    def _map_enhancement_type(self, enhancement_type: str) -> str:
        """Map legacy enhancement types to new ones for backward compatibility"""
        mapping = {
            'maximum_detail': 'full_specification',
            'balanced': 'enhanced_prompt',
            'key_requirements': 'rephrase'
        }
        return mapping.get(enhancement_type, enhancement_type)

    def _get_fallback_enhancement_instructions(self, enhancement_type: str, task_type: str) -> str:
        """Provide fallback enhancement instructions if config loading fails"""
        mapped_type = self._map_enhancement_type(enhancement_type)
        
        if mapped_type == 'full_specification':
            return f"""## FULL SPECIFICATION REQUEST

Create a comprehensive functional and non-functional specification with detailed task planning for this {task_type} project.

### Requirements:
- Start with a detailed description of the task including goals and business benefits
- Create a comprehensive list of tasks needed to complete the project
- If there are more than 10 tasks, organize them into logical task groups
- Add one round of testing at the end of each task group
- Each task should include relevant functional and non-functional requirements

**Important:** Provide a complete specification that serves as a comprehensive project plan with clear business value and detailed implementation roadmap.
"""
        elif mapped_type == 'enhanced_prompt':
            return f"""## ENHANCED IMPLEMENTATION PLAN

Create a structured 8-12 step implementation plan for this {task_type} project.

### Requirements:
- Provide exactly 8-12 implementation steps
- Each step must include both functional and non-functional requirements
- Clearly outline requirements relevant to each specific step
- Place any transversal non-functional requirements at the end

**Important:** Focus on creating a balanced implementation plan that clearly maps requirements to specific implementation steps.
"""
        elif mapped_type == 'rephrase':
            return f"""## PROMPT OPTIMIZATION

Rephrase the user input to make it more concise and effective for LLM processing.

### Requirements:
- Make the language more concise and clear
- Preserve the original intent and all requirements
- Optimize for LLM understanding and processing
- Do not add new instructions or split into tasks

**Important:** Only rephrase for clarity and conciseness. Do not add implementation details, steps, or additional instructions.
"""
        else:
            return f"""## ENHANCEMENT INSTRUCTIONS

Transform the above user request into a comprehensive specification for this {task_type} project.

### Requirements:
- Provide clear, actionable guidance
- Consider all provided context and requirements
- Structure the response appropriately for the task type

**Important:** Provide detailed, actionable specifications that serve as a complete guide.
"""
    
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
        Updated to reflect the removal of task_contexts and focus on enhancement types.
        
        Returns:
            Dict containing configuration status and statistics
        """
        try:
            return {
                "config_loaded": bool(self.config),
                "config_path": str(self.config_path),
                "config_exists": self.config_path.exists(),
                "system_prompts_count": len(self.config.get("system_prompts", {})),
                "enhancement_instructions_count": len(self.config.get("enhancement_instructions", {})),
                "validation_rules_count": len(self.config.get("validation_rules", {})),
                "file_patterns_count": len(self.config.get("file_patterns", {}).get("extensions", [])),
                "available_enhancement_types": list(self.config.get("enhancement_instructions", {}).keys()),
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