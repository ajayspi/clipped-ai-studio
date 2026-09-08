/**
 * AI LLM Helper Module
 * Re-exports unified LLM engine complete() and parseJson() facades
 * backed dynamically by OmniRoute gateway configuration.
 */

export { parseJson, complete, type LLMCompletionRequest } from '@/lib/engine/llm';
