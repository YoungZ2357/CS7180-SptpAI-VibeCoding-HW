"""
Unit Tests for Email Address Validation Module

Comprehensive test suite covering all functional and non-functional requirements.

Test Coverage:
- Basic email validation
- Plus addressing (email aliases) 
- Multi-level subdomain support
- Error handling and validation messages
- Edge cases
"""

import unittest
from email_validator import validate_email


def generate_edge_case_emails():
    """
    Generate edge case email addresses for testing.
    
    Returns dictionary with 'valid' and 'invalid' email lists.
    TLD validation cases removed as TLD checking is not in scope.
    """
    edge_cases = {
        'valid': [
            'simple@example.com',
            'very.common@example.com',
            'disposable.style.email.with+symbol@example.com',
            'other.email-with-hyphen@example.com',
            '1234567890@example.com',
            'underscore_user@example.com',
            'user@sub.domain.com',
            'user@a.b',
            'user@example.co.jp',
            'a.very.long.username.that.is.still.valid@example.com',
            'user+tag1+tag2+tag3@example.com',
            'user+single@example.com',
            'u@d.io',
            'user@a.b.c.d.e.f.g.h.i.j.com',  # 11 labels (10 subdomains + domain + TLD = valid)
            'a@' + 'x' * 31 + '.com',  # Max label length (31 chars for label)
        ],
        'invalid': [
            'abc@example!com',
            'abc..def@example.com',
            'abc@example..com',
            '.abc@example.com',
            'abc.@example.com',
            'abcexample.com',
            'abc@def@example.com',
            'abc def@example.com',
            'abc@example com',
            'abc\ndef@example.com',
            'a' * 65 + '@example.com',
            'user@' + 'a' * 252 + '.com',  # 256 chars total (exceeds 255 limit)
            'abc@example',
            '@example.com',
            'username@',
            '',
            'user@',
            '@',
            'user@domain',
            'user@domain.',
            'user@-domain.com',
            'user@domain-.com',
            '"quoted"@example.com',
            'user@例え.com',  # Internationalized domain
            'user@a.b.c.d.e.f.g.h.i.j.k.l.com',  # 13 labels (exceeds 12 label limit)
            'user@' + 'x' * 33 + '.com',  # Label exceeds 32 chars
        ]
    }
    return edge_cases


