import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";



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

export async function POST(req: NextRequest) {
    try {
        const { message, history } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "APIキーが設定されていません" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 履歴のフォーマット変換
        const formattedHistory = history.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        // ユーザー（出品者）情報を取得
        const sellers = await prisma.user.findMany({
            where: {
                services: {
                    some: {
                        isActive: true
                    }
                }
            },
            take: 5,
            include: {
                services: {
                    select: {
                        title: true,
                        price: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc' // 簡易的に新しい順。本来は評価順などが望ましい
            }
        });

        const sellersInfo = sellers.map(s =>
            `- 名前: ${s.name || s.username} (ID: ${s.id})\n  提供サービス: ${s.services.map(svc => `${svc.title} (${svc.price}円)`).join(', ')}`
        ).join('\n');

        const dynamicSystemPrompt = `${SYSTEM_PROMPT}

現在の注目の出品者（ユーザー）情報：
${sellersInfo}

ユーザーから「おすすめの出品者は？」「誰か紹介して」と聞かれたら、上記のリストから適したユーザーを提案してください。
提案する際は、名前と提供しているサービスの内容を具体的に伝えてください。

また、特定のユーザー（例：「Alice Developer」）のページを見たいと言われた場合は、
「[Alice Developer](/users/USER_ID) のページはこちらです」のように、Markdownのリンク形式で案内してください。
USER_IDは上記のリストにあるIDを使用してください。もしリストにない場合は、「申し訳ありませんが、そのユーザーは見つかりませんでした」と答えてください。
`;

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

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ reply: text });
    } catch (error: any) {
        console.error("DEBUG_GEMINI_ERROR:", error);

        // Check for 429 or Quota Exceeded errors
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded') || error.status === 429) {
            console.warn("Gemini API Rate Limit Hit (429) - Returning polite message to user.");
            return NextResponse.json({
                reply: "申し訳ありません。現在、AIへのアクセスが集中しており、一時的に利用制限がかかっています。\n\n少し時間を置いてから（数分後）、もう一度話しかけてみてください。🙏"
            });
        }

        console.error("Gemini API Error:", error);

        return NextResponse.json({
            reply: "申し訳ありません。AIとの通信中にエラーが発生しました。\n\nしばらく待ってから再度お試しください。"
        });
    }
}
