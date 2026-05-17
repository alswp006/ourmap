/**
 * Test utilities — auto DB cleanup + test data creation
 * Usage: const { getUser } = setupTestLifecycle();
 */

// 모바일은 API 기반이므로 fetch mock 헬퍼 제공
export function createMockFetch(responses: Record<string, { status: number; body: unknown }>): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const path = new URL(url, "http://localhost").pathname;
    const match = responses[path];
    if (match) {
      return new Response(JSON.stringify(match.body), {
        status: match.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
  };
}

// 테스트 유저 데이터 생성
export function createTestUser(overrides: { id?: string; email?: string; name?: string } = {}) {
  return {
    id: overrides.id ?? `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: overrides.email ?? `test-${Date.now()}@example.com`,
    name: overrides.name ?? "Test User",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// zustand store 리셋 헬퍼
export function resetStore<T>(useStore: { setState: (state: Partial<T>) => void; getInitialState?: () => T }): void {
  if (useStore.getInitialState) {
    useStore.setState(useStore.getInitialState());
  }
}
