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
    <div className="surface overflow-hidden">
      <div className="aspect-video bg-white/95">
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

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
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

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm text-gray-400">
          <p className="surface-muted truncate p-2.5">CPU: {product.cpu || "-"}</p>
          <p className="surface-muted truncate p-2.5">RAM: {product.ram || "-"}</p>
          <p className="surface-muted truncate p-2.5">Storage: {product.storage || "-"}</p>
          <p className="surface-muted truncate p-2.5">GPU: {product.gpu || "-"}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => onEdit(product)}
            className="btn-secondary"
          >
            Edit
          </button>

          <button
            onClick={() => onDelete(product.id)}
            className="btn-danger"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}