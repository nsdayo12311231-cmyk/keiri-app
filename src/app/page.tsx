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
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-8">
            <Calculator className="h-16 w-16 text-primary" />
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
            フリーランスの
            <span className="text-primary">経理</span>を
            <br />
            もっと簡単に
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg leading-8 text-muted-foreground mb-10">
            税の知識がなくても大丈夫。レシート撮影から確定申告まで、
            AIがサポートする経理ウェブアプリ「Keiri」
          </p>
          
          <div className="flex items-center justify-center gap-x-6">
            <Button size="lg" asChild>
              <Link href="/auth/signup">
                無料で始める
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/demo">
                デモを見る
              </Link>
            </Button>
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
      <section className="py-24">
        <div className="mx-auto max-w-2xl text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-6">
            今すぐ始めてみませんか？
          </h2>
          <p className="text-lg leading-8 text-muted-foreground mb-10">
            無料プランでお試しいただけます。確定申告の準備を今年こそスムーズに。
          </p>
          <Button size="lg" asChild>
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
