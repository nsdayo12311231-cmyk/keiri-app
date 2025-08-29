'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Receipt, 
  PieChart, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Upload,
  CheckCircle,
  Clock,
  BarChart3,
  Settings
} from 'lucide-react';
import Link from 'next/link';

// デモ用のサンプルデータ
const DEMO_TRANSACTIONS = [
  {
    id: '1',
    date: '2024-08-26',
    description: 'スターバックス コーヒー',
    amount: 580,
    category: '会議費',
    isBusiness: true,
    confidence: 0.92,
    status: 'confirmed'
  },
  {
    id: '2',
    date: '2024-08-25',
    description: 'コクヨ 文房具購入',
    amount: 2340,
    category: '消耗品費',
    isBusiness: true,
    confidence: 0.88,
    status: 'pending'
  },
  {
    id: '3',
    date: '2024-08-24',
    description: 'ランチ（個人）',
    amount: 1200,
    category: '食費',
    isBusiness: false,
    confidence: 0.95,
    status: 'confirmed'
  },
  {
    id: '4',
    date: '2024-08-23',
    description: 'パーキングメーター',
    amount: 300,
    category: '旅費交通費',
    isBusiness: true,
    confidence: 0.89,
    status: 'confirmed'
  }
];

const DEMO_RECEIPTS = [
  {
    id: '1',
    image: '/api/placeholder/300/400',
    merchant: 'スターバックス',
    amount: 580,
    status: 'processed',
    aiClassification: '会議費'
  },
  {
    id: '2',
    image: '/api/placeholder/300/400',
    merchant: 'コクヨ',
    amount: 2340,
    status: 'processing',
    aiClassification: '消耗品費'
  }
];

