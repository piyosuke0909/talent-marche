

export default function CommercialPage() {
  return (

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">特定商取引法に基づく表記</h1>
          
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="space-y-6">

              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">商品代金以外の料金の説明</h2>
                <p className="text-gray-700">
                  サービス利用料：取引成立時にサービス価格の5%<br />
                  決済手数料：決済方法により異なります（クレジットカード：3.6%）
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">申込有効期限</h2>
                <p className="text-gray-700">
                  サービス購入の申し込み後、出品者が承認するまで有効です。
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">不良品について</h2>
                <p className="text-gray-700">
                  デジタルコンテンツの性質上、一般的な不良品の概念は適用されません。<br />
                  サービス内容に明らかな不備がある場合は、当サービスまでお問い合わせください。
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">販売数量</h2>
                <p className="text-gray-700">
                  各サービスページに記載の通りです。
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">引渡し時期</h2>
                <p className="text-gray-700">
                  各サービスページに記載の納期通りです。<br />
                  出品者との合意により変更される場合があります。
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">お支払い方法</h2>
                <p className="text-gray-700">
                  ・クレジットカード（VISA、MasterCard、JCB、American Express、Diners）<br />
                  ・銀行振込<br />
                  ・コンビニ決済<br />
                  ・電子マネー
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">お支払い期限</h2>
                <p className="text-gray-700">
                  クレジットカード：即時決済<br />
                  銀行振込：サービス購入から3日以内<br />
                  コンビニ決済：サービス購入から3日以内
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">返品・交換・キャンセル等</h2>
                <p className="text-gray-700">
                  デジタルサービスの性質上、原則として返品・交換・キャンセルはお受けできません。<br />
                  ただし、以下の場合は例外とします：<br />
                  ・出品者の責任による重大な契約不履行がある場合<br />
                  ・当サービスのシステム不具合による場合<br />
                  詳細は利用規約をご確認ください。
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">引渡し方法</h2>
                <p className="text-gray-700">
                  当サービス内のメッセージ機能、またはメールによる電子的な引渡し
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">古物営業許可証</h2>
                <p className="text-gray-700">
                  当サービスは古物の売買は行っておりません。
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                最終更新日：2025年1月1日<br />
                制定日：2025年1月1日
              </p>
            </div>
          </div>
        </div>
      </div>

  )
}