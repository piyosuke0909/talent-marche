"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ServiceData {
  id: string;
  title: string;
  description: string;
  price: number;
  deliveryDays: number;
  categoryId: string;
  images: string[];
  tags: string[];
  isActive: boolean;
  userId: string;
}

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  const { data: session, status: sessionStatus } = useSession();

  const [formData, setFormData] = useState({
    title: "",
    categoryId: "",
    price: "",
    description: "",
    deliveryDays: "",
    tags: [] as string[],
    isActive: true,
  });
  const [titleCount, setTitleCount] = useState(0);
  const [descCount, setDescCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const fetchService = useCallback(async () => {
    try {
      const res = await fetch(`/api/services/${serviceId}`);
      if (!res.ok) {
        setError("サービスが見つかりません");
        return;
      }
      const data: ServiceData = await res.json();

      if (session?.user?.id && data.userId !== session.user.id) {
        setError("このサービスを編集する権限がありません");
        return;
      }

      setFormData({
        title: data.title,
        categoryId: data.categoryId,
        price: data.price.toString(),
        description: data.description,
        deliveryDays: data.deliveryDays.toString(),
        tags: data.tags || [],
        isActive: data.isActive,
      });
      setTitleCount(data.title.length);
      setDescCount(data.description.length);
      setExistingImages(data.images || []);
    } catch {
      setError("サービスの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [serviceId, session?.user?.id]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/services/${serviceId}/edit`);
      return;
    }

    const init = async () => {
      const catRes = await fetch("/api/categories");
      if (catRes.ok) {
        setCategories(await catRes.json());
      }
      await fetchService();
    };
    init();
  }, [session, sessionStatus, router, serviceId, fetchService]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 20) {
      setFormData({ ...formData, title: value });
      setTitleCount(value.length);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 800) {
      setFormData({ ...formData, description: value });
      setDescCount(value.length);
    }
  };

  const handleNewImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + newImages.length + files.length;
    if (totalImages > 4) {
      alert("画像は最大4枚までアップロードできます");
      return;
    }
    const updated = [...newImages, ...files];
    setNewImages(updated);
    files.forEach((file) => {
      setNewImagePreviews((prev) => [...prev, URL.createObjectURL(file)]);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError("");

    try {
      const { compressImageToBase64 } = await import("@/lib/image");

      const compressedNewImages: string[] = [];
      if (newImages.length > 0) {
        const results = await Promise.all(
          newImages.map((file) => compressImageToBase64(file, 800, 0.6)),
        );
        compressedNewImages.push(...results);
      }

      const allImages = [...existingImages, ...compressedNewImages];

      const response = await fetch(`/api/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          price: formData.price,
          deliveryDays: formData.deliveryDays,
          categoryId: formData.categoryId,
          images: allImages,
          tags: formData.tags,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        router.push(`/services/${serviceId}`);
      } else {
        const data = await response.json();
        setError(data.error || "サービスの更新に失敗しました");
        setShowConfirm(false);
      }
    } catch (err) {
      setError(
        "エラーが発生しました: " +
          (err instanceof Error ? err.message : "不明なエラー"),
      );
      setShowConfirm(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && isLoading === false && !formData.title) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            トップページへ戻る
          </Link>
        </div>
      </div>
    );
  }

  const totalImages = existingImages.length + newImages.length;

  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/services/${serviceId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            サービス詳細に戻る
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
          サービスの編集
        </h1>

        {error && (
          <div className="max-w-2xl mx-auto mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          {!showConfirm ? (
            <form onSubmit={handleConfirm}>
              {/* タイトル */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                <div className="flex items-center mb-4">
                  <label className="font-bold mr-2">出品タイトル</label>
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                    必須
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={handleTitleChange}
                    placeholder="出品タイトルを記入してください"
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className={`absolute right-4 top-3 text-sm ${titleCount >= 20 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    {titleCount}/20
                  </span>
                </div>
              </div>

              {/* カテゴリ + 価格 */}
              <div className="flex gap-5 mb-5">
                <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center mb-4">
                    <label className="font-bold mr-2">カテゴリを選択</label>
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                      必須
                    </span>
                  </div>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">カテゴリを選択してください</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center mb-4">
                    <label className="font-bold mr-2">販売価格</label>
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                      必須
                    </span>
                  </div>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="販売価格を記入してください"
                    min="1"
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* 説明 */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <label className="font-bold mr-2">出品概要</label>
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                      必須
                    </span>
                  </div>
                  <span className={`text-sm ${descCount >= 800 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    {descCount}/800
                  </span>
                </div>
                <textarea
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  placeholder="出品概要を記入してください"
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* 納品日数 */}
              <div className="flex gap-5 mb-5">
                <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center mb-4">
                    <label className="font-bold mr-2">納品日数</label>
                    <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">
                      任意
                    </span>
                  </div>
                  <input
                    type="number"
                    value={formData.deliveryDays}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryDays: e.target.value })
                    }
                    placeholder="納品日数を入力（例：7日）"
                    min="1"
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 公開状態 */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold">公開状態</label>
                    <p className="text-sm text-gray-500 mt-1">
                      非公開にすると、他のユーザーからは見えなくなります
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {formData.isActive ? "公開中" : "非公開"}
                    </span>
                  </label>
                </div>
              </div>

              {/* 画像 */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                <div className="flex items-center mb-4">
                  <label className="font-bold mr-2">サービス画像</label>
                  <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">
                    任意
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    （最大4枚まで）
                  </span>
                </div>

                <div className="space-y-4">
                  {/* 既存画像 */}
                  {existingImages.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">現在の画像</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {existingImages.map((img, index) => (
                          <div key={`existing-${index}`} className="relative">
                            <Image
                              src={img}
                              alt={`既存画像 ${index + 1}`}
                              width={200}
                              height={120}
                              className="h-24 w-full rounded border object-cover"
                              unoptimized
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 新規画像アップロード */}
                  {totalImages < 4 && (
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleNewImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 bg-gray-50">
                        <svg
                          className="w-8 h-8 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        <div>
                          <p className="text-gray-600 font-medium">
                            新しい画像を追加
                          </p>
                          <p className="text-sm text-gray-500">
                            JPG, PNG, GIF形式（{4 - totalImages}枚まで追加可能）
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 新規画像プレビュー */}
                  {newImagePreviews.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">追加する画像</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {newImagePreviews.map((preview, index) => (
                          <div key={`new-${index}`} className="relative">
                            <Image
                              src={preview}
                              alt={`新規画像 ${index + 1}`}
                              width={200}
                              height={120}
                              className="h-24 w-full rounded border object-cover"
                              unoptimized
                            />
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center my-16">
                <button
                  type="submit"
                  className="w-full p-5 bg-black text-white text-xl font-bold rounded-lg shadow-md hover:bg-gray-800 transition-colors"
                >
                  確認画面に進む
                </button>
              </div>
            </form>
          ) : (
            /* 確認画面 */
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-6 text-center">
                編集内容の確認
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-2">サービス名</h3>
                  <p className="text-gray-700">{formData.title}</p>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">カテゴリ</h3>
                  <p className="text-gray-700">
                    {categories.find((c) => c.id === formData.categoryId)?.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-bold text-lg mb-2">価格</h3>
                    <p className="text-gray-700">
                      ¥{parseInt(formData.price).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">納品日数</h3>
                    <p className="text-gray-700">
                      {formData.deliveryDays || 7}日
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">公開状態</h3>
                  <p
                    className={
                      formData.isActive
                        ? "text-green-600 font-medium"
                        : "text-gray-500"
                    }
                  >
                    {formData.isActive ? "公開中" : "非公開"}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">サービス内容</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {formData.description}
                  </p>
                </div>

                {(existingImages.length > 0 || newImagePreviews.length > 0) && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">画像</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingImages.map((img, index) => (
                        <Image
                          key={`confirm-existing-${index}`}
                          src={img}
                          alt={`画像 ${index + 1}`}
                          width={200}
                          height={120}
                          className="h-24 w-full rounded border object-cover"
                          unoptimized
                        />
                      ))}
                      {newImagePreviews.map((preview, index) => (
                        <Image
                          key={`confirm-new-${index}`}
                          src={preview}
                          alt={`新規画像 ${index + 1}`}
                          width={200}
                          height={120}
                          className="h-24 w-full rounded border object-cover"
                          unoptimized
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 p-4 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 transition-colors"
                >
                  戻る
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex-1 p-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? "更新中..." : "更新する"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
