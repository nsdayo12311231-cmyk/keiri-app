// CSV API の自動テスト例
import { POST } from '@/app/api/import/csv/route';
import { NextRequest } from 'next/server';

describe('CSV Import API', () => {
  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/import/csv', {
      method: 'POST',
      body: new FormData()
    });

    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });

  it('should handle valid CSV file', async () => {
    // 認証付きリクエストのテスト
    // モックユーザーでのテスト等
  });
});