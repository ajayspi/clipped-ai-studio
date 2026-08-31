/**
 * Clipped E2E Test Harness
 * Robust assertion library, mock Supabase interceptor, Next.js Request simulator, and runner engine.
 */

import { TestCase, TestResult, SuiteSummary } from './types';

// Mock Supabase Store to verify database inserts
export class MockSupabaseStore {
  public records: Record<string, any[]> = {
    render_jobs: [],
    videos: [],
    settings: [],
    users: [],
    api_credits: [],
    published_videos: [],
  };

  insert(table: string, record: any) {
    if (!this.records[table]) {
      this.records[table] = [];
    }
    const inserted = {
      ...record,
      id: record.id || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
    this.records[table].push(inserted);
    return inserted;
  }

  from(table: string) {
    const store = this;
    if (!store.records[table]) {
      store.records[table] = [];
    }

    return {
      insert: async (data: any | any[]) => {
        const items = Array.isArray(data) ? data : [data];
        const inserted = items.map((item) => store.insert(table, item));
        return { data: Array.isArray(data) ? inserted : inserted[0], error: null };
      },
      select: (fields?: string, options?: any) => {
        const filters: Record<string, any> = {};
        const inFilters: Record<string, any[]> = {};

        const queryObj: any = {
          eq(field: string, value: any) {
            filters[field] = value;
            return queryObj;
          },
          in(field: string, values: any[]) {
            inFilters[field] = values;
            return queryObj;
          },
          single: async () => {
            const list = (store.records[table] || []).filter((r) => {
              for (const [k, v] of Object.entries(filters)) {
                if (r[k] !== v) return false;
              }
              for (const [k, vs] of Object.entries(inFilters)) {
                if (!vs.includes(r[k])) return false;
              }
              return true;
            });
            const found = list[0] || null;
            return { data: found, error: found ? null : { message: 'Not found' } };
          },
          then(resolve: any, reject?: any) {
            const list = (store.records[table] || []).filter((r) => {
              for (const [k, v] of Object.entries(filters)) {
                if (r[k] !== v) return false;
              }
              for (const [k, vs] of Object.entries(inFilters)) {
                if (!vs.includes(r[k])) return false;
              }
              return true;
            });
            return Promise.resolve({
              data: list,
              count: list.length,
              error: null,
            }).then(resolve, reject);
          },
        };

        return queryObj;
      },
      update: (updates: any) => {
        const filters: Record<string, any> = {};

        const updateObj: any = {
          eq(field: string, value: any) {
            filters[field] = value;
            return updateObj;
          },
          then(resolve: any, reject?: any) {
            const tableList = store.records[table] || [];
            let updatedCount = 0;
            for (let i = 0; i < tableList.length; i++) {
              let match = true;
              for (const [k, v] of Object.entries(filters)) {
                if (tableList[i][k] !== v) {
                  match = false;
                  break;
                }
              }
              if (match) {
                tableList[i] = {
                  ...tableList[i],
                  ...updates,
                  updated_at: new Date().toISOString(),
                };
                updatedCount++;
              }
            }
            return Promise.resolve({ data: updates, count: updatedCount, error: null }).then(resolve, reject);
          },
        };

        return updateObj;
      },
    };
  }

  clear() {
    this.records = {
      render_jobs: [],
      videos: [],
      settings: [],
      users: [],
      api_credits: [],
      published_videos: [],
    };
  }
}

export const mockSupabase = new MockSupabaseStore();

// Assertion Helpers
export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected equality:\nActual:   ${a}\nExpected: ${b}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined, but received ${actual}`);
      }
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== 'number' || actual <= n) {
        throw new Error(`Expected ${actual} to be greater than ${n}`);
      }
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof actual !== 'number' || actual < n) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${n}`);
      }
    },
    toBeLessThanOrEqual(n: number) {
      if (typeof actual !== 'number' || actual > n) {
        throw new Error(`Expected ${actual} to be less than or equal to ${n}`);
      }
    },
    toContain(expectedItem: any) {
      if (Array.isArray(actual)) {
        if (!actual.includes(expectedItem)) {
          throw new Error(`Expected array ${JSON.stringify(actual)} to contain ${JSON.stringify(expectedItem)}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(expectedItem)) {
          throw new Error(`Expected string "${actual}" to contain "${expectedItem}"`);
        }
      } else {
        throw new Error(`toContain called on non-array, non-string: ${typeof actual}`);
      }
    },
    toMatch(regex: RegExp) {
      if (typeof actual !== 'string' || !regex.test(actual)) {
        throw new Error(`Expected "${actual}" to match regex ${regex.toString()}`);
      }
    },
    toBeInstanceOf(cls: any) {
      if (!(actual instanceof cls)) {
        throw new Error(`Expected instance of ${cls.name}`);
      }
    },
    toHaveProperty(prop: string) {
      if (actual === null || actual === undefined || !(prop in actual)) {
        throw new Error(`Expected object to have property "${prop}", but keys were: ${Object.keys(actual || {})}`);
      }
    },
    toThrow(expectedMessageSubstr?: string) {
      if (typeof actual !== 'function') {
        throw new Error(`Expected a function for toThrow assertion`);
      }
      let threw = false;
      let errorMsg = '';
      try {
        actual();
      } catch (err: any) {
        threw = true;
        errorMsg = err?.message || String(err);
      }
      if (!threw) {
        throw new Error(`Expected function to throw an error, but it returned normally`);
      }
      if (expectedMessageSubstr && !errorMsg.toLowerCase().includes(expectedMessageSubstr.toLowerCase())) {
        throw new Error(`Expected error message to contain "${expectedMessageSubstr}", but received "${errorMsg}"`);
      }
    },
    async toReject(expectedMessageSubstr?: string) {
      let threw = false;
      let errorMsg = '';
      try {
        if (typeof actual === 'function') {
          await actual();
        } else {
          await actual;
        }
      } catch (err: any) {
        threw = true;
        errorMsg = err?.message || String(err);
      }
      if (!threw) {
        throw new Error(`Expected promise/function to reject, but it resolved successfully`);
      }
      if (expectedMessageSubstr && !errorMsg.toLowerCase().includes(expectedMessageSubstr.toLowerCase())) {
        throw new Error(`Expected rejection message to contain "${expectedMessageSubstr}", but got "${errorMsg}"`);
      }
    },
  };
}

// Request Simulator for API Route Tests
export function createMockRequest(body: any, options: { method?: string; headers?: Record<string, string> } = {}): Request {
  const method = options.method || 'POST';
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  });

  return new Request('http://localhost:3000/api/test', {
    method,
    headers,
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
}

// Global Test Registry
export class TestRegistry {
  private tests: TestCase[] = [];

  register(testCase: TestCase) {
    this.tests.push(testCase);
  }

  getTests(filter?: { tier?: string; workflow?: string }) {
    return this.tests.filter((t) => {
      if (filter?.tier && t.tier !== filter.tier) return false;
      if (filter?.workflow && t.workflow !== filter.workflow) return false;
      return true;
    });
  }

  clear() {
    this.tests = [];
  }

  async run(filter?: { tier?: string; workflow?: string }): Promise<SuiteSummary> {
    const matchedTests = this.getTests(filter);
    const results: TestResult[] = [];
    const startTime = Date.now();

    for (const testCase of matchedTests) {
      mockSupabase.clear();
      const testStart = Date.now();
      try {
        await testCase.fn();
        results.push({
          id: testCase.id,
          tier: testCase.tier,
          workflow: testCase.workflow,
          title: testCase.title,
          passed: true,
          durationMs: Date.now() - testStart,
        });
      } catch (error: any) {
        results.push({
          id: testCase.id,
          tier: testCase.tier,
          workflow: testCase.workflow,
          title: testCase.title,
          passed: false,
          durationMs: Date.now() - testStart,
          error: error?.message || String(error),
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    return {
      total: results.length,
      passed,
      failed,
      durationMs,
      results,
    };
  }
}

export const registry = new TestRegistry();
