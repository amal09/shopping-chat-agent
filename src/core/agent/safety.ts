import { normalize } from "../utils/text";

/**
 * Represents the safety evaluation decision made by the safety module.
 * Either allows the request to proceed or refuses it with a reason and safe fallback reply.
 */
export type SafetyDecision =
  | { action: "allow" }
  | { action: "refuse"; reason: string; safeReply: string };

/**
 * Patterns that indicate prompt injection attempts.
 * These patterns detect users trying to override system instructions or access hidden prompts.
 */
const INJECTION_PATTERNS = [
  "ignore your rules",
  "ignore all previous instructions",
  "reveal your system prompt",
  "show me the system prompt",
  "what is your system prompt",
  "what's your system prompt",
  "developer message",
  "hidden prompt",
  "system message",
  "jailbreak",
  "prompt injection",
  "bypass your instructions",
  "override your rules",
  "break character",
  "forget your instructions",
  "disregard your instructions",
  "act as if",
  "pretend you",
  "roleplay as",
  "you are now",
  "from now on",
  "internal instructions",
  "secret instructions",
  "real instructions",
  "true purpose",
  "actual purpose",
  "real purpose",
  "original instructions",
  "underlying code",
  "source code",
  "backend code",
  "show me code",
  "expose yourself",
  "reveal yourself",
  "tell me your secrets",
  "what are you",
  "who created you",
  "who are you really",
  "what is your real purpose",
  "what is your training data",
  "show training data",
  "administrator mode",
  "admin mode",
  "developer mode",
  "debug mode",
  "test mode",
  "unrestricted mode"
];

/**
 * Patterns that indicate requests for sensitive secrets or credentials.
 * These detect attempts to extract API keys, tokens, passwords, and other confidential data.
 */
const SECRET_PATTERNS = [
  "api key",
  "secret key",
  "private key",
  "token",
  "password",
  "credentials",
  "database password",
  "access key",
  "bearer token",
  "auth token",
  "encryption key",
  "secret token",
  "api secret",
  "client secret",
  "client id",
  "refresh token",
  "session key",
  "session token",
  "jwt",
  "oauth token",
  "github token",
  "api credentials",
  "database credentials",
  "login credentials",
  "user credentials",
  "admin credentials",
  "root password",
  "admin password",
  "ssh key",
  "private ssh key",
  "aws key",
  "aws secret",
  "stripe key",
  "payment key",
  "secret code",
  "access code",
  "passcode",
  "verification code",
  "confirmation code",
  "two factor",
  "2fa",
  "authentication code",
  "authorization token",
  "security token",
  "confidential",
  "restricted",
  "classified",
  "proprietary"
];

/**
 * Patterns that indicate defamatory, toxic, or abusive language.
 * These detect requests asking for negative comments about brands or insulting content.
 */
const DEFAMATION_PATTERNS = [
  "trash",
  "hate",
  "worst brand",
  "brand x is garbage",
  "abuse",
  "insult",
  "stupid",
  "dumb",
  "terrible brand",
  "worthless phone",
  "piece of junk",
  "garbage",
  "crap",
  "sucks",
  "terrible",
  "awful",
  "horrible",
  "disgusting",
  "pathetic",
  "loser",
  "idiot",
  "moron",
  "fool",
  "scum",
  "creep",
  "jerk",
  "asshole",
  "bastard",
  "worst ever",
  "never buy",
  "avoid this",
  "ripoff",
  "scam",
  "fraud",
  "useless",
  "pointless",
  "broke",
  "broken",
  "defective",
  "inferior",
  "cheap garbage",
  "inferior quality"
];

/**
 * Patterns that indicate illegal, unsafe, or harmful activities.
 * Kept conservative and can be expanded as needed.
 */
const ILLEGAL_OR_UNSAFE = [
  "bomb",
  "weapon",
  "hack",
  "malware",
  "exploit",
  "virus",
  "ransomware",
  "terrorist",
  "terrorism",
  "explosive",
  "nuclear",
  "chemical",
  "biological",
  "bioweapon",
  "gun",
  "rifle",
  "pistol",
  "shotgun",
  "ammunition",
  "explosives",
  "cocaine",
  "heroin",
  "methamphetamine",
  "drug",
  "illegal drug",
  "meth",
  "crack",
  "fentanyl",
  "opioid",
  "hacking",
  "cracking",
  "crack software",
  "warez",
  "piracy",
  "trojan",
  "worm",
  "spyware",
  "phishing",
  "ddos",
  "botnet",
  "zero day",
  "vulnerability",
  "breach",
  "steal data",
  "dump database",
  "sql injection",
  "cross site scripting"
];

/**
 * Evaluates the safety of a user's input by checking against multiple threat patterns.
 * This function examines the normalized text for indicators of:
 * - Prompt injection attempts (trying to override system instructions)
 * - Requests for sensitive secrets or credentials (API keys, passwords, tokens)
 * - Defamatory, abusive, or toxic language (insults, slurs, negativity)
 * - Illegal or unsafe activities (weapons, malware, exploits)
 * - Off-topic queries unrelated to mobile phone shopping
 *
 * The function uses a priority-based approach to determine which safety issue
 * takes precedence, ensuring the most critical threats are addressed first.
 *
 * @param userText - The raw user input to evaluate for safety concerns
 * @returns A SafetyDecision indicating whether to allow the request to proceed
 *          or refuse it with an appropriate reason and safe fallback response
 */
export function evaluateSafety(userText: string): SafetyDecision {
  const t = normalize(userText);

  /**
   * Helper function to check if the normalized text contains any of the given patterns.
   * This is case-insensitive and handles whitespace normalization.
   */
  const contains = (patterns: string[]) => patterns.some((p) => t.includes(normalize(p)));

  // Priority 1: Check for illegal or unsafe requests first (highest priority)
  // These represent the most serious safety concerns
  if (contains(ILLEGAL_OR_UNSAFE)) {
    return {
      action: "refuse",
      reason: "unsafe_request",
      safeReply:
        "I can't help with unsafe or harmful requests. If you have a question about mobile phones, I can help you compare models, features, and prices."
    };
  }

  // Check for prompt injection attempts (second priority)
  // Prevent users from manipulating the AI to reveal system instructions
  if (contains(INJECTION_PATTERNS)) {
    return {
      action: "refuse",
      reason: "prompt_injection",
      safeReply:
        "I can’t share hidden instructions or internal prompts. I can help with phone recommendations, comparisons, and feature explanations instead."
    };
  }

  // Check for requests for secrets and credentials (third priority)
  // Prevent exposure of sensitive API keys, tokens, and passwords
  if (contains(SECRET_PATTERNS)) {
    return {
      action: "refuse",
      reason: "secrets_request",
      safeReply:
        "I can’t help with requests for secrets like API keys or credentials. I can help you with phone recommendations and comparisons."
    };
  }

  if (contains(DEFAMATION_PATTERNS)) {
    return {
      action: "refuse",
      reason: "defamation_or_toxic",
      safeReply:
        "I can’t insult or attack brands or people. If you tell me your budget and priorities, I can compare options neutrally and explain trade-offs."
    };
  }
  // Priority 4: Check for defamatory or toxic language
  // Discourage abusive or insulting content about brands and products
  // Priority 5: Check for relevance to shopping and mobile phones
  // Only consider a message off-topic if it's substantial in length (> 20 chars)
  // This prevents false positives on short queries like "hi" or "help"
  const shoppingSignals = [
    "phone",
    "mobile",
    "camera",
    "battery",
    "android",
    "iphone",
    "samsung",
    "pixel",
    "oneplus",
    "price",
    "buy",
    "recommend",
    "compare",
    "features",
    "spec",
    "performance",
    "storage",
    "screen",
    "display"
  ];
  const looksRelevant = shoppingSignals.some((s) => t.includes(s));

  // Decline off-topic queries that are substantial in length

  if (!looksRelevant && t.length > 20) {
    return {
      action: "refuse",
      reason: "irrelevant",
      safeReply:
        "I’m here to help with mobile phone shopping—recommendations, comparisons, and feature explanations. What’s your budget and top priority (camera/battery/performance/compact)?"
    };
  }

  // If no safety issues were detected, allow the request to proceed normally
  // The response generation layer will handle creating an appropriate reply
  return { action: "allow" };
}
