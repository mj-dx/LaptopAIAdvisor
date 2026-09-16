import type { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({
  product,
}: ProductCardProps) {
  return (
    <article className="group surface overflow-hidden transition hover:-translate-y-0.5 hover:border-gray-600">
      <div className="aspect-[4/3] overflow-hidden bg-white/95">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No image available
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
              {product.brand || "Laptop"}
            </p>

            <h2 className="mt-1 text-xl font-semibold text-white">
              {product.name}
            </h2>
          </div>

          <p className="whitespace-nowrap text-lg font-bold text-white">
            ${Number(product.price).toFixed(2)}
          </p>
        </div>

        {product.description && (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">
            {product.description}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
          <Spec
            label="CPU"
            value={product.cpu}
          />

          <Spec
            label="RAM"
            value={product.ram}
          />

          <Spec
            label="Storage"
            value={product.storage}
          />

          <Spec
            label="GPU"
            value={product.gpu}
          />
        </div>

        {(product.screen || product.battery) && (
          <div className="mt-4 border-t border-gray-800 pt-4">
            {product.screen && (
              <p className="text-sm text-gray-400">
                <span className="text-gray-500">
                  Screen:
                </span>{" "}
                {product.screen}
              </p>
            )}

            {product.battery && (
              <p className="mt-1 text-sm text-gray-400">
                <span className="text-gray-500">
                  Battery:
                </span>{" "}
                {product.battery}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

type SpecProps = {
  label: string;
  value: string | null;
};

function Spec({
  label,
  value,
}: SpecProps) {
  return (
    <div className="surface-muted min-w-0 p-3">
      <p className="text-xs text-gray-600">
        {label}
      </p>

      <p title={value || undefined} className="mt-1 truncate text-gray-300">
        {value || "—"}
      </p>
    </div>
  );
}