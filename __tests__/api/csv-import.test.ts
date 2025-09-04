// CSV API の自動テスト例
import { POST } from '@/app/api/import/csv/route';
import { NextRequest } from 'next/server';

// Mock NextRequest properly for testing
const createMockRequest = (url: string, init?: RequestInit) => {
  const request = {
    url,
    method: init?.method || 'GET',
    headers: new Headers(),
    formData: () => Promise.resolve(init?.body instanceof FormData ? init.body : new FormData()),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as any;
  return request as NextRequest;
};

// Mock the Supabase module differently for unauthenticated test
const mockUnauthenticatedClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' }
    }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
};

describe('CSV Import API', () => {
  it('should require authentication', async () => {
    // Mock unauthenticated user for this test
    jest.doMock('@/lib/supabase/server', () => ({
      createServerClient: jest.fn(() => mockUnauthenticatedClient),
      createSimpleServerClient: jest.fn(() => mockUnauthenticatedClient),
    }));

    const request = createMockRequest('http://localhost:3000/api/import/csv', {
      method: 'POST',
      body: new FormData()
    });

    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
    
    jest.dontMock('@/lib/supabase/server');
  });

  it('should handle missing file with authenticated user', async () => {
    const request = createMockRequest('http://localhost:3000/api/import/csv', {
      method: 'POST',
      body: new FormData() // No file attached
    });

    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toBe('ファイルが選択されていません');
  });
});