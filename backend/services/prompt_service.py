import logging
from typing import List, Dict, Any, Optional, Union
from .prompt_config_loader import PromptConfigLoader
from .prompt_constructor import PromptConstructor

logger = logging.getLogger(__name__)

class PromptService:
    """Service for building and enhancing prompts with application architecture integration"""
    
    def __init__(self, bedrock_service, neo4j_service=None):
        self.bedrock_service = bedrock_service
        self.neo4j_service = neo4j_service
        self.prompt_config = PromptConfigLoader()
        self.prompt_constructor = PromptConstructor(bedrock_service)
    
    def enhance_prompt(
        self, 
        user_prompt: str, 
        nfr_requirements: List[str] = None,
        file_context: List[Dict] = None,
        application_architecture: Dict = None,
        enhancement_type: str = 'enhanced_prompt',
        return_string_only: bool = False
    ) -> Union[Dict[str, Any], str]:
        """
        Enhanced prompt building with LLM integration.
        Now actually calls the LLM to generate enhanced responses.
        """
        try:
            # Use PromptConstructor to build the comprehensive prompt
            constructed_prompt = self.prompt_constructor.construct_enhanced_prompt(
                user_input=user_prompt,
                nfr_requirements=nfr_requirements,
                file_context=file_context,
                application_architecture=application_architecture,
                enhancement_type=enhancement_type
            )
            
            # Get the enhanced response from LLM
            enhanced_response = self._invoke_llm_with_retry(constructed_prompt)
            
            if return_string_only:
                return enhanced_response
            
            # Return comprehensive response with metadata
            return {
                'enhanced_prompt': enhanced_response,
                'original_input': user_prompt,
                'enhancement_type': enhancement_type,
                'metadata': constructed_prompt.get('metadata', {}),
                'system_prompt': constructed_prompt.get('system_prompt', ''),
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Error in enhance_prompt: {str(e)}")
            error_response = f"Enhancement failed: {str(e)}"
            
            if return_string_only:
                return error_response
            
            return {
                'enhanced_prompt': error_response,
                'original_input': user_prompt,
                'enhancement_type': enhancement_type,
                'error': str(e),
                'success': False
            }
    
    def _invoke_llm_with_retry(self, constructed_prompt: Dict[str, Any], max_retries: int = 3) -> str:
        """
        Invoke LLM with retry logic and exponential backoff.
        
        Args:
            constructed_prompt: Dictionary containing 'enhanced_prompt' and 'system_prompt'
            max_retries: Maximum number of retry attempts
            
        Returns:
            Enhanced prompt string from LLM
        """
        if not self.bedrock_service:
            raise ValueError("BedrockService not available")
        
        # Extract the prompt and system prompt from the constructed prompt
        user_prompt = constructed_prompt.get('enhanced_prompt', '')
        system_prompt = constructed_prompt.get('system_prompt', '')
        
        if not user_prompt:
            raise ValueError("No prompt found in constructed_prompt")
        
        last_error = None
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Invoking LLM (attempt {attempt + 1}/{max_retries})")
                
                # Call the LLM with the constructed prompt
                response = self.bedrock_service.invoke_claude(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    max_tokens=4000,
                    temperature=0.3
                )
                
                if response and response.strip():
                    logger.info(f"LLM response received successfully (length: {len(response)})")
                    return response.strip()
                else:
                    raise ValueError("Empty response from LLM")
                    
            except Exception as e:
                last_error = e
                logger.warning(f"LLM invocation attempt {attempt + 1} failed: {str(e)}")
                
                if attempt < max_retries - 1:
                    # Exponential backoff: 1s, 2s, 4s
                    wait_time = 2 ** attempt
                    logger.info(f"Retrying in {wait_time} seconds...")
                    import time
                    time.sleep(wait_time)
        
        # All retries failed
        error_msg = f"LLM invocation failed after {max_retries} attempts. Last error: {str(last_error)}"
        logger.error(error_msg)
        raise Exception(error_msg)
    
    def build_final_prompt(
        self, 
        base_prompt: str, 
        requirements: List[str] = None, 
        selected_files: List[Dict] = None, 
        architecture_layers: List[Dict] = None,
        enhancement_type: str = 'enhanced_prompt'
    ) -> str:
        """
        Build final prompt with non-functional requirements, architecture layers, and file references.
        Uses the new prompt constructor approach.
        """
        if not base_prompt or not base_prompt.strip():
            raise ValueError("Base prompt cannot be empty")
        
        try:
            # Convert architecture_layers to application_architecture format
            application_architecture = None
            if architecture_layers:
                application_architecture = {
                    'layers': architecture_layers,
                    'enabled': True
                }
            
            # Use the enhanced prompt service
            result = self.enhance_prompt(
                user_prompt=base_prompt,
                nfr_requirements=requirements,
                file_context=selected_files,
                application_architecture=application_architecture,
                enhancement_type=enhancement_type
            )
            
            if result['success']:
                return result['enhanced_prompt']
            else:
                logger.warning(f"Prompt enhancement failed: {result['error']}")
                return base_prompt  # Fallback to base prompt
            
        except Exception as e:
            logger.error(f"Error building final prompt: {str(e)}")
            return base_prompt  # Fallback to base prompt
    
    def _process_architecture_layers(self, architecture_layers: List[Dict], base_prompt: str) -> Dict[str, Any]:
        """Process and analyze architecture layers for relevance to the prompt"""
        try:
            processed_layers = []
            total_components = 0
            
            for layer in architecture_layers:
                layer_info = {
                    'name': layer.get('name', 'Unknown Layer'),
                    'nodeCount': layer.get('nodeCount', 0),
                    'nodes': layer.get('nodes', [])
                }
                
                processed_layers.append(layer_info)
                total_components += layer.get('nodeCount', 0)
            
            return {
                'layers': processed_layers,
                'total_layers': len(processed_layers),
                'total_components': total_components,
                'enabled': True
            }
            
        except Exception as e:
            logger.error(f"Error processing architecture layers: {str(e)}")
            return None
    
    def analyze_prompt_complexity(self, prompt: str, architecture_layers: List[Dict] = None) -> Dict[str, Any]:
        """
        Analyze prompt complexity and provide insights.
        Updated to work with the new architecture-aware system.
        """
        if not prompt:
            return {
                'complexity': 'low',
                'word_count': 0,
                'estimated_tokens': 0,
                'has_architecture': False,
                'architecture_complexity': 'none',
                'recommendations': ['Prompt is empty']
            }
        
        try:
            # Basic complexity analysis
            word_count = len(prompt.split())
            estimated_tokens = word_count * 1.3  # Rough estimation
            
            # Determine complexity thresholds from config
            complexity_thresholds = self.prompt_config.get_validation_rule("complexity_thresholds") or {}
            low_threshold = complexity_thresholds.get("low", 150)
            medium_threshold = complexity_thresholds.get("medium", 300)
            
            if word_count < low_threshold:
                complexity = 'low'
            elif word_count < medium_threshold:
                complexity = 'medium'
            else:
                complexity = 'high'
            
            # Architecture complexity analysis
            has_architecture = bool(architecture_layers)
            architecture_complexity = 'none'
            
            if has_architecture:
                total_components = sum(layer.get('nodeCount', 0) for layer in architecture_layers)
                if total_components < 10:
                    architecture_complexity = 'simple'
                elif total_components < 50:
                    architecture_complexity = 'moderate'
                else:
                    architecture_complexity = 'complex'
            
            # Generate recommendations
            recommendations = self._generate_complexity_recommendations(
                complexity, word_count, has_architecture, architecture_complexity
            )
            
            return {
                'complexity': complexity,
                'word_count': word_count,
                'estimated_tokens': int(estimated_tokens),
                'has_architecture': has_architecture,
                'architecture_complexity': architecture_complexity,
                'recommendations': recommendations,
                'thresholds': {
                    'low': low_threshold,
                    'medium': medium_threshold
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing prompt complexity: {str(e)}")
            return {
                'complexity': 'unknown',
                'word_count': 0,
                'estimated_tokens': 0,
                'has_architecture': False,
                'architecture_complexity': 'unknown',
                'recommendations': ['Error analyzing complexity'],
                'error': str(e)
            }
    
    def _generate_complexity_recommendations(
        self, 
        complexity: str, 
        word_count: int, 
        has_architecture: bool, 
        architecture_complexity: str
    ) -> List[str]:
        """Generate recommendations based on complexity analysis"""
        recommendations = []
        
        if complexity == 'low':
            recommendations.append("Consider adding more specific requirements or context")
        elif complexity == 'high':
            recommendations.append("Consider breaking down into smaller, focused requests")
        
        if not has_architecture:
            recommendations.append("Consider enabling architecture context for better recommendations")
        elif architecture_complexity == 'complex':
            recommendations.append("Complex architecture detected - ensure clear component boundaries")
        
        if word_count < 20:
            recommendations.append("Very brief prompt - consider adding more detail")
        elif word_count > 500:
            recommendations.append("Very detailed prompt - consider focusing on key requirements")
        
        return recommendations if recommendations else ["Prompt complexity is appropriate"]
    
    def _extract_file_references(self, prompt: str) -> List[str]:
        """Extract file references from prompt text"""
        import re
        
        # Get file patterns from config
        file_patterns = self.prompt_config.get_file_patterns()
        regex_patterns = file_patterns.get('regex_patterns', [])
        
        file_references = []
        
        for pattern in regex_patterns:
            try:
                matches = re.findall(pattern, prompt)
                file_references.extend(matches)
            except re.error as e:
                logger.warning(f"Invalid regex pattern {pattern}: {str(e)}")
        
        # Remove duplicates and return
        return list(set(file_references))
    
    def suggest_improvements(self, prompt: str, architecture_layers: List[Dict] = None) -> List[str]:
        """Suggest improvements for the prompt based on analysis"""
        suggestions = []
        
        try:
            # Analyze complexity
            complexity_analysis = self.analyze_prompt_complexity(prompt, architecture_layers)
            suggestions.extend(complexity_analysis.get('recommendations', []))
            
            # Check for file references
            file_refs = self._extract_file_references(prompt)
            if file_refs:
                suggestions.append(f"Found {len(file_refs)} file references - ensure they are accessible")
            
            # Architecture-specific suggestions
            if architecture_layers:
                total_components = sum(layer.get('nodeCount', 0) for layer in architecture_layers)
                if total_components > 20:
                    suggestions.append("Large architecture - consider focusing on specific layers")
            else:
                suggestions.append("Consider adding architecture context for more targeted recommendations")
            
            return suggestions[:5]  # Limit to top 5 suggestions
            
        except Exception as e:
            logger.error(f"Error generating suggestions: {str(e)}")
            return ["Unable to generate suggestions due to analysis error"]
    
    def get_architecture_integration_status(self) -> Dict[str, Any]:
        """Get status of architecture integration capabilities"""
        return {
            'neo4j_available': self.neo4j_service is not None,
            'bedrock_available': self.bedrock_service is not None,
            'prompt_config_loaded': bool(self.prompt_config.config),
            'constructor_available': self.prompt_constructor is not None,
            'features': {
                'dynamic_system_prompts': True,
                'architecture_context': True,
                'error_handling': True,
                'retry_logic': True
            }
        } 