import { describe, it, expect } from 'vitest';
import {
  VIDEO_MICRO_APPS,
  compileMicroAppPrompt
} from '@/lib/engine/video-micro-apps';
import {
  AgentSafetyGovernor,
  globalAgentGovernor,
  type GenerationQuote
} from '@/lib/engine/agent-approval-cards';

describe('Parallax Technology Port: Micro-Apps & Agent Approval Cards', () => {
  describe('Video Micro-Apps Catalog', () => {
    it('registers all 7 canonical single-purpose video creator apps', () => {
      expect(VIDEO_MICRO_APPS['camera-move']).toBeDefined();
      expect(VIDEO_MICRO_APPS['frame-to-frame']).toBeDefined();
      expect(VIDEO_MICRO_APPS['product-spin']).toBeDefined();
      expect(VIDEO_MICRO_APPS['talking-photo']).toBeDefined();
      expect(VIDEO_MICRO_APPS['reveal']).toBeDefined();
      expect(VIDEO_MICRO_APPS['time-lapse']).toBeDefined();
      expect(VIDEO_MICRO_APPS['animate-photo']).toBeDefined();
    });

    it('compiles camera-move prompt with resolved movement phrase', () => {
      const compiled = compileMicroAppPrompt(
        'camera-move',
        { move: 'dolly-in' },
        { still: 'asset_image_123' }
      );

      expect(compiled.appId).toBe('camera-move');
      expect(compiled.modelId).toBe('kling-v1');
      expect(compiled.prompt).toContain('a slow deliberate dolly-in push towards the subject');
      expect(compiled.inputAssignments.still).toBe('asset_image_123');
    });

    it('compiles product turntable with studio cyclorama lighting and backdrop', () => {
      const compiled = compileMicroAppPrompt(
        'product-spin',
        { backdrop: 'white-studio' },
        { productImage: 'asset_shoe_99' }
      );

      expect(compiled.appId).toBe('product-spin');
      expect(compiled.aspectRatio).toBe('1:1');
      expect(compiled.prompt).toContain('360-degree rotation on a rotating turntable');
      expect(compiled.prompt).toContain('pure white seamless infinity cyclorama studio');
    });

    it('throws validation error when required input asset is omitted', () => {
      expect(() => {
        compileMicroAppPrompt('product-spin', { backdrop: 'black-studio' }, {});
      }).toThrow(/requires input: Product Photo/);
    });

    it('interpolates conditional fields correctly', () => {
      const withHow = compileMicroAppPrompt(
        'frame-to-frame',
        { how: 'petals unroll in morning sunlight' },
        { startFrame: 'f1', endFrame: 'f2' }
      );
      expect(withHow.prompt).toContain('petals unroll in morning sunlight');

      const withoutHow = compileMicroAppPrompt(
        'frame-to-frame',
        {},
        { startFrame: 'f1', endFrame: 'f2' }
      );
      expect(withoutHow.prompt).not.toContain('petals');
      expect(withoutHow.prompt).toContain('starting exactly on the first frame');
    });
  });

  describe('Agent Safety Governor & Approval Cards', () => {
    it('issues interactive approval card with cost quote when agent requests generation', () => {
      const governor = new AgentSafetyGovernor(10.0);
      const quote: GenerationQuote = {
        modelId: 'kling-v1',
        mediaKind: 'video',
        durationSeconds: 5,
        credits: 15,
        estimatedUsd: 0.15
      };

      const result = governor.requestApproval(
        'generate_video',
        'A cinematic drone flight over mountain peaks at sunset.',
        quote
      );

      expect(result.needsApproval).toBe(true);
      expect(result.card).toBeDefined();
      expect(result.card?.status).toBe('pending');
      expect(result.card?.quote.credits).toBe(15);
      expect(result.card?.quote.estimatedUsd).toBe(0.15);
    });

    it('resolves approval card and updates spent budget', () => {
      const governor = new AgentSafetyGovernor(10.0);
      const quote: GenerationQuote = {
        modelId: 'wan-2.1',
        mediaKind: 'video',
        durationSeconds: 4,
        credits: 10,
        estimatedUsd: 0.10
      };

      const { card } = governor.requestApproval('generate_video', 'Scene prompt', quote);
      expect(card).toBeDefined();

      const resolved = governor.resolveApproval(card!.id, 'allowed');
      expect(resolved.status).toBe('allowed');

      const budget = governor.getDailyBudget();
      expect(budget.spent).toBe(0.10);
      expect(budget.remaining).toBe(9.90);
    });

    it('bypasses subsequent approvals when "always" policy is enabled', () => {
      const governor = new AgentSafetyGovernor(10.0);
      const quote: GenerationQuote = {
        modelId: 'flux-schnell',
        mediaKind: 'image',
        credits: 2,
        estimatedUsd: 0.02
      };

      const { card } = governor.requestApproval('generate_image', 'Thumbnail prompt', quote);
      governor.resolveApproval(card!.id, 'always');

      // Second request under policy requires no manual approval
      const nextResult = governor.requestApproval('generate_image', 'Second image', quote);
      expect(nextResult.needsApproval).toBe(false);
      expect(governor.getDailyBudget().spent).toBe(0.04);
    });

    it('enforces daily budget cap and prevents runaway agent generation', () => {
      const smallGovernor = new AgentSafetyGovernor(0.50); // $0.50 cap
      const expensiveQuote: GenerationQuote = {
        modelId: 'runway-gen3',
        mediaKind: 'video',
        credits: 100,
        estimatedUsd: 1.00 // Exceeds $0.50!
      };

      expect(() => {
        smallGovernor.requestApproval('generate_video', 'Heavy prompt', expensiveQuote);
      }).toThrow(/Budget Exceeded/);
    });
    it('provides global singleton governor instance', () => {
      expect(globalAgentGovernor).toBeInstanceOf(AgentSafetyGovernor);
      expect(globalAgentGovernor.getDailyBudget().limit).toBe(10.0);
    });
  });
});
