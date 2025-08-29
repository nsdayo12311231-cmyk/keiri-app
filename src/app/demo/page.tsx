import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { DemoClient } from '@/components/demo/demo-client';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-6xl mx-auto">
          <DemoClient />
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}