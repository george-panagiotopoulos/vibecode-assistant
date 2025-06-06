import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from flask import has_request_context, request
import threading

class LoggingService:
    """Service for logging streaming responses and application events"""
    
    def __init__(self):
        self.logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'logs')
        os.makedirs(self.logs_dir, exist_ok=True)
        
        # Set up logger
        self.logger = logging.getLogger(__name__)
        
        # Thread-safe logging queue for context-free operations
        self._log_queue = []
        self._log_lock = threading.Lock()
    
    def _safe_log_write(self, log_entry: Dict[str, Any], log_type: str):
        """Thread-safe logging that works outside Flask request context"""
        try:
            timestamp = datetime.now().isoformat()
            log_entry["timestamp"] = timestamp
            
            # Determine log file based on type
            if log_type == "streaming":
                log_file = os.path.join(self.logs_dir, f"streaming_responses_{datetime.now().strftime('%Y%m%d')}.log")
            elif log_type == "api":
                log_file = os.path.join(self.logs_dir, f"api_requests_{datetime.now().strftime('%Y%m%d')}.log")
            elif log_type == "error":
                log_file = os.path.join(self.logs_dir, f"errors_{datetime.now().strftime('%Y%m%d')}.log")
            else:
                log_file = os.path.join(self.logs_dir, f"general_{datetime.now().strftime('%Y%m%d')}.log")
            
            # Thread-safe file writing
            with self._log_lock:
                with open(log_file, 'a', encoding='utf-8') as f:
                    f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
                    
        except Exception as e:
            # Use basic logging as fallback
            self.logger.error(f"Failed to write log entry: {str(e)}")
    
    def log_streaming_response(self, prompt: str, response_chunks: list, metadata: Dict[str, Any] = None):
        """Log a complete streaming response - context-safe version"""
        try:
            log_entry = {
                "type": "streaming_response",
                "prompt": prompt,
                "response_chunks": response_chunks,
                "full_response": "".join(response_chunks),
                "chunk_count": len(response_chunks),
                "total_length": len("".join(response_chunks)),
                "metadata": metadata or {}
            }
            
            self._safe_log_write(log_entry, "streaming")
            self.logger.info(f"Logged streaming response: {len(response_chunks)} chunks, {len(''.join(response_chunks))} chars")
            
        except Exception as e:
            self.logger.error(f"Failed to log streaming response: {str(e)}")
    
    def log_api_request(self, endpoint: str, request_data: Dict[str, Any], response_data: Dict[str, Any] = None, error: str = None):
        """Log API requests and responses - context-safe version"""
        try:
            log_entry = {
                "type": "api_request",
                "endpoint": endpoint,
                "request_data": request_data,
                "response_data": response_data,
                "error": error,
                "success": error is None
            }
            
            # Add request context info if available
            if has_request_context():
                try:
                    log_entry["request_info"] = {
                        "method": request.method,
                        "url": request.url,
                        "remote_addr": request.remote_addr,
                        "user_agent": request.headers.get('User-Agent', '')
                    }
                except Exception:
                    pass  # Ignore context access errors
            
            self._safe_log_write(log_entry, "api")
                
        except Exception as e:
            self.logger.error(f"Failed to log API request: {str(e)}")
    
    def log_error(self, error_type: str, error_message: str, context: Dict[str, Any] = None):
        """Log application errors - context-safe version"""
        try:
            log_entry = {
                "type": "error",
                "error_type": error_type,
                "error_message": error_message,
                "context": context or {}
            }
            
            # Add request context info if available
            if has_request_context():
                try:
                    log_entry["request_info"] = {
                        "method": request.method,
                        "url": request.url,
                        "endpoint": request.endpoint
                    }
                except Exception:
                    pass  # Ignore context access errors
            
            self._safe_log_write(log_entry, "error")
                
        except Exception as e:
            self.logger.error(f"Failed to log error: {str(e)}")

# Global logging service instance
logging_service = LoggingService() 