import Link from "next/link";
import { Calculator, Receipt, PieChart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-24 sm:px-6 lg:px-8">
        {/* Subtle gradient overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-8">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
              <Calculator className="h-16 w-16 text-blue-400" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-6 drop-shadow-lg">
            フリーランスの
            <span className="text-blue-400 bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">経理</span>を
            <br />
            もっと簡単に
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg leading-8 text-gray-300 mb-10">
            税の知識がなくても大丈夫。レシート撮影から確定申告まで、
            AIがサポートする経理ウェブアプリ「Keiri」
          </p>
          
          <div className="flex items-center justify-center gap-x-6">
            <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-300">
              <Link href="/auth/signup">
                無料で始める
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800 hover:border-gray-500 backdrop-blur-sm transition-all duration-300">
              <Link href="/demo">
                デモを見る
              </Link>
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
              <span className="text-gray-300 text-sm">既にアカウントをお持ちの方は</span>
              <Link 
                href="/auth/signin"
                className="text-blue-400 hover:text-blue-300 font-medium text-sm underline decoration-blue-400/50 hover:decoration-blue-300 underline-offset-2 transition-all duration-300"
              >
                ログイン
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              主な機能
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              フリーランスに特化した、使いやすい機能をご用意
            </p>
          </div>
          
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative rounded-2xl border border-border bg-background p-8 shadow-sm">
              <Receipt className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                レシート自動読取
              </h3>
              <p className="text-muted-foreground">
                スマホで撮影するだけで、レシートの内容を自動で読み取り、仕訳を提案します
              </p>
            </div>
            
            <div className="relative rounded-2xl border border-border bg-background p-8 shadow-sm">
              <PieChart className="h-8 w-8 text-success mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                事業・私費を瞬間判定
              </h3>
              <p className="text-muted-foreground">
                AIが取引内容を分析し、事業用か私用かを自動で判定。手間を大幅に削減
              </p>
            </div>
            
            <div className="relative rounded-2xl border border-border bg-background p-8 shadow-sm">
              <Shield className="h-8 w-8 text-secondary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                安心の確認機能
              </h3>
              <p className="text-muted-foreground">
                AI提案は確信度付きで表示。最終確認はあなたが行うので安心です
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/20 to-black/40 pointer-events-none" />
        <div className="relative mx-auto max-w-2xl text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">
            今すぐ始めてみませんか？
          </h2>
          <p className="text-lg leading-8 text-gray-300 mb-10">
            無料プランでお試しいただけます。確定申告の準備を今年こそスムーズに。
          </p>
          <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-300">
            <Link href="/auth/signup">
              無料で始める
            </Link>
          </Button>
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
