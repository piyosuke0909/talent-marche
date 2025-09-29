import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET関数を正しく定義します
export async function GET(
  request: NextRequest,
  { params }: { params: { serviceId: string } } // ← ここの型定義が重要！ Promiseではない
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceId } = params; // paramsからserviceIdを正しく取り出す

    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_serviceId: {
          userId: session.user.id,
          serviceId: serviceId,
        },
      },
    });

    return NextResponse.json({ isFavorite: !!favorite }); // !!favorite で true/false に変換

  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json(
      { error: "お気に入りの状態の確認に失敗しました" },
      { status: 500 }
    );
  }
}