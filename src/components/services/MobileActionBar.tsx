'use client'

import { ReactNode } from 'react'

interface MobileActionBarProps {
    price: number
    children: ReactNode
}

export default function MobileActionBar({ price, children }: MobileActionBarProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 lg:hidden safe-area-bottom">
            <div className="container mx-auto flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">価格</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">¥{price.toLocaleString()}</p>
                </div>
                <div className="flex-1 flex gap-2">
                    {children}
                </div>
            </div>
        </div>
    )
}
