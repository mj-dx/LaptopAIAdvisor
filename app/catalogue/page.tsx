"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/product";

import ProductCard from "@/components/products/ProductCard";

export default function CataloguePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  const filteredProducts = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const searchableText = [
        product.name,
        product.brand,
        product.description,
        product.cpu,
        product.ram,
        product.storage,
        product.gpu,
        product.screen,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [products, search]);

  return (
    <main className="app-shell text-white">
      <section className="border-b border-gray-900">
        <div className="page-container py-12 sm:py-16">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
            Laptop AI Advisor
          </p>

          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Laptop Catalogue
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-400">
                Explore our laptop catalogue or ask the AI assistant to help you find the best option for your budget and needs.
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <label
                htmlFor="catalogue-search"
                className="sr-only"
              >
                Search products
              </label>

              <input
                id="catalogue-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search by laptop, brand, CPU, GPU..."
                className="field-control"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1
              ? "product"
              : "products"}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty-state text-gray-500">
            Loading catalogue...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <h2 className="text-xl font-semibold">
              No products found
            </h2>

            <p className="mt-2 text-gray-500">
              Try another search or add products from the admin dashboard.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map(
              (product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}