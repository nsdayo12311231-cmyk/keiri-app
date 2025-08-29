export default function TestPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold text-black mb-4">
        テストページ
      </h1>
      <p className="text-black">
        このページが表示されれば、Next.jsは正常に動作しています。
      </p>
      <div className="mt-4">
        <p className="text-black">現在時刻: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}