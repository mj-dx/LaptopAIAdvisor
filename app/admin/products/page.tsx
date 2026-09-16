"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/product";

import ProductForm, {
  type ProductFormData,
} from "@/components/products/ProductForm";

import AdminProductCard from "@/components/products/AdminProductCard";

import AdminNav from "../AdminNav";

export default function ProductsAdminPage() {
  const router = useRouter();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingProduct,
    setEditingProduct,
  ] = useState<Product | null>(null);

  const [error, setError] =
    useState("");

  // ========================================
  // Load products
  // ========================================

  const loadProducts =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const {
          data,
          error: productsError,
        } = await supabase
          .from("products")
          .select("*")
          .order("created_at", {
            ascending: false,
          });

        if (productsError) {
          throw productsError;
        }

        setProducts(
          (data || []) as Product[]
        );
      } catch (error) {
        console.error(
          "Load products error:",
          error
        );

        setProducts([]);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load products."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  // ========================================
  // Load on page open
  // Authentication is handled by
  // app/admin/layout.tsx
  // ========================================

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // ========================================
  // Add product
  // ========================================

  async function addProduct(
    data: ProductFormData
  ) {
    setError("");

    const price =
      Number(data.price);

    if (
      Number.isNaN(price) ||
      price < 0
    ) {
      setError(
        "Please enter a valid product price."
      );

      return;
    }

    const {
      error: insertError,
    } = await supabase
      .from("products")
      .insert({
        name:
          data.name.trim(),

        brand:
          data.brand.trim() ||
          null,

        description:
          data.description.trim() ||
          null,

        price,

        cpu:
          data.cpu.trim() ||
          null,

        ram:
          data.ram.trim() ||
          null,

        storage:
          data.storage.trim() ||
          null,

        gpu:
          data.gpu.trim() ||
          null,

        screen:
          data.screen.trim() ||
          null,

        battery:
          data.battery.trim() ||
          null,

        image_url:
          data.image_url ||
          null,
      });

    if (insertError) {
      console.error(
        "Add product error:",
        insertError
      );

      setError(
        insertError.message
      );

      return;
    }

    setShowForm(false);
    setEditingProduct(null);

    await loadProducts();
  }

  // ========================================
  // Update product
  // ========================================

  async function updateProduct(
    data: ProductFormData
  ) {
    if (!editingProduct) {
      return;
    }

    setError("");

    const price =
      Number(data.price);

    if (
      Number.isNaN(price) ||
      price < 0
    ) {
      setError(
        "Please enter a valid product price."
      );

      return;
    }

    const {
      error: updateError,
    } = await supabase
      .from("products")
      .update({
        name:
          data.name.trim(),

        brand:
          data.brand.trim() ||
          null,

        description:
          data.description.trim() ||
          null,

        price,

        cpu:
          data.cpu.trim() ||
          null,

        ram:
          data.ram.trim() ||
          null,

        storage:
          data.storage.trim() ||
          null,

        gpu:
          data.gpu.trim() ||
          null,

        screen:
          data.screen.trim() ||
          null,

        battery:
          data.battery.trim() ||
          null,

        image_url:
          data.image_url ||
          null,
      })
      .eq(
        "id",
        editingProduct.id
      );

    if (updateError) {
      console.error(
        "Update product error:",
        updateError
      );

      setError(
        updateError.message
      );

      return;
    }

    setEditingProduct(null);
    setShowForm(false);

    await loadProducts();
  }

  // ========================================
  // Delete product
  // ========================================

  async function deleteProduct(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this product?"
      );

    if (!confirmed) {
      return;
    }

    setError("");

    const {
      error: deleteError,
    } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Delete product error:",
        deleteError
      );

      setError(
        deleteError.message
      );

      return;
    }

    await loadProducts();
  }

  // ========================================
  // Product form
  // ========================================

  function openAddProduct() {
    setEditingProduct(null);
    setShowForm(true);
    setError("");
  }

  function openEditProduct(
    product: Product
  ) {
    setEditingProduct(product);
    setShowForm(false);
    setError("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
  }

  // ========================================
  // Logout
  // ========================================

  async function handleLogout() {
    setError("");

    try {
      const {
        error: logoutError,
      } =
        await supabase.auth.signOut();

      if (logoutError) {
        throw logoutError;
      }

      router.replace(
        "/admin/login"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setError(
        "Unable to log out. Please try again."
      );
    }
  }

  return (
    <main className="app-shell text-white">

      <div className="page-container py-8 sm:py-10">

        {/* Header */}

        <div className="flex flex-col gap-5 border-b border-gray-900 pb-8 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
              Admin Dashboard
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              Products
            </h1>

            <p className="mt-3 text-gray-400">
              Manage the product catalogue
              used by the AI assistant.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={
                openAddProduct
              }
              className="btn-primary"
            >
              Add Product
            </button>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="btn-tertiary"
            >
              Logout
            </button>

          </div>

        </div>

        <div className="mt-6">
          <AdminNav />
        </div>

        {/* Error */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Form */}

        {(showForm ||
          editingProduct) && (
          <div className="mt-8">

            <div className="mb-4">

              <h2 className="text-2xl font-semibold">
                {editingProduct
                  ? "Edit Product"
                  : "Add Product"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {editingProduct
                  ? "Update the product information below."
                  : "Add a new laptop to the catalogue."}
              </p>

            </div>

            <ProductForm
              initialData={
                editingProduct
                  ? {
                      name:
                        editingProduct.name,

                      brand:
                        editingProduct.brand ||
                        "",

                      description:
                        editingProduct.description ||
                        "",

                      price:
                        `${editingProduct.price}`,

                      cpu:
                        editingProduct.cpu ||
                        "",

                      ram:
                        editingProduct.ram ||
                        "",

                      storage:
                        editingProduct.storage ||
                        "",

                      gpu:
                        editingProduct.gpu ||
                        "",

                      screen:
                        editingProduct.screen ||
                        "",

                      battery:
                        editingProduct.battery ||
                        "",

                      image_url:
                        editingProduct.image_url ||
                        "",
                    }
                  : undefined
              }
              onSubmit={
                editingProduct
                  ? updateProduct
                  : addProduct
              }
              onCancel={
                closeForm
              }
            />

          </div>
        )}

        {/* Catalogue */}

        <div className="mt-10">

          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                Product Catalogue
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Products available to
                customers and the AI
                assistant.
              </p>

            </div>

            <p className="text-sm text-gray-500">
              {products.length}{" "}
              {products.length === 1
                ? "product"
                : "products"}
            </p>

          </div>

          {/* Loading */}

          {loading ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-10 text-center text-gray-500">
              Loading products...
            </div>
          ) : products.length ===
            0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-10 text-center">

              <p className="text-lg text-gray-400">
                No products yet.
              </p>

              <p className="mt-2 text-sm text-gray-600">
                Add your first laptop
                to start building the
                catalogue.
              </p>

              <button
                type="button"
                onClick={
                  openAddProduct
                }
                className="mt-5 rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:bg-gray-200"
              >
                Add First Product
              </button>

            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

              {products.map(
                (product) => (
                  <AdminProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                    onEdit={
                      openEditProduct
                    }
                    onDelete={
                      deleteProduct
                    }
                  />
                )
              )}

            </div>
          )}

        </div>

      </div>

    </main>
  );
}