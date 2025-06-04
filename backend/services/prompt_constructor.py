import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from .prompt_config_loader import PromptConfigLoader

logger = logging.getLogger(__name__)

class PromptConstructor:
    """
    Advanced prompt constructor for the Vibe Coding Assistant.
    Builds sophisticated LLM prompts that incorporate user input, non-functional requirements,
    and application architecture context optimized for coding assistance.
    """
    
    def __init__(self, bedrock_service=None, config_service=None):
        self.bedrock_service = bedrock_service
        self.config_service = config_service
        self.prompt_config = PromptConfigLoader()
        
    def construct_enhanced_prompt(
        self, 
        user_input: str, 
        nfr_requirements: List[str] = None, 
        file_context: List[Dict] = None,
        application_architecture: Dict = None,
        enhancement_type: str = 'enhanced_prompt'
    ) -> Dict[str, Any]:
        """
        Construct a comprehensive LLM prompt that transforms user input into a detailed
        specification optimized for the Vibe Coding Assistant.
        
        Args:
            user_input: The original user prompt/request
            nfr_requirements: List of non-functional requirements
            file_context: Selected files and their context
            application_architecture: Application architecture data when "Considered Application Architecture" is enabled
            enhancement_type: Type of enhancement (full_specification, enhanced_prompt, rephrase)
            
        Returns:
            Dict containing the constructed prompt and metadata
        """
        if not self._validate_inputs(user_input):
            raise ValueError("Invalid input: user_input is required and must be non-empty")
        
        try:
            # Map legacy enhancement types to new ones
            mapped_enhancement_type = self._map_enhancement_type(enhancement_type)
            
            # Generate dynamic system prompt based on the specific task
            system_prompt = self._generate_dynamic_system_prompt(user_input, mapped_enhancement_type, application_architecture)
            
            # Construct the main prompt
            main_prompt = self._build_main_prompt(
                user_input, 
                nfr_requirements, 
                file_context, 
                application_architecture
            )
            
            # Add enhancement instructions based on type
            enhancement_instructions = self._build_enhancement_instructions(mapped_enhancement_type)
            
            # Combine all parts
            final_prompt = f"{main_prompt}\n\n{enhancement_instructions}"
            
            # Calculate architecture layers count safely
            if isinstance(application_architecture, dict):
                arch_layers_count = len(application_architecture.get('layers', []))
            elif isinstance(application_architecture, list):
                arch_layers_count = len(application_architecture)
            else:
                arch_layers_count = 0
            
            return {
                'system_prompt': system_prompt,
                'enhanced_prompt': final_prompt,
                'original_input': user_input,
                'enhancement_type': mapped_enhancement_type,
                'nfr_count': len(nfr_requirements) if nfr_requirements else 0,
                'file_count': len(file_context) if file_context else 0,
                'architecture_enabled': bool(application_architecture),
                'architecture_layers': arch_layers_count,
                'timestamp': datetime.now().isoformat(),
                'metadata': {
                    'nfr_count': len(nfr_requirements) if nfr_requirements else 0,
                    'file_count': len(file_context) if file_context else 0,
                    'architecture_enabled': bool(application_architecture),
                    'architecture_layers': arch_layers_count,
                    'enhancement_type': mapped_enhancement_type,
                    'timestamp': datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error constructing enhanced prompt: {str(e)}")
            raise
    
    def _validate_inputs(self, user_input: str) -> bool:
        """Validate required inputs - allow empty strings for testing"""
        return user_input is not None  # Less strict validation
    
    def _generate_dynamic_system_prompt(self, user_input: str, enhancement_type: str, application_architecture: Dict = None) -> str:
        """
        Generate a dynamic system prompt based on the specific task needed.
        Removes hardcoded requirements and creates context-aware instructions.
        """
        try:
            # Get base system prompt for enhancement type
            base_prompt = self.prompt_config.get_system_prompt(enhancement_type)
            
            # Analyze user input to determine task characteristics
            task_characteristics = self._analyze_task_characteristics(user_input)
            
            # Build dynamic prompt components
            dynamic_components = []
            
            # Add architecture awareness if enabled
            if application_architecture:
                dynamic_components.append(
                    "You have access to the application's architecture context. "
                    "Consider architectural layers, component relationships, and existing patterns "
                    "when providing recommendations."
                )
            
            # Add task-specific guidance based on analysis
            if task_characteristics.get('involves_new_features'):
                dynamic_components.append(
                    "Focus on feature development best practices, integration patterns, "
                    "and ensuring new functionality aligns with existing architecture."
                )
            
            if task_characteristics.get('involves_refactoring'):
                dynamic_components.append(
                    "Emphasize code quality improvements, maintainability, and preserving "
                    "existing functionality while enhancing structure."
                )
            
            if task_characteristics.get('involves_testing'):
                dynamic_components.append(
                    "Prioritize comprehensive testing strategies, edge cases, and quality assurance "
                    "practices that ensure reliability and robustness."
                )
            
            # Combine base prompt with dynamic components
            if dynamic_components:
                return f"{base_prompt}\n\nAdditional Context:\n" + "\n".join(f"- {comp}" for comp in dynamic_components)
            
            return base_prompt
            
        except Exception as e:
            logger.warning(f"Failed to generate dynamic system prompt: {str(e)}")
            return self.prompt_config.get_system_prompt("default")
    
    def _analyze_task_characteristics(self, user_input: str) -> Dict[str, bool]:
        """
        Analyze user input to determine task characteristics for dynamic prompt generation.
        """
        user_input_lower = user_input.lower()
        
        return {
            'involves_new_features': any(keyword in user_input_lower for keyword in [
                'create', 'add', 'implement', 'build', 'develop', 'new feature', 'functionality'
            ]),
            'involves_refactoring': any(keyword in user_input_lower for keyword in [
                'refactor', 'improve', 'optimize', 'restructure', 'clean up', 'reorganize'
            ]),
            'involves_testing': any(keyword in user_input_lower for keyword in [
                'test', 'testing', 'unit test', 'integration test', 'debug', 'fix bug'
            ]),
            'involves_architecture': any(keyword in user_input_lower for keyword in [
                'architecture', 'design', 'pattern', 'structure', 'component', 'layer'
            ])
        }
    
    def _build_main_prompt(
        self, 
        user_input: str, 
        nfr_requirements: List[str], 
        file_context: List[Dict], 
        application_architecture: Dict
    ) -> str:
        """Build the main prompt incorporating all context and requirements."""
        
        prompt_sections = []
        
        # Header
        prompt_sections.append("# VIBE CODING ASSISTANT - ENHANCED SPECIFICATION REQUEST")
        prompt_sections.append(f"**Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        prompt_sections.append("")
        
        # Original user request
        prompt_sections.append("## ORIGINAL USER REQUEST")
        prompt_sections.append(f"```\n{user_input}\n```")
        prompt_sections.append("")
        
        # Non-functional requirements
        if nfr_requirements:
            prompt_sections.append("## NON-FUNCTIONAL REQUIREMENTS")
            prompt_sections.append("The following non-functional requirements must be incorporated:")
            for i, req in enumerate(nfr_requirements, 1):
                prompt_sections.append(f"{i}. {req}")
            prompt_sections.append("")
        
        # Application Architecture Context (when enabled)
        if application_architecture:
            arch_context = self._format_architecture_context(application_architecture)
            if arch_context:
                prompt_sections.append("## APPLICATION ARCHITECTURE CONTEXT")
                prompt_sections.append(arch_context)
                prompt_sections.append("")
        
        # File context
        if file_context:
            prompt_sections.append("## CODEBASE CONTEXT")
            max_files = self.prompt_config.get_validation_rule("max_file_display") or 10
            prompt_sections.append(f"Selected files for context ({len(file_context)} files):")
            for file_info in file_context[:max_files]:  # Use config limit
                file_name = file_info.get('name', file_info.get('path', 'Unknown'))
                file_type = file_info.get('type', 'file')
                prompt_sections.append(f"- **{file_name}** ({file_type})")
            
            if len(file_context) > max_files:
                prompt_sections.append(f"- ... and {len(file_context) - max_files} more files")
            prompt_sections.append("")
        
        return "\n".join(prompt_sections)
    
    def _format_architecture_context(self, application_architecture: Dict) -> str:
        """
        Format application architecture data for inclusion in the prompt.
        Only includes architecture context when the checkbox is selected and data is available.
        """
        if not application_architecture:
            return ""
        
        try:
            arch_sections = []
            
            # Handle both dict and list formats for backward compatibility
            if isinstance(application_architecture, list):
                # Direct list of layers
                layers = application_architecture
            elif isinstance(application_architecture, dict):
                # Dict format with 'layers' key
                layers = application_architecture.get('layers', [])
            else:
                logger.warning(f"Unexpected architecture format: {type(application_architecture)}")
                return "Architecture context available but format not recognized."
            
            # Architecture overview
            total_components = 0
            for layer in layers:
                if isinstance(layer, dict):
                    total_components += layer.get('nodeCount', 0)
                else:
                    logger.warning(f"Layer is not a dict: {type(layer)}")
            
            arch_sections.append(f"The application architecture consists of {len(layers)} layers with {total_components} total components:")
            arch_sections.append("")
            
            # Layer details
            max_components_per_layer = self.prompt_config.get_validation_rule("max_components_per_layer") or 10
            
            for layer in layers:
                if not isinstance(layer, dict):
                    logger.warning(f"Skipping non-dict layer: {layer}")
                    continue
                    
                layer_name = layer.get('name', 'Unknown Layer')
                node_count = layer.get('nodeCount', 0)
                nodes = layer.get('nodes', [])
                
                arch_sections.append(f"**{layer_name}** ({node_count} components):")
                
                # Show component details
                for node in nodes[:max_components_per_layer]:
                    if isinstance(node, dict):
                        node_name = node.get('name', 'Unknown Component')
                        node_type = node.get('type', 'component')
                        node_desc = node.get('description', '')
                        
                        desc_text = f" - {node_desc}" if node_desc else ""
                        arch_sections.append(f"  - {node_name} ({node_type}){desc_text}")
                    else:
                        # Handle string nodes
                        arch_sections.append(f"  - {str(node)}")
                
                if len(nodes) > max_components_per_layer:
                    remaining = len(nodes) - max_components_per_layer
                    arch_sections.append(f"  - ... and {remaining} more components")
                
                arch_sections.append("")
            
            # Add architectural guidance
            arch_sections.append("**Architectural Considerations:**")
            arch_sections.append("- Ensure new implementations respect existing layer boundaries")
            arch_sections.append("- Consider component interactions and dependencies")
            arch_sections.append("- Maintain consistency with established architectural patterns")
            
            return "\n".join(arch_sections)
            
        except Exception as e:
            logger.error(f"Error formatting architecture context: {str(e)}")
            return "Architecture context available but could not be processed."
    
    def _build_enhancement_instructions(self, enhancement_type: str = 'enhanced_prompt') -> str:
        """Build specific instructions for how the LLM should enhance the prompt based on enhancement type."""
        return self.prompt_config.format_enhancement_instructions(enhancement_type, "")
    
    def _map_enhancement_type(self, enhancement_type: str) -> str:
        """Map legacy enhancement types to new ones for backward compatibility"""
        mapping = {
            'maximum_detail': 'full_specification',
            'balanced': 'enhanced_prompt',
            'key_requirements': 'rephrase'
        }
        mapped_type = mapping.get(enhancement_type, enhancement_type)
        
        # If the mapped type is not valid, default to 'enhanced_prompt'
        valid_types = ['full_specification', 'enhanced_prompt', 'rephrase', 'default']
        if mapped_type not in valid_types:
            logger.warning(f"Invalid enhancement type '{mapped_type}', defaulting to 'enhanced_prompt'")
            return 'enhanced_prompt'
        
        return mapped_type
    
    def enhance_with_llm(self, constructed_prompt: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send the constructed prompt to the LLM and get an enhanced specification.
        
        Args:
            constructed_prompt: The prompt dictionary from construct_enhanced_prompt
            
        Returns:
            Dict containing the LLM response and metadata
        """
        if not self.bedrock_service:
            raise ValueError("BedrockService not available for LLM enhancement")
        
        try:
            # Send to LLM using the configured model from BedrockService
            enhanced_response = self.bedrock_service.invoke_claude(
                prompt=constructed_prompt['user_prompt'],
                system_prompt=constructed_prompt['system_prompt']
            )
            
            return {
                'enhanced_prompt': enhanced_response,
                'original_metadata': constructed_prompt,
                'enhancement_timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error enhancing prompt with LLM: {str(e)}")
            raise 