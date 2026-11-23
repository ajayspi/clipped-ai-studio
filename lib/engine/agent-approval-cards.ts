/**
 * Agent Approval Cards & Cost Safety Protocol
 * 
 * Ported & adapted from nickvasilescu/parallax (src/server/agent/tools.ts & hermes.ts):
 * Prevents autonomous agents from silently draining credits or running expensive
 * video generation jobs without explicit human confirmation.
 * 
 * Flow:
 * 1. Agent plans a generation (e.g. 5 video shots with Kling/Wan).
 * 2. System computes an exact credit / USD cost quote.
 * 3. System issues an interactive Approval Card (`ask`).
 * 4. User allows ("Allow" or "Always Allow" this session) or denies.
 * 5. Execution proceeds only after verified approval.
 */

export interface GenerationQuote {
  modelId: string;
  mediaKind: 'image' | 'video' | 'speech' | 'music';
  durationSeconds?: number;
  credits: number;
  estimatedUsd: number;
}

export interface ApprovalCard {
  id: string;
  kind: 'approval' | 'question';
  tool: string;
  title: string;
  description: string;
  quote: GenerationQuote;
  promptSnippet: string;
  params: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'allowed' | 'always' | 'denied' | 'expired';
}

export interface PolicyRule {
  tool: string;
  alwaysAllow: boolean;
  maxCreditsPerJob: number;
}

export class AgentSafetyGovernor {
  private activeCards: Map<string, ApprovalCard> = new Map();
  private sessionPolicies: Map<string, PolicyRule> = new Map();
  private dailySpentUsd: number = 0;
  private dailyBudgetUsd: number;

  constructor(dailyBudgetUsd: number = 10.0) {
    this.dailyBudgetUsd = dailyBudgetUsd;
  }

  getDailyBudget(): { spent: number; limit: number; remaining: number } {
    return {
      spent: Number(this.dailySpentUsd.toFixed(2)),
      limit: this.dailyBudgetUsd,
      remaining: Number(Math.max(0, this.dailyBudgetUsd - this.dailySpentUsd).toFixed(2))
    };
  }

  setSessionPolicy(tool: string, alwaysAllow: boolean, maxCredits: number = 50): void {
    this.sessionPolicies.set(tool, {
      tool,
      alwaysAllow,
      maxCreditsPerJob: maxCredits
    });
  }

  hasAlwaysAllow(tool: string): boolean {
    const policy = this.sessionPolicies.get(tool);
    return Boolean(policy && policy.alwaysAllow);
  }

  requestApproval(
    tool: string,
    prompt: string,
    quote: GenerationQuote,
    params: Record<string, unknown> = {}
  ): { needsApproval: boolean; card?: ApprovalCard } {
    // 1. Check daily budget ceiling
    if (this.dailySpentUsd + quote.estimatedUsd > this.dailyBudgetUsd) {
      throw new Error(
        `Budget Exceeded: Job ($${quote.estimatedUsd.toFixed(2)}) would exceed daily safety limit ($${this.dailyBudgetUsd.toFixed(2)}).`
      );
    }

    // 2. Check if tool is pre-approved for this session
    const policy = this.sessionPolicies.get(tool);
    if (policy && policy.alwaysAllow && quote.credits <= policy.maxCreditsPerJob) {
      this.dailySpentUsd += quote.estimatedUsd;
      return { needsApproval: false };
    }

    // 3. Issue Approval Card
    const cardId = `card_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const card: ApprovalCard = {
      id: cardId,
      kind: 'approval',
      tool,
      title: `Approve ${quote.mediaKind.toUpperCase()} Generation`,
      description: `Agent requested to generate ${quote.mediaKind} using ${quote.modelId}.`,
      quote,
      promptSnippet: prompt.length > 120 ? prompt.slice(0, 117) + '...' : prompt,
      params,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minute expiry
      status: 'pending'
    };

    this.activeCards.set(cardId, card);
    return { needsApproval: true, card };
  }

  resolveApproval(
    cardId: string,
    decision: 'allowed' | 'always' | 'denied'
  ): ApprovalCard {
    const card = this.activeCards.get(cardId);
    if (!card) {
      throw new Error(`Approval card not found: ${cardId}`);
    }

    if (Date.now() > card.expiresAt) {
      card.status = 'expired';
      throw new Error(`Approval card has expired: ${cardId}`);
    }

    card.status = decision;

    if (decision === 'allowed' || decision === 'always') {
      this.dailySpentUsd += card.quote.estimatedUsd;
    }

    if (decision === 'always') {
      this.setSessionPolicy(card.tool, true, 100);
    }

    return card;
  }

  getPendingCards(): ApprovalCard[] {
    const now = Date.now();
    return Array.from(this.activeCards.values()).filter(
      c => c.status === 'pending' && c.expiresAt > now
    );
  }
}

export const globalAgentGovernor = new AgentSafetyGovernor(10.0);

