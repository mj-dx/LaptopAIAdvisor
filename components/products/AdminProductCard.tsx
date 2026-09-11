"use client";

import { Product } from "@/types/product";

type Props = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
};

export default function AdminProductCard({
  product,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
      <div className="aspect-video bg-gray-800">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            No image
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              {product.brand || "Unknown brand"}
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              {product.name}
            </h2>
          </div>

          <p className="font-semibold">
            ${Number(product.price).toFixed(2)}
          </p>
        </div>

        <div className="mt-4 space-y-1 text-sm text-gray-400">
          <p>CPU: {product.cpu || "-"}</p>
          <p>RAM: {product.ram || "-"}</p>
          <p>Storage: {product.storage || "-"}</p>
          <p>GPU: {product.gpu || "-"}</p>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => onEdit(product)}
            className="flex-1 rounded-xl border border-gray-700 px-4 py-2 hover:bg-gray-800"
          >
            Edit
          </button>

          <button
            onClick={() => onDelete(product.id)}
            className="flex-1 rounded-xl border border-red-900 px-4 py-2 text-red-400 hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}