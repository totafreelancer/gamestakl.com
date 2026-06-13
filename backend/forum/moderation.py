import re

BAD_WORDS = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap',
    'dick', 'piss', 'pussy', 'cunt', 'whore', 'slut', 'faggot',
    'nigger', 'retard', 'idiot', 'moron'
]

FLAG_REASONS = {
    'profanity': 'Post contains inappropriate language/profanity',
    'spam': 'Post appears to be spam',
    'harassment': 'Post may contain harassment',
}


def contains_bad_words(text):
    if not text:
        return False, []
    
    text_lower = text.lower()
    found_words = []
    
    for word in BAD_WORDS:
        pattern = r'\b' + re.escape(word) + r'\b'
        if re.search(pattern, text_lower):
            found_words.append(word)
    
    return len(found_words) > 0, found_words


def detect_spam(text):
    if not text:
        return False
    
    # Count URLs separately - multiple URLs might be spam
    url_pattern = r'(http|https)://\S+|www\.\S+'
    urls = re.findall(url_pattern, text, re.IGNORECASE)
    
    # If more than 3 URLs, consider it spam
    if len(urls) > 3:
        return True
    
    # Check for other spam indicators (excluding URLs)
    spam_indicators = [
        r'\b\d{10,}\b',  # Long numbers (phone, etc.)
        r'(.)\1{10,}',  # Repeated characters (10+ same chars)
        r'[A-Z]{20,}',  # Excessive caps
    ]
    
    matches = 0
    for pattern in spam_indicators:
        if re.search(pattern, text, re.IGNORECASE):
            matches += 1
    
    # Need 2+ non-URL spam indicators
    return matches >= 2


def moderate_content(content):
    if not content:
        return {
            'is_flagged': False,
            'reason': None,
            'severity': 'none'
        }
    
    has_profanity, bad_words_found = contains_bad_words(content)
    is_spam = detect_spam(content)
    
    if has_profanity and is_spam:
        return {
            'is_flagged': True,
            'reason': f"Profanity ({', '.join(bad_words_found[:3])}) and potential spam detected",
            'severity': 'high'
        }
    elif has_profanity:
        return {
            'is_flagged': True,
            'reason': f"Inappropriate language detected: {', '.join(bad_words_found[:3])}",
            'severity': 'medium'
        }
    elif is_spam:
        return {
            'is_flagged': True,
            'reason': 'Potential spam content detected',
            'severity': 'medium'
        }
    
    return {
        'is_flagged': False,
        'reason': None,
        'severity': 'none'
    }


def censor_text(text):
    if not text:
        return text
    
    censored = text
    for word in BAD_WORDS:
        pattern = r'\b' + re.escape(word) + r'\b'
        replacement = word[0] + '*' * (len(word) - 2) + word[-1] if len(word) > 2 else '*' * len(word)
        censored = re.sub(pattern, replacement, censored, flags=re.IGNORECASE)
    
    return censored