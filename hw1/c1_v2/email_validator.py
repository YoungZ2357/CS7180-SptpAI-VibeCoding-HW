"""
Email Address Validation Module

Production-ready email validation with support for plus addressing (email aliases)
and multi-level subdomain handling.

Author: Senior Backend Developer
Version: 1.0
Python: >=3.10
"""

import re
from typing import TypedDict


class EmailComponents(TypedDict):
    """Structure for email components"""
    local: str
    domain: str
    plus_tags: list[str]


class EmailValidationResult(TypedDict):
    """Structure for validation result"""
    is_valid: bool
    error: str | None
    components: EmailComponents


# Module-level pre-compiled regex patterns
# Simplified practical pattern instead of strict RFC5322
EMAIL_PATTERN = re.compile(
    r'^'
    r'([a-zA-Z0-9._+-]+)'  # Local part (includes + for plus addressing)
    r'@'
    r'([a-zA-Z0-9.-]+)'     # Domain part
    r'$'
)

# Pattern for detecting quoted strings in local part
QUOTED_STRING_PATTERN = re.compile(r'".*"')

# Pattern for detecting non-ASCII characters (internationalized domains)
NON_ASCII_PATTERN = re.compile(r'[^\x00-\x7F]')

# Pattern for validating local part components (more strict)
LOCAL_PART_PATTERN = re.compile(r'^[a-zA-Z0-9._+-]+$')

# Pattern for validating domain labels
DOMAIN_LABEL_PATTERN = re.compile(r'^[a-zA-Z0-9-]+$')


def validate_email(email: str) -> EmailValidationResult:
    """
    Validate email address with comprehensive error handling and component extraction.
    
    Supports:
    - Plus addressing (email aliases) with tag extraction
    - Multi-level subdomains (up to 10 levels)
    - Domain length up to 255 characters
    - Subdomain labels up to 32 characters each
    
    :param email: Email address string to validate
    :return: Dictionary containing validation status, error message (if any), 
             and extracted components (local part, domain, plus tags)
    """
    # Initialize result structure
    result: EmailValidationResult = {
        "is_valid": False,
        "error": None,
        "components": {
            "local": "",
            "domain": "",
            "plus_tags": []
        }
    }
    
    # Check for empty string
    if not email:
        result["error"] = "Email address cannot be empty"
        return result
    
    # Check for internationalized domain names (non-ASCII characters)
    if NON_ASCII_PATTERN.search(email):
        result["error"] = "Internationalized domain names are not supported"
        return result
    
    # Check for quoted strings in local part
    if QUOTED_STRING_PATTERN.search(email):
        result["error"] = "Quoted strings are not allowed in local part"
        return result
    
    # Basic structure validation
    if email.count('@') != 1:
        if email.count('@') == 0:
            result["error"] = "Email address must contain '@' symbol"
        else:
            result["error"] = "Email address must contain exactly one '@' symbol"
        return result
    
    # Split into local and domain parts
    local_part, domain_part = email.split('@')
    
    # Validate local part
    local_validation_error = _validate_local_part(local_part)
    if local_validation_error:
        result["error"] = local_validation_error
        return result
    
    # Validate domain part
    domain_validation_error = _validate_domain_part(domain_part)
    if domain_validation_error:
        result["error"] = domain_validation_error
        return result
    
    # Extract plus tags from local part
    plus_tags = _extract_plus_tags(local_part)
    
    # If all validations pass, populate successful result
    result["is_valid"] = True
    result["error"] = None
    result["components"]["local"] = local_part
    result["components"]["domain"] = domain_part
    result["components"]["plus_tags"] = plus_tags
    
    return result


def _validate_local_part(local: str) -> str | None:
    """
    Validate the local part of email address (before @).
    
    :param local: Local part string
    :return: Error message if invalid, None if valid
    """
    if not local:
        return "Local part cannot be empty"
    
    # Check length (practical limit: 64 characters per RFC5321)
    if len(local) > 64:
        return "Local part exceeds maximum length of 64 characters"
    
    # Check for invalid characters
    if not LOCAL_PART_PATTERN.match(local):
        return "Local part contains invalid characters"
    
    # Check for consecutive dots
    if '..' in local:
        return "Local part cannot contain consecutive dots"
    
    # Check for leading/trailing dots
    if local.startswith('.'):
        return "Local part cannot start with a dot"
    
    if local.endswith('.'):
        return "Local part cannot end with a dot"
    
    # Check for whitespace
    if ' ' in local or '\t' in local or '\n' in local:
        return "Local part cannot contain whitespace"
    
    return None


def _validate_domain_part(domain: str) -> str | None:
    """
    Validate the domain part of email address (after @).
    
    Supports multi-level subdomains with the following constraints:
    - Total domain length: up to 255 characters
    - Each label length: up to 32 characters
    - Up to 10 subdomain levels
    
    :param domain: Domain part string
    :return: Error message if invalid, None if valid
    """
    if not domain:
        return "Domain part cannot be empty"
    
    # Check for leading/trailing dots or hyphens
    if domain.startswith('.') or domain.endswith('.'):
        return "Domain cannot start or end with a dot"
    
    if domain.startswith('-') or domain.endswith('-'):
        return "Domain cannot start or end with a hyphen"
    
    # Check for consecutive dots
    if '..' in domain:
        return "Domain cannot contain consecutive dots"
    
    # Check total domain length BEFORE splitting and validating individual labels
    if len(domain) > 255:
        return "Domain exceeds maximum length of 255 characters"
    
    # Split into labels and validate each
    labels = domain.split('.')
    
    # Must have at least 2 labels (e.g., domain.com)
    if len(labels) < 2:
        return "Domain must contain at least one dot (e.g., example.com)"
    
    # Check subdomain level limit (10 subdomain levels + domain + TLD = 12 total labels)
    if len(labels) > 12:
        return "Domain cannot have more than 10 subdomain levels"
    
    # Validate each label
    for i, label in enumerate(labels):
        if not label:
            return f"Domain label at position {i+1} is empty"
        
        # Check label character validity
        if not DOMAIN_LABEL_PATTERN.match(label):
            return f"Domain label '{label}' contains invalid characters"
        
        # Label cannot start or end with hyphen
        if label.startswith('-') or label.endswith('-'):
            return f"Domain label '{label}' cannot start or end with hyphen"
        
        # Check label length (after other validations to provide more specific errors first)
        if len(label) > 32:
            return f"Domain label '{label}' exceeds maximum length of 32 characters"
    
    # Check for whitespace
    if ' ' in domain or '\t' in domain or '\n' in domain:
        return "Domain cannot contain whitespace"
    
    return None


def _extract_plus_tags(local: str) -> list[str]:
    """
    Extract plus addressing tags from local part.
    
    Example: "user+tag1+tag2" -> ["tag1", "tag2"]
    
    :param local: Local part of email address
    :return: List of tags in order of appearance (empty list if no tags)
    """
    if '+' not in local:
        return []
    
    # Split by + and take everything after the first segment
    parts = local.split('+')
    
    # Return all parts after the base username (skip first part)
    return parts[1:] if len(parts) > 1 else []