class TestEmailValidation(unittest.TestCase):
    """Test suite for email validation function"""
    
    def test_valid_simple_email(self):
        """Test basic valid email address"""
        result = validate_email('user@example.com')
        self.assertTrue(result['is_valid'])
        self.assertIsNone(result['error'])
        self.assertEqual(result['components']['local'], 'user')
        self.assertEqual(result['components']['domain'], 'example.com')
        self.assertEqual(result['components']['plus_tags'], [])
    
    def test_valid_with_subdomain(self):
        """Test valid email with subdomain"""
        result = validate_email('user@mail.example.com')
        self.assertTrue(result['is_valid'])
        self.assertEqual(result['components']['domain'], 'mail.example.com')
    
    def test_valid_multi_level_subdomain(self):
        """Test valid email with multiple subdomain levels"""
        result = validate_email('user@a.b.c.example.com')
        self.assertTrue(result['is_valid'])
        self.assertEqual(result['components']['domain'], 'a.b.c.example.com')
    
    def test_valid_max_subdomain_levels(self):
        """Test valid email with maximum subdomain levels (11 labels = 10 subdomains + domain + TLD)"""
        email = 'user@a.b.c.d.e.f.g.h.i.j.com'
        result = validate_email(email)
        self.assertTrue(result['is_valid'])
    
    def test_invalid_exceeds_subdomain_levels(self):
        """Test invalid email exceeding subdomain level limit"""
        email = 'user@a.b.c.d.e.f.g.h.i.j.k.l.com'  # 13 labels (exceeds limit)
        result = validate_email(email)
        self.assertFalse(result['is_valid'])
        self.assertIn('10 subdomain levels', result['error'])
    
    def test_plus_addressing_single_tag(self):
        """Test plus addressing with single tag"""
        result = validate_email('user+tag@example.com')
        self.assertTrue(result['is_valid'])
        self.assertEqual(result['components']['plus_tags'], ['tag'])
    
    def test_plus_addressing_multiple_tags(self):
        """Test plus addressing with multiple tags"""
        result = validate_email('user+tag1+tag2+tag3@example.com')
        self.assertTrue(result['is_valid'])
        self.assertEqual(result['components']['plus_tags'], ['tag1', 'tag2', 'tag3'])
    
    def test_plus_addressing_order(self):
        """Test plus addressing maintains tag order"""
        result = validate_email('user+first+second+third@example.com')
        self.assertTrue(result['is_valid'])
        self.assertEqual(result['components']['plus_tags'], ['first', 'second', 'third'])
    
    def test_no_plus_addressing(self):
        """Test email without plus addressing returns empty tag list"""
        result = validate_email('user@example.com')
        self.assertTrue(result['is_valid'])
        self.assertEqual(result['components']['plus_tags'], [])
    
    def test_empty_email(self):
        """Test empty email address"""
        result = validate_email('')
        self.assertFalse(result['is_valid'])
        self.assertIn('empty', result['error'].lower())
    
    def test_missing_at_symbol(self):
        """Test email without @ symbol"""
        result = validate_email('userexample.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('@', result['error'])
    
    def test_multiple_at_symbols(self):
        """Test email with multiple @ symbols"""
        result = validate_email('user@domain@example.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('exactly one', result['error'].lower())
    
    def test_local_part_consecutive_dots(self):
        """Test invalid consecutive dots in local part"""
        result = validate_email('user..name@example.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('consecutive dots', result['error'].lower())
    
    def test_local_part_leading_dot(self):
        """Test invalid leading dot in local part"""
        result = validate_email('.user@example.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('start with a dot', result['error'].lower())
    
    def test_local_part_trailing_dot(self):
        """Test invalid trailing dot in local part"""
        result = validate_email('user.@example.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('end with a dot', result['error'].lower())
    
    def test_local_part_exceeds_length(self):
        """Test local part exceeding 64 character limit"""
        result = validate_email('a' * 65 + '@example.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('64 characters', result['error'])
    
    def test_local_part_whitespace(self):
        """Test local part with whitespace"""
        result = validate_email('user name@example.com')
        self.assertFalse(result['is_valid'])
        self.assertIsNotNone(result['error'])
    
    def test_domain_consecutive_dots(self):
        """Test invalid consecutive dots in domain"""
        result = validate_email('user@example..com')
        self.assertFalse(result['is_valid'])
        self.assertIn('consecutive dots', result['error'].lower())
    
    def test_domain_missing_tld(self):
        """Test domain without TLD (missing dot)"""
        result = validate_email('user@example')
        self.assertFalse(result['is_valid'])
        self.assertIn('dot', result['error'].lower())
    
    def test_domain_exceeds_length(self):
        """Test domain exceeding 255 character limit"""
        long_domain = 'a' * 252 + '.com'  # 256 characters total (exceeds limit)
        result = validate_email(f'user@{long_domain}')
        self.assertFalse(result['is_valid'])
        self.assertIn('255 characters', result['error'])
    
    def test_domain_label_exceeds_length(self):
        """Test domain label exceeding 32 character limit"""
        long_label = 'x' * 33
        result = validate_email(f'user@{long_label}.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('32 characters', result['error'])
    
    def test_domain_label_max_length(self):
        """Test domain label at maximum 32 character limit"""
        max_label = 'x' * 32
        result = validate_email(f'user@{max_label}.com')
        self.assertTrue(result['is_valid'])
    
    def test_domain_whitespace(self):
        """Test domain with whitespace"""
        result = validate_email('user@example .com')
        self.assertFalse(result['is_valid'])
        self.assertIsNotNone(result['error'])
    
    def test_domain_leading_hyphen(self):
        """Test domain label starting with hyphen"""
        result = validate_email('user@-example.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('hyphen', result['error'].lower())
    
    def test_domain_trailing_hyphen(self):
        """Test domain label ending with hyphen"""
        result = validate_email('user@example-.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('hyphen', result['error'].lower())
    
    def test_quoted_string_rejection(self):
        """Test rejection of quoted strings in local part"""
        result = validate_email('"quoted.user"@example.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('quoted strings', result['error'].lower())
    
    def test_internationalized_domain_rejection(self):
        """Test rejection of internationalized domain names"""
        result = validate_email('user@例え.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('internationalized', result['error'].lower())
    
    def test_only_at_symbol(self):
        """Test email with only @ symbol"""
        result = validate_email('@')
        self.assertFalse(result['is_valid'])
    
    def test_missing_local_part(self):
        """Test email missing local part"""
        result = validate_email('@example.com')
        self.assertFalse(result['is_valid'])
        self.assertIn('local part', result['error'].lower())
    
    def test_missing_domain_part(self):
        """Test email missing domain part"""
        result = validate_email('user@')
        self.assertFalse(result['is_valid'])
        self.assertIn('domain', result['error'].lower())
    
    def test_edge_cases_valid(self):
        """Test all valid edge cases from generator"""
        edge_cases = generate_edge_case_emails()
        for email in edge_cases['valid']:
            with self.subTest(email=email):
                result = validate_email(email)
                self.assertTrue(
                    result['is_valid'],
                    f"Email '{email}' should be valid but got error: {result['error']}"
                )
    
    def test_edge_cases_invalid(self):
        """Test all invalid edge cases from generator"""
        edge_cases = generate_edge_case_emails()
        for email in edge_cases['invalid']:
            with self.subTest(email=email):
                result = validate_email(email)
                self.assertFalse(
                    result['is_valid'],
                    f"Email '{email}' should be invalid but was accepted"
                )
                self.assertIsNotNone(
                    result['error'],
                    f"Email '{email}' should have error message"
                )
    
    def test_return_structure(self):
        """Test that return structure matches specification"""
        result = validate_email('user+tag@example.com')
        
        # Check top-level keys
        self.assertIn('is_valid', result)
        self.assertIn('error', result)
        self.assertIn('components', result)
        
        # Check components structure
        self.assertIn('local', result['components'])
        self.assertIn('domain', result['components'])
        self.assertIn('plus_tags', result['components'])
        
        # Check types
        self.assertIsInstance(result['is_valid'], bool)
        self.assertIsInstance(result['components']['local'], str)
        self.assertIsInstance(result['components']['domain'], str)
        self.assertIsInstance(result['components']['plus_tags'], list)
    
    def test_error_message_detail(self):
        """Test that error messages are detailed and specific"""
        test_cases = [
            ('', 'empty'),
            ('user..name@example.com', 'consecutive dots'),
            ('.user@example.com', 'start'),
            ('a' * 65 + '@example.com', '64'),
            ('user@example', 'dot'),
        ]
        
        for email, expected_keyword in test_cases:
            with self.subTest(email=email):
                result = validate_email(email)
                self.assertFalse(result['is_valid'])
                self.assertIsNotNone(result['error'])
                self.assertIn(
                    expected_keyword.lower(),
                    result['error'].lower(),
                    f"Error message should contain '{expected_keyword}'"
                )


class TestRegexPrecompilation(unittest.TestCase):
    """Test that regex patterns are pre-compiled at module level"""
    
    def test_regex_patterns_are_compiled(self):
        """Verify regex patterns are compiled Pattern objects"""
        from email_validator import (
            EMAIL_PATTERN, 
            QUOTED_STRING_PATTERN,
            NON_ASCII_PATTERN,
            LOCAL_PART_PATTERN,
            DOMAIN_LABEL_PATTERN
        )
        import re
        
        patterns = [
            EMAIL_PATTERN,
            QUOTED_STRING_PATTERN,
            NON_ASCII_PATTERN,
            LOCAL_PART_PATTERN,
            DOMAIN_LABEL_PATTERN
        ]
        
        for pattern in patterns:
            self.assertIsInstance(
                pattern,
                re.Pattern,
                "Pattern should be pre-compiled"
            )


if __name__ == '__main__':
    unittest.main(verbosity=2)
