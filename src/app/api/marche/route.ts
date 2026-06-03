// Marche AI API: Google Gemini を使ったチャットボット処理（POST）

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// AIアシスタントの基本人格・役割定義（システムプロンプト）
const SYSTEM_PROMPT = `
あなたは「Talent Marche（タレントマルシェ）」のAIアシスタント「Marche（マルシェ）」です。
ユーザーの質問に対して、親切かつ丁寧に、日本語で答えてください。

Talent Marcheは、個人のスキルや才能を売り買いできるC2Cプラットフォームです。
主な機能：
- サービスの出品・購入
- 依頼（公募）の投稿・提案
- ユーザー間のメッセージ
- ダッシュボードでの管理

あなたの役割：
- ユーザーが探しているサービスや依頼を見つける手助けをする
- サイトの使い方を案内する
- サービスの出品や依頼の書き方についてアドバイスする
- 常に前向きで、ユーザーを応援する姿勢を保つ

回答のスタイル：
- 絵文字を適度に使用して、親しみやすい雰囲気にする
- 簡潔で分かりやすい文章を心がける
- ユーザーの名前がわかる場合は、名前で呼びかける（文脈による）
- **重要な部分は太文字**を使って強調する
`;

// AIチャット処理: ユーザーのメッセージと会話履歴を受け取り Gemini で返答を生成する
export async function POST(req: NextRequest) {
    try {
        const { message, history } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // APIキー存在チェック処理
        if (!apiKey) {
            return NextResponse.json(
                { error: "APIキーが設定されていません" },
                { status: 500 }
            );
        }

        // Gemini クライアント初期化処理
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 会話履歴を Gemini のフォーマットに変換する処理
        const formattedHistory = history.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        // 注目の出品者情報を DB から取得してプロンプトに動的注入する処理
        const sellers = await prisma.user.findMany({
            where: { services: { some: { isActive: true } } },
            take: 5,
            include: { services: { select: { title: true, price: true } } },
            orderBy: { createdAt: 'desc' }
        });

        // 出品者情報をテキスト形式に整形する処理
        const sellersInfo = sellers.map(s =>
            `- 名前: ${s.name || s.username} (ID: ${s.id})\n  提供サービス: ${s.services.map(svc => `${svc.title} (${svc.price}円)`).join(', ')}`
        ).join('\n');

        // 動的システムプロンプト: 基本プロンプト + リアルタイムの出品者情報を結合
        const dynamicSystemPrompt = `${SYSTEM_PROMPT}

現在の注目の出品者（ユーザー）情報：
${sellersInfo}

ユーザーから「おすすめの出品者は？」「誰か紹介して」と聞かれたら、上記のリストから適したユーザーを提案してください。
提案する際は、名前と提供しているサービスの内容を具体的に伝えてください。

また、特定のユーザー（例：「Alice Developer」）のページを見たいと言われた場合は、
「[Alice Developer](/users/USER_ID) のページはこちらです」のように、Markdownのリンク形式で案内してください。
USER_IDは上記のリストにあるIDを使用してください。もしリストにない場合は、「申し訳ありませんが、そのユーザーは見つかりませんでした」と答えてください。
`;

        // チャットセッション開始処理: システムプロンプトを先頭に挿入してから会話履歴を追加
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: dynamicSystemPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: "承知いたしました。私はTalent MarcheのAIアシスタント、Marche（マルシェ）です。ユーザー様のサポートを全力で行います！出品者の紹介もお任せください。" }],
                },
                ...formattedHistory
            ],
        });

        // メッセージ送信・レスポンス取得処理
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ reply: text });
    } catch (error: any) {
        console.error("DEBUG_GEMINI_ERROR:", error);

        // レートリミット（429）エラー処理: ユーザーに分かりやすいメッセージを返す
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded') || error.status === 429) {
            console.warn("Gemini API Rate Limit Hit (429) - Returning polite message to user.");
            return NextResponse.json({
                reply: "申し訳ありません。現在、AIへのアクセスが集中しており、一時的に利用制限がかかっています。\n\n少し時間を置いてから（数分後）、もう一度話しかけてみてください。🙏"
            });
        }

        // その他エラー処理
        console.error("Gemini API Error:", error);
        return NextResponse.json({
            reply: "申し訳ありません。AIとの通信中にエラーが発生しました。\n\nしばらく待ってから再度お試しください。"
        });
    }
}