type DemoTab = 'dashboard' | 'receipts' | 'transactions' | 'reports' | 'tax' | 'settings';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<DemoTab>('dashboard');

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* 統計カード */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700 dark:text-green-300">今月の収入</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">¥350,000</div>
            <p className="text-xs text-green-600/70">前月比 +12%</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700 dark:text-red-300">今月の支出</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">¥89,420</div>
            <p className="text-xs text-red-600/70">前月比 -5%</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700 dark:text-blue-300">純利益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">¥260,580</div>
            <p className="text-xs text-blue-600/70">利益率 74%</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-700 dark:text-purple-300">AI分類済み</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">156件</div>
            <p className="text-xs text-purple-600/70">自動分類率 92%</p>
          </CardContent>
        </Card>
      </div>

      {/* 最近の取引 */}
      <Card>
        <CardHeader>
          <CardTitle>最近の取引</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DEMO_TRANSACTIONS.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${tx.isBusiness ? 'bg-blue-100 dark:bg-blue-900' : 'bg-green-100 dark:bg-green-900'}`}>
                    {tx.isBusiness ? <Calculator className="h-4 w-4 text-blue-600" /> : <Receipt className="h-4 w-4 text-green-600" />}
                  </div>
                  <div>
                    <div className="font-medium">{tx.description}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{tx.date}</span>
                      <Badge variant={tx.isBusiness ? 'default' : 'secondary'} className="text-xs">
                        {tx.category}
                      </Badge>
                      <span className="text-xs">信頼度: {Math.round(tx.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(tx.amount)}</div>
                  {tx.status === 'confirmed' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-500 ml-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const [uploadedReceipt, setUploadedReceipt] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [classification, setClassification] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [demoUsageCount, setDemoUsageCount] = useState(0);
  const [isEditingClassification, setIsEditingClassification] = useState(false);
  const [tempCategory, setTempCategory] = useState('');
  const [tempIsBusiness, setTempIsBusiness] = useState(true);
  const DEMO_LIMIT = 5;

  // 基本設定（実際はlocalStorageやDBに保存）
  const [parkingDefault, setParkingDefault] = useState<'business' | 'personal'>('business');
  

  // 事業/個人支出の精密判定関数
  const enhanceBusinessPersonalClassification = (ocrText: string, merchant: string, baseResult: any) => {
    const text = (ocrText + ' ' + merchant).toLowerCase();
    console.log('=== 事業/個人判定強化 ===');
    console.log('分析テキスト:', text);
    console.log('基本分類:', baseResult);
    
    // 優先度の高い事業用キーワード
    const highPriorityBusiness = [
      'エナジー', 'モンスター', 'レッドブル', 'energy', 'monster', 'redbull',
      'コーヒー', 'coffee', 'スターバックス', 'starbucks',
      '駐車場', 'パーキング', 'parking', '駐車料金', 'らっぽーと', 'ららぽーと',
      'タクシー', '電車', 'JR', '地下鉄',
      '文房具', 'ボールペン', 'ノート', '事務用品',
      '出張', '業務', '仕事', '会社', '営業', '打合せ'
    ];
    
    // 優先度の高い個人用キーワード  
    const highPriorityPersonal = [
      'お弁当', '弁当', 'ランチ', '昼食', '夕食', '朝食',
      'パン', 'おにぎり', 'サンドイッチ',
      '薬局', '病院', '医療', '薬',
      '服', '洋服', '靴', 'ファッション',
      '娯楽', '映画', 'ゲーム'
    ];
    
    // 事業用の強い指標
    let businessScore = 0;
    let personalScore = 0;
    
    highPriorityBusiness.forEach(keyword => {
      if (text.includes(keyword)) {
        businessScore += 2;
        console.log(`事業用キーワード発見: ${keyword} (+2)`);
      }
    });
    
    highPriorityPersonal.forEach(keyword => {
      if (text.includes(keyword)) {
        personalScore += 2;
        console.log(`個人用キーワード発見: ${keyword} (+2)`);
      }
    });
    
    // コンビニでも事業用商品があれば事業扱い
    if (/セブン|ローソン|ファミマ|コンビニ/i.test(text)) {
      if (businessScore > 0) {
        console.log('コンビニだが事業用商品のため事業扱い');
        return {
          categoryName: '会議費',
          isBusiness: true,
          confidence: 0.85,
          reasoning: 'コンビニでの事業関連商品購入'
        };
      } else {
        console.log('コンビニでの一般商品のため個人扱い');
        return {
          categoryName: '食費',
          isBusiness: false,
          confidence: 0.8,
          reasoning: 'コンビニでの個人消費'
        };
      }
    }
    
    // 駐車場・交通費の設定ベース判定
    if (/駐車場|パーキング|駐車料金/i.test(text)) {
      const isBusinessParking = parkingDefault === 'business';
      console.log(`駐車場関連を設定(${parkingDefault})に基づいて分類: ${isBusinessParking ? '事業用' : '個人用'}`);
      return {
        categoryName: isBusinessParking ? '旅費交通費' : '交通費',
        isBusiness: isBusinessParking,
        confidence: 0.85,
        reasoning: `設定により駐車料金を${isBusinessParking ? '事業用' : '個人用'}として判定`
      };
    }
    
    // スコア判定
    console.log(`スコア判定: 事業${businessScore} vs 個人${personalScore}`);
    
    if (businessScore > personalScore) {
      // 駐車場関連なら旅費交通費、それ以外なら会議費または雑費
      let categoryName = '雑費';
      if (text.includes('駐車') || text.includes('パーキング')) {
        categoryName = '旅費交通費';
      } else if (businessScore >= 4) {
        categoryName = '会議費';
      }
      
      return {
        categoryName: categoryName,
        isBusiness: true,
        confidence: Math.min(0.9, 0.6 + (businessScore * 0.1)),
        reasoning: '事業関連キーワードによる判定'
      };
    } else if (personalScore > businessScore) {
      return {
        categoryName: '食費',
        isBusiness: false,
        confidence: Math.min(0.9, 0.6 + (personalScore * 0.1)),
        reasoning: '個人消費キーワードによる判定'
      };
    }
    
    // 元の結果を返す
    return baseResult;
  };

  const processReceiptWithRealOCR = async (imageBase64: string) => {
    try {
      // デバッグ用ログ追加
      console.log('=== 環境変数チェック ===');
      console.log('NEXT_PUBLIC_GEMINI_API_KEY exists:', !!process.env.NEXT_PUBLIC_GEMINI_API_KEY);
      console.log('NEXT_PUBLIC_GOOGLE_VISION_API_KEY exists:', !!process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY);
      
      const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY;
      const apiKey = geminiApiKey || googleApiKey;
      
      console.log('Selected API Key (first 10):', apiKey?.substring(0, 10));
      console.log('Image size:', imageBase64.length);
      
      if (!apiKey) {
        console.error('API key not found in environment variables');
        throw new Error('API key not found');
      }
      
      // 本番と同じReceiptOCRクラスを使用するためのインポート
      const { ReceiptOCR } = await import('@/lib/ocr/vision-api');
      
      const useGemini = !!geminiApiKey;
      const receiptOCR = new ReceiptOCR(apiKey, useGemini);
      
      console.log('=== デモOCR処理開始 ===');
      console.log('Using Gemini:', useGemini);
      console.log('API Key (first 10 chars):', apiKey.substring(0, 10));
      
      // 本番と完全に同じ処理を実行
      const result = await receiptOCR.processReceipt(imageBase64);
      console.log('=== 詳細OCR結果 ===');
      console.log('OCR Text:', result.ocrText);
      console.log('Extracted Data:', result.extractedData);
      
      const { ocrText, extractedData } = result;
      
      return {
        merchant: extractedData.merchantName,
        amount: extractedData.amount,
        date: extractedData.date,
        items: [extractedData.description || '購入商品'],
        category: extractedData.category || '雑費',
        confidence: extractedData.confidence || 0.8,
        ocrText: ocrText
      };
    } catch (error) {
      console.error('Real OCR failed:', error);
      throw error;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 使用回数制限チェック
    if (demoUsageCount >= DEMO_LIMIT) {
      alert(`デモ版では${DEMO_LIMIT}回までのOCR体験が可能です。\n本格的にご利用になりたい場合は、無料アカウントを作成してください。`);
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const imageBase64 = e.target?.result as string;
      setUploadedReceipt(imageBase64);
      
      try {
        // 実際のOCR処理を実行
        const ocrResult = await processReceiptWithRealOCR(imageBase64);
        setOcrResult(ocrResult);
        
        // 使用回数をインクリメント
        setDemoUsageCount(prev => prev + 1);
        
        // 本格的なAI分類処理（本番と完全に同じロジック）
        setTimeout(async () => {
          try {
            // 分類システムをインポート
            const { autoClassifyReceipt } = await import('@/lib/utils/receipt-classifier');
            const { classifyWithAI } = await import('@/lib/classification/huggingface-classifier');
            const { classifyWithOpenAI } = await import('@/lib/classification/openai-classifier');
            
            console.log('=== ハイブリッドAI分類開始 ===');
            console.log('店舗名:', ocrResult.merchant);
            console.log('金額:', ocrResult.amount);
            console.log('OCRテキスト:', ocrResult.ocrText);
            
            // 検索対象テキスト（本番と同じ）
            const searchText = `${ocrResult.items?.join(' ') || ''} ${ocrResult.merchant || ''} ${ocrResult.ocrText || ''}`.toLowerCase();
            console.log('🔍 キーワード検索対象:', searchText.substring(0, 300));
            
            // エナジードリンクキーワードチェック（本番と同じ）
            const energyKeywords = ['エナジー', 'energy', 'レッドブル', 'redbull', 'モンスター', 'monster', 'リポビタン'];
            const foundEnergyKeywords = energyKeywords.filter(keyword => searchText.includes(keyword));
            if (foundEnergyKeywords.length > 0) {
              console.log('⚡ エナジードリンクキーワード検出:', foundEnergyKeywords);
            } else {
              console.log('⚠️ エナジードリンクキーワードが見つかりません');
            }
            
            let classificationResult = null;
            let openaiResult = null;
            
            // 1. OpenAI分類を試行（本番と同じ順序）
            try {
              console.log('🤖 OpenAI分類を試行中...');
              const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
              if (openaiKey) {
                const { setOpenAIApiKey } = await import('@/lib/classification/openai-classifier');
                setOpenAIApiKey(openaiKey);
                openaiResult = await classifyWithOpenAI(
                  ocrResult.ocrText || '',
                  ocrResult.amount,
                  ocrResult.merchant
                );
                console.log('OpenAI分類結果:', openaiResult);
                if (openaiResult && openaiResult.confidence >= 0.8) {
                  classificationResult = openaiResult;
                }
              }
            } catch (openaiError) {
              console.log('OpenAI分類失敗:', openaiError);
            }
            
            // 2. OpenAIが低精度の場合、Hugging Face AIを試行
            if (!classificationResult || classificationResult.confidence < 0.8) {
              try {
                console.log('🤗 Hugging Face AI分類を試行中...');
                const huggingResult = await classifyWithAI(
                  ocrResult.ocrText || '',
                  ocrResult.amount,
                  ocrResult.merchant
                );
                console.log('Hugging Face分類結果:', huggingResult);
                
                if (huggingResult && (!classificationResult || huggingResult.confidence > classificationResult.confidence)) {
                  classificationResult = huggingResult;
                }
              } catch (hfError) {
                console.log('Hugging Face分類失敗:', hfError);
              }
            }
            
            // 3. 両方のAIが低精度ならキーワード分類を併用
            if (!classificationResult || classificationResult.confidence < 0.6) {
              console.log('🔍 キーワードベース分類を実行...');
              const keywordResult = autoClassifyReceipt(
                ocrResult.items?.join(' ') || ocrResult.ocrText || '',
                ocrResult.amount,
                ocrResult.merchant,
                ocrResult.ocrText
              );
              console.log('キーワード分類結果:', keywordResult);
              
              // 4. さらに詳細な事業/個人判定を追加
              const enhancedResult = enhanceBusinessPersonalClassification(
                ocrResult.ocrText || '',
                ocrResult.merchant || '',
                keywordResult
              );
              console.log('強化分類結果:', enhancedResult);
              
              // 最も信頼度の高い結果を採用
              const candidates = [classificationResult, enhancedResult, keywordResult, openaiResult].filter(Boolean);
              if (candidates.length > 0) {
                classificationResult = candidates.reduce((best, current) => 
                  (current.confidence > best.confidence) ? current : best
                );
              }
            }
            
            // 最終的な分類結果
            let finalClassification = classificationResult;
            
            // 本番と完全に同じ最優先判定ルール
            const text = (ocrResult.ocrText || '').toLowerCase();
            
            // 1. 交通費の最優先判定
            if (/タクシー|taxi|駅|電車|jr|地下鉄|新幹線|バス|bus/i.test(text)) {
              console.log('🚆 交通手段を検出 - 旅費交通費に分類');
              finalClassification = {
                categoryName: '旅費交通費',
                isBusiness: true,
                confidence: 0.95,
                reasoning: '交通手段は事業用の旅費交通費として分類'
              };
            }
            // 2. 駐車場・パーキング判定（設定ベース）
            else if (/駐車場|パーキング|駐車料金/i.test(text)) {
              console.log('🚗 駐車場を検出 - 設定ベースで分類');
              const parkingIsBusiness = parkingDefault === 'business';
              finalClassification = {
                categoryName: parkingIsBusiness ? '旅費交通費' : '交通費',
                isBusiness: parkingIsBusiness,
                confidence: 0.90,
                reasoning: `駐車料金を設定に基づいて${parkingIsBusiness ? '事業用' : '個人用'}として分類`
              };
            }
            // 3. カフェ・コーヒー店判定
            else if (/カフェ|cafe|coffee|スターバックス|スタバ|タリーズ|ドトール/i.test(text)) {
              console.log('☕ カフェを検出 - 会議費に分類');
              finalClassification = {
                categoryName: '会議費',
                isBusiness: true,
                confidence: 0.90,
                reasoning: 'カフェでの支出は会議費として事業用分類'
              };
            }
            // 4. エナジードリンク・コーヒー・飲み物の最優先判定
            else if (/コーヒー|coffee|エナジー|energy|レッドブル|redbull|モンスター|monster|リポビタン|飲み物|ドリンク/i.test(text)) {
              console.log('🥤 飲み物を検出 - 会議費に分類');
              finalClassification = {
                categoryName: '会議費',
                isBusiness: true,
                confidence: 0.95,
                reasoning: 'エナジードリンク・コーヒーは業務関連飲料として会議費に分類'
              };
            }
            // 5. コンビニの金額ベース判定（飲み物は上記で処理済み）
            else if (/コンビニ|セブン|seven|ローソン|lawson|ファミマ|ファミリーマート/i.test(text)) {
              const isHighAmount = ocrResult.amount && ocrResult.amount > 3000;
              console.log(`🏪 コンビニを検出 - ${isHighAmount ? '消耗品費' : '食費'}に分類`);
              finalClassification = {
                categoryName: isHighAmount ? '消耗品費' : '食費',
                isBusiness: isHighAmount,
                confidence: 0.85,
                reasoning: isHighAmount ? 'コンビニ高額購入は消耗品費として事業用分類' : 'コンビニ少額購入は食費として個人用分類'
              };
            }
            // 6. 通信費判定
            else if (/通信|mobile|internet|電話|phone/i.test(text)) {
              console.log('📱 通信関連を検出 - 通信費に分類');
              finalClassification = {
                categoryName: '通信費',
                isBusiness: true,
                confidence: 0.95,
                reasoning: '通信関連支出は事業用通信費として分類'
              };
            }
            // 7. 金額ベースの推定（本番と同じロジック）
            else if (ocrResult.amount && ocrResult.amount > 10000) {
              console.log('💰 高額支出を検出 - 雑費に分類');
              finalClassification = {
                categoryName: '雑費',
                isBusiness: true,
                confidence: 0.70,
                reasoning: '高額支出は事業用雑費として分類'
              };
            }
            else if (ocrResult.amount && ocrResult.amount > 1000) {
              console.log('💵 中額支出を検出 - 会議費に分類');
              finalClassification = {
                categoryName: '会議費',
                isBusiness: true,
                confidence: 0.60,
                reasoning: '中額支出は事業用会議費として分類'
              };
            }
            
            // 分類結果のデバッグ
            console.log('=== 最終分類結果 ===');
            console.log('finalClassification:', finalClassification);
            
            // 分類結果がnullの場合の緊急対応
            if (!finalClassification) {
              console.log('⚠️ 分類結果がnull - 緊急フォールバック実行');
              const text = (ocrResult.ocrText || '').toLowerCase();
              
              if (/駐車場|パーキング|駐車料金/i.test(text)) {
                finalClassification = {
                  categoryName: '旅費交通費',
                  isBusiness: parkingDefault === 'business',
                  confidence: 0.9
                };
              } else if (/スターバックス|starbucks|コーヒー|coffee/i.test(text)) {
                finalClassification = {
                  categoryName: '会議費',
                  isBusiness: true,
                  confidence: 0.7
                };
              } else {
                finalClassification = {
                  categoryName: '雑費',
                  isBusiness: false,
                  confidence: 0.5
                };
              }
              console.log('緊急フォールバック結果:', finalClassification);
            }
            
            // さらなるデバッグ：最終結果の確認
            console.log('=== 最終確認 ===');
            console.log('カテゴリ:', finalClassification.categoryName);
            console.log('事業フラグ:', finalClassification.isBusiness);
            console.log('信頼度:', finalClassification.confidence);
            
            console.log('=== 分類完了 ===');
            console.log('最終カテゴリ:', finalClassification.categoryName);
            console.log('事業用区分:', finalClassification.isBusiness);
            console.log('信頼度:', finalClassification.confidence);
            
            // 表示前の最終チェック
            const displayIsBusiness = finalClassification.isBusiness;
            console.log('表示用事業フラグ:', displayIsBusiness);
            
            setClassification({
              category: finalClassification.categoryName,
              isBusiness: displayIsBusiness,
              confidence: finalClassification.confidence,
              reason: displayIsBusiness 
                ? `「${finalClassification.categoryName}」として事業用経費に分類されました` 
                : '個人的な支出として判定されました'
            });
            
          } catch (error) {
            console.error('=== 分類処理エラー詳細 ===');
            console.error('エラータイプ:', typeof error);
            console.error('エラーメッセージ:', error instanceof Error ? error.message : String(error));
            console.error('スタックトレース:', error instanceof Error ? error.stack : 'No stack');
            console.error('OCR結果:', ocrResult);
            console.error('分類対象テキスト:', ocrResult.ocrText);
            
            // 緊急デバッグ: 基本的なキーワード分類を直接実行
            console.log('=== 緊急フォールバック分類 ===');
            const text = (ocrResult.ocrText || '').toLowerCase();
            console.log('分析テキスト:', text);
            
            let fallbackCategory = '雑費';
            let fallbackIsBusiness = false;
            
            if (/スターバックス|starbucks|スタバ|コーヒー|coffee/i.test(text)) {
              fallbackCategory = '会議費';
              fallbackIsBusiness = true;
              console.log('→ コーヒー関連として会議費に分類');
            } else if (/エナジー|モンスター|energy|monster|redbull/i.test(text)) {
              fallbackCategory = '会議費';
              fallbackIsBusiness = true;
              console.log('→ エナジードリンクとして会議費に分類');
            } else if (/セブン|ローソン|ファミマ|コンビニ/i.test(text)) {
              fallbackCategory = '食費';
              fallbackIsBusiness = false;
              console.log('→ コンビニとして個人支出に分類');
            } else {
              console.log('→ キーワードマッチせず、雑費に分類');
            }
            
            setClassification({
              category: fallbackCategory,
              isBusiness: fallbackIsBusiness,
              confidence: 0.6,
              reason: isLikelyBusiness 
                ? 'キーワードに基づいて事業用として分類されました' 
                : '詳細分類できませんでした。確認してください。',
              journalEntry: {
                借方: { 
                  科目: fallbackIsBusiness ? fallbackCategory : '事業主借', 
                  金額: ocrResult.amount 
                },
                貸方: { 科目: '現金', 金額: ocrResult.amount },
                摘要: `${ocrResult.merchant || '店舗'}での購入`
              }
            });
          }
          
          setIsProcessing(false);
        }, 1000);
        
      } catch (error) {
        console.error('=== OCRエラー詳細 ===');
        console.error('Error type:', typeof error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
        console.error('Full error object:', error);
        
        let errorMessage = 'OCR処理に失敗しました。';
        if (error instanceof Error) {
          if (error.message.includes('API key')) {
            errorMessage = 'APIキーの設定に問題があります。';
          } else if (error.message.includes('fetch')) {
            errorMessage = 'ネットワーク接続に問題があります。Wi-Fi接続を確認してください。';
          } else if (error.message.includes('JSON')) {
            errorMessage = 'OCRレスポンスの解析に失敗しました。';
          } else {
            errorMessage = `OCR処理エラー: ${error.message}`;
          }
        }
        
        alert(errorMessage);
        setIsProcessing(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const renderReceipts = () => (
    <div className="space-y-6">
      {/* OCR体験セクション */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            レシートアップロード体験
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
              {!uploadedReceipt ? (
                <div>
                  <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">レシート画像をアップロードして自動読取を体験</p>
                  <p className="text-sm text-orange-600 mb-2">
                    デモ版: {demoUsageCount}/{DEMO_LIMIT}回利用済み
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <Button asChild>
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      画像を選択
                    </label>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* アップロード画像 */}
                  <div>
                    <h4 className="font-semibold mb-2">アップロード画像</h4>
                    <img 
                      src={uploadedReceipt} 
                      alt="アップロードされたレシート" 
                      className="w-full h-48 object-contain bg-gray-50 dark:bg-gray-800 rounded"
                    />
                  </div>
                  
                  {/* 処理結果 */}
                  <div>
                    <h4 className="font-semibold mb-2">OCR結果</h4>
                    {isProcessing ? (
                      <div className="flex items-center justify-center h-48">
                        <div className="text-center">
                          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-sm text-gray-500">AI処理中...</p>
                        </div>
                      </div>
                    ) : ocrResult ? (
                      <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded">
                        <div className="flex justify-between">
                          <span>店舗名:</span>
                          <span className="font-medium">{ocrResult.merchant}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>金額:</span>
                          <span className="font-medium">{formatCurrency(ocrResult.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>日付:</span>
                          <span className="font-medium">{ocrResult.date}</span>
                        </div>
                        <div>
                          <span>商品:</span>
                          <div className="mt-1">
                            {ocrResult.items.map((item: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="mr-1 mb-1">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {classification && (
                          <div className="border-t pt-3 mt-3">
                            <h5 className="font-semibold mb-2">AI自動分類</h5>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={classification.isBusiness ? 'default' : 'secondary'}>
                                  {classification.category}
                                </Badge>
                                <span className="text-sm">信頼度: {Math.round(classification.confidence * 100)}%</span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                {classification.reason}
                              </p>
                              
                              {/* 勘定科目の詳細説明・編集 */}
                              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border">
                                <div className="flex items-center justify-between mb-2">
                                  <h6 className="font-semibold text-green-800 dark:text-green-200">📋 勘定科目分類</h6>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      if (isEditingClassification) {
                                        // 保存
                                        setClassification({
                                          ...classification,
                                          category: tempCategory,
                                          isBusiness: tempIsBusiness,
                                          reason: '手動で修正されました'
                                        });
                                        setIsEditingClassification(false);
                                      } else {
                                        // 編集開始
                                        setTempCategory(classification.category);
                                        setTempIsBusiness(classification.isBusiness);
                                        setIsEditingClassification(true);
                                      }
                                    }}
                                    className="text-xs"
                                  >
                                    {isEditingClassification ? '保存' : '編集'}
                                  </Button>
                                </div>
                                
                                {isEditingClassification ? (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-sm font-medium">勘定科目:</label>
                                      <select 
                                        value={tempCategory}
                                        onChange={(e) => setTempCategory(e.target.value)}
                                        className="w-full mt-1 p-2 border rounded text-sm"
                                      >
                                        <option value="旅費交通費">旅費交通費</option>
                                        <option value="交通費">交通費（個人）</option>
                                        <option value="会議費">会議費</option>
                                        <option value="消耗品費">消耗品費</option>
                                        <option value="食費">食費</option>
                                        <option value="雑費">雑費</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">区分:</label>
                                      <div className="flex gap-2 mt-1">
                                        <label className="flex items-center text-sm">
                                          <input 
                                            type="radio" 
                                            name="businessType" 
                                            checked={tempIsBusiness}
                                            onChange={() => setTempIsBusiness(true)}
                                            className="mr-1"
                                          />
                                          事業用経費
                                        </label>
                                        <label className="flex items-center text-sm">
                                          <input 
                                            type="radio" 
                                            name="businessType" 
                                            checked={!tempIsBusiness}
                                            onChange={() => setTempIsBusiness(false)}
                                            className="mr-1"
                                          />
                                          個人支出
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm space-y-1">
                                    <div><span className="font-medium">分類結果:</span> {classification.category}</div>
                                    <div><span className="font-medium">区分:</span> 
                                      <Badge variant={classification.isBusiness ? 'default' : 'secondary'} className="ml-2">
                                        {classification.isBusiness ? '事業用経費' : '個人支出'}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                      💡 この分類は確定申告時に「{classification.category}」として計上されます
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
              
              {uploadedReceipt && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setUploadedReceipt(null);
                    setOcrResult(null);
                    setClassification(null);
                  }}
                  className="mt-4"
                >
                  リセット
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 処理済みレシート例 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            処理済みレシート例
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {DEMO_RECEIPTS.map((receipt) => (
              <div key={receipt.id} className="border rounded-lg p-4">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-48 flex items-center justify-center mb-4">
                  <Receipt className="h-12 w-12 text-gray-400" />
                  <div className="ml-2 text-gray-500">レシート画像</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{receipt.merchant}</span>
                    <span className="font-bold">{formatCurrency(receipt.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{receipt.aiClassification}</Badge>
                    <Badge variant={receipt.status === 'processed' ? 'default' : 'secondary'}>
                      {receipt.status === 'processed' ? '処理完了' : '処理中'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTransactions = () => (
    <Card>
      <CardHeader>
        <CardTitle>取引管理デモ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">日付</th>
                <th className="text-left py-3">説明</th>
                <th className="text-left py-3">カテゴリ</th>
                <th className="text-right py-3">金額</th>
                <th className="text-center py-3">状態</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="border-b">
                  <td className="py-3">{tx.date}</td>
                  <td className="py-3">{tx.description}</td>
                  <td className="py-3">
                    <Badge variant={tx.isBusiness ? 'default' : 'secondary'}>
                      {tx.category}
                    </Badge>
                  </td>
                  <td className="py-3 text-right font-medium">{formatCurrency(tx.amount)}</td>
                  <td className="py-3 text-center">
                    {tx.status === 'confirmed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const renderReports = () => (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            月次レポート
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>総収入</span>
              <span className="font-bold text-green-600">¥350,000</span>
            </div>
            <div className="flex justify-between">
              <span>総支出</span>
              <span className="font-bold text-red-600">¥89,420</span>
            </div>
            <div className="flex justify-between">
              <span>純利益</span>
              <span className="font-bold text-blue-600">¥260,580</span>
            </div>
            <Button className="w-full" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              PDFダウンロード（デモ）
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            カテゴリ別支出
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">会議費</span>
              </div>
              <span className="text-sm font-medium">¥25,680</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">消耗品費</span>
              </div>
              <span className="text-sm font-medium">¥34,560</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm">旅費交通費</span>
              </div>
              <span className="text-sm font-medium">¥29,180</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTax = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          税務計算デモ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">¥42,580</div>
            <div className="text-sm text-muted-foreground">予想所得税</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">¥26,058</div>
            <div className="text-sm text-muted-foreground">予想住民税</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">¥0</div>
            <div className="text-sm text-muted-foreground">予想事業税</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              💡 節税のご提案
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• 青色申告で最大65万円の特別控除</li>
              <li>• 小規模企業共済で年間84万円まで所得控除</li>
              <li>• iDeCoで年間68万円まで所得控除</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            基本設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <h4 className="font-semibold mb-3">駐車料金の基本分類</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              駐車料金を検出した時の基本的な分類を設定します。
            </p>
            <div className="space-y-2">
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="parkingDefault" 
                  checked={parkingDefault === 'business'}
                  onChange={() => setParkingDefault('business')}
                  className="mr-2"
                />
                <span>事業用（旅費交通費）として分類</span>
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="parkingDefault" 
                  checked={parkingDefault === 'personal'}
                  onChange={() => setParkingDefault('personal')}
                  className="mr-2"
                />
                <span>個人用（交通費）として分類</span>
              </label>
            </div>
            
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">🎯 本格版での設定について</h5>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• 本格版では<strong>カスタム分類ルール</strong>を設定可能</li>
                <li>• 頻繁に利用する店舗・商品を自動分類に登録</li>
                <li>• 判定基準はそれぞれのユーザーに合わせて変更できます</li>
                <li>• キーワード検索で部分一致により自動振分け</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'receipts':
        return renderReceipts();
      case 'transactions':
        return renderTransactions();
      case 'reports':
        return renderReports();
      case 'tax':
        return renderTax();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* デモ説明 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Keiri デモページ</h1>
          <p className="text-muted-foreground mb-6">
            実際のアプリ画面を体験できます。データはデモ用のため、保存されません。
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/auth/signup">無料で始める</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/signin">ログイン</Link>
            </Button>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { key: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
            { key: 'receipts', label: 'レシート', icon: Receipt },
            { key: 'transactions', label: '取引管理', icon: FileText },
            { key: 'reports', label: 'レポート', icon: PieChart },
            { key: 'tax', label: '税務計算', icon: Calculator },
            { key: 'settings', label: '設定', icon: Settings },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'outline'}
              onClick={() => setActiveTab(key as DemoTab)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* デモコンテンツ */}
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 p-8 bg-muted/50 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">気に入りましたか？</h2>
          <p className="text-muted-foreground mb-6">
            実際に使ってみて、フリーランスの経理業務を効率化しましょう
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/signup">今すぐ無料で始める</Link>
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}