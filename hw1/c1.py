"""
Email Address Validation Module

Production-ready email validation with support for plus addressing and multi-level subdomains.
"""

import re
from typing import TypedDict


class EmailComponents(TypedDict):
    """Type definition for email components."""
    local: str
    domain: str
    plus_tags: list[str]


class ValidationResult(TypedDict):
    """Type definition for validation result."""
    is_valid: bool
    error: str | None
    components: EmailComponents | dict


# Pre-compiled regex pattern for email validation
# Pattern breakdown:
# - Local part: alphanumeric, dots, hyphens, underscores, plus signs
# - Domain: alphanumeric, hyphens, dots (multi-level subdomains)
# - TLD: at least 2 characters
EMAIL_PATTERN = re.compile(
    r'^([a-zA-Z0-9._+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$'
)

# Subdomain component pattern (alphanumeric and hyphens, cannot start/end with hyphen)
SUBDOMAIN_PATTERN = re.compile(r'^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$')


def validate_email(email: str) -> ValidationResult:
    """
    Validate an email address with support for plus addressing and multi-level subdomains.
    
    This function performs comprehensive email validation including:
    - Basic format validation using regex
    - Plus addressing (email aliases) extraction
    - Multi-level subdomain support with depth and length limits
    - DNS naming rules validation for subdomain components
    
    :param email: The email address string to validate
    :return: Dictionary containing validation result with structure:
             {
                 "is_valid": bool - Whether the email is valid
                 "error": str | None - Error message if validation failed
                 "components": dict - Email components (local, domain, plus_tags)
                                     or empty dict if validation failed
             }
    """
    # Handle empty or whitespace-only input
    if not email or not email.strip():
        return {
            "is_valid": False,
            "error": "Email address cannot be empty",
            "components": {}
        }
    
    email = email.strip()
    
    # Basic format validation
    match = EMAIL_PATTERN.match(email)
    if not match:
        return {
            "is_valid": False,
            "error": "Invalid email format",
            "components": {}
        }
    
    local_part, domain = match.groups()
    
    # Validate local part is not empty
    if not local_part:
        return {
            "is_valid": False,
            "error": "Local part cannot be empty",
            "components": {}
        }
    
    # Validate domain length (max 255 characters)
    if len(domain) > 255:
        return {
            "is_valid": False,
            "error": "Maximum domain length exceeded",
            "components": {}
        }
    
    # Validate domain structure
    domain_parts = domain.split('.')
    
    # Check for empty domain parts (consecutive dots or trailing/leading dots)
    if any(not part for part in domain_parts):
        return {
            "is_valid": False,
            "error": "Invalid domain format",
            "components": {}
        }
    
    # Validate subdomain depth (max 10 levels)
    if len(domain_parts) > 10:
        return {
            "is_valid": False,
            "error": "Maximum subdomain depth exceeded",
            "components": {}
        }
    
    # Validate each subdomain component follows DNS naming rules
    for part in domain_parts:
        if not SUBDOMAIN_PATTERN.match(part):
            return {
                "is_valid": False,
                "error": f"Invalid subdomain component: '{part}'",
                "components": {}
            }
    
    # Extract plus tags from local part
    local_components = local_part.split('+')
    base_local = local_components[0]
    plus_tags = local_components[1:] if len(local_components) > 1 else []
    
    # Validate base local part is not empty
    if not base_local:
        return {
            "is_valid": False,
            "error": "Local part cannot start with '+'",
            "components": {}
        }
    
    # All validations passed
    return {
        "is_valid": True,
        "error": None,
        "components": {
            "local": local_part,
            "domain": domain,
            "plus_tags": plus_tags
        }
    }


# ============================================================================
# UNIT TESTS
# ============================================================================

def test_invalid_emails():
    """Test invalid email addresses."""
    print("Testing invalid emails...")
    
    invalid_cases = [
        ("", "Email address cannot be empty"),
        ("@", "Invalid email format"),
        ("user@", "Invalid email format"),
        ("user@domain", "Invalid email format"),
        ("user@domain.", "Invalid domain format"),
    ]
    
    for email, expected_error_prefix in invalid_cases:
        result = validate_email(email)
        assert not result["is_valid"], f"Expected {email} to be invalid"
        assert result["error"] is not None, f"Expected error message for {email}"
        assert result["components"] == {}, f"Expected empty components for {email}"
        print(f"  ✓ '{email}' -> {result['error']}")
    
    print("✓ All invalid email tests passed\n")


def test_valid_emails():
    """Test valid email addresses."""
    print("Testing valid emails...")
    
    valid_cases = [
        ("user@domain.com", "user", "domain.com", []),
        ("user.name@domain.com", "user.name", "domain.com", []),
        ("user+tag@domain.com", "user+tag", "domain.com", ["tag"]),
        ("user@mail.domain.com", "user", "mail.domain.com", []),
        ("user@a.b.c.domain.com", "user", "a.b.c.domain.com", []),
        ("u@d.io", "u", "d.io", []),
        ("user+tag@sub-domain.domain.com", "user+tag", "sub-domain.domain.com", ["tag"]),
    ]
    
    for email, expected_local, expected_domain, expected_tags in valid_cases:
        result = validate_email(email)
        assert result["is_valid"], f"Expected {email} to be valid"
        assert result["error"] is None, f"Expected no error for {email}"
        assert result["components"]["local"] == expected_local
        assert result["components"]["domain"] == expected_domain
        assert result["components"]["plus_tags"] == expected_tags
        print(f"  ✓ '{email}' -> valid")
    
    print("✓ All valid email tests passed\n")


def test_plus_addressing():
    """Test plus addressing (email aliases) extraction."""
    print("Testing plus addressing...")
    
    test_cases = [
        ("user+tag1+tag2@domain.com", ["tag1", "tag2"]),
        ("user+single@domain.com", ["single"]),
        ("user@domain.com", []),
        ("user+a+b+c@domain.com", ["a", "b", "c"]),
    ]
    
    for email, expected_tags in test_cases:
        result = validate_email(email)
        assert result["is_valid"], f"Expected {email} to be valid"
        assert result["components"]["plus_tags"] == expected_tags
        print(f"  ✓ '{email}' -> tags: {expected_tags}")
    
    print("✓ All plus addressing tests passed\n")


def test_domain_limits():
    """Test domain length and subdomain depth limits."""
    print("Testing domain limits...")
    
    # Test maximum domain length (255 characters)
    long_domain = "a" * 240 + ".com"  # 244 characters - should pass
    result = validate_email(f"user@{long_domain}")
    assert result["is_valid"], "Expected long domain (244 chars) to be valid"
    print(f"  ✓ Domain length 244 chars -> valid")
    
    too_long_domain = "a" * 252 + ".com"  # 256 characters - should fail
    result = validate_email(f"user@{too_long_domain}")
    assert not result["is_valid"], "Expected too long domain (256 chars) to be invalid"
    assert "Maximum domain length exceeded" in result["error"]
    print(f"  ✓ Domain length 256 chars -> {result['error']}")
    
    # Test maximum subdomain depth (10 levels)
    valid_depth = "a.b.c.d.e.f.g.h.i.com"  # 10 levels - should pass
    result = validate_email(f"user@{valid_depth}")
    assert result["is_valid"], "Expected 10-level subdomain to be valid"
    print(f"  ✓ Subdomain depth 10 -> valid")
    
    excessive_depth = "a.b.c.d.e.f.g.h.i.j.com"  # 11 levels - should fail
    result = validate_email(f"user@{excessive_depth}")
    assert not result["is_valid"], "Expected 11-level subdomain to be invalid"
    assert "Maximum subdomain depth exceeded" in result["error"]
    print(f"  ✓ Subdomain depth 11 -> {result['error']}")
    
    print("✓ All domain limit tests passed\n")


def test_edge_cases():
    """Test additional edge cases."""
    print("Testing edge cases...")
    
    # Local part starting with +
    result = validate_email("+tag@domain.com")
    assert not result["is_valid"], "Expected local part starting with + to be invalid"
    print(f"  ✓ '+tag@domain.com' -> {result['error']}")
    
    # Consecutive dots in domain
    result = validate_email("user@domain..com")
    assert not result["is_valid"], "Expected consecutive dots to be invalid"
    print(f"  ✓ 'user@domain..com' -> {result['error']}")
    
    # Subdomain starting with hyphen
    result = validate_email("user@-invalid.domain.com")
    assert not result["is_valid"], "Expected subdomain starting with hyphen to be invalid"
    print(f"  ✓ 'user@-invalid.domain.com' -> {result['error']}")
    
    # Subdomain ending with hyphen
    result = validate_email("user@invalid-.domain.com")
    assert not result["is_valid"], "Expected subdomain ending with hyphen to be invalid"
    print(f"  ✓ 'user@invalid-.domain.com' -> {result['error']}")
    
    # Whitespace handling
    result = validate_email("  user@domain.com  ")
    assert result["is_valid"], "Expected trimmed email to be valid"
    print(f"  ✓ '  user@domain.com  ' -> valid (trimmed)")
    
    print("✓ All edge case tests passed\n")


def run_all_tests():
    """Run all unit tests."""
    print("=" * 60)
    print("EMAIL VALIDATION MODULE - UNIT TESTS")
    print("=" * 60 + "\n")
    
    test_invalid_emails()
    test_valid_emails()
    test_plus_addressing()
    test_domain_limits()
    test_edge_cases()
    
    print("=" * 60)
    print("ALL TESTS PASSED ✓")
    print("=" * 60)


if __name__ == "__main__":
    run_all_tests()