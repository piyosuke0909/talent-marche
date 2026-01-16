
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const user = await prisma.user.findUnique({
            where: { id },
            select: { image: true }
        })

        if (!user || !user.image) {
            return new NextResponse(null, { status: 404 })
        }

        // If it's an external URL (http/https), redirect to it
        if (user.image.startsWith("http")) {
            return NextResponse.redirect(user.image)
        }

        // If it's a data URL (Base64)
        if (user.image.startsWith("data:")) {
            const matches = user.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)

            if (!matches || matches.length !== 3) {
                return new NextResponse("Invalid image data", { status: 500 })
            }

            const contentType = matches[1]
            const buffer = Buffer.from(matches[2], "base64")

            return new NextResponse(buffer, {
                headers: {
                    "Content-Type": contentType,
                    "Cache-Control": "public, max-age=31536000, immutable",
                },
            })
        }

        return new NextResponse("Unknown image format", { status: 400 })

    } catch (error) {
        console.error("Avatar fetch error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
