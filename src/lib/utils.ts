// ユーティリティ関数群: 汎用的なヘルパー処理をまとめたファイル

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// クラス名結合処理: 条件付きクラスを安全にマージする（Tailwind の競合を解決）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 価格フォーマット処理: 数値を日本円表示に変換（例: 5000 → ¥5,000）
export function formatPrice(price: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(price)
}

// 日付フォーマット処理: Date を日本語表示に変換（例: 2024年1月15日）
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

// スラッグ変換処理: テキストをURL用の文字列に変換（例: "Web Design" → "web-design"）
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ /g, '-')         // スペースをハイフンに置換
    .replace(/[^\w-]+/g, '')    // 英数字・ハイフン以外を除去
}
