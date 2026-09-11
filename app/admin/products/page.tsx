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

export default function ProductsAdminPage() {
  const router = useRouter();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingProduct,
    setEditingProduct,
  ] = useState<Product | null>(null);

  const [error, setError] =
    useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

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
      setError(productsError.message);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }, []);

  const checkAdmin = useCallback(
    async () => {
      setCheckingAuth(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/admin/login");
        return;
      }

      const {
        data: adminRecord,
        error: adminError,
      } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        adminError ||
        !adminRecord
      ) {
        await supabase.auth.signOut();

        router.replace("/admin/login");
        return;
      }

      await loadProducts();

      setCheckingAuth(false);
    },
    [loadProducts, router]
  );

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

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

    const { error: insertError } =
      await supabase
        .from("products")
        .insert({
          name: data.name.trim(),
          brand:
            data.brand.trim() || null,
          description:
            data.description.trim() ||
            null,
          price,
          cpu:
            data.cpu.trim() || null,
          ram:
            data.ram.trim() || null,
          storage:
            data.storage.trim() || null,
          gpu:
            data.gpu.trim() || null,
          screen:
            data.screen.trim() || null,
          battery:
            data.battery.trim() || null,
          image_url:
            data.image_url || null,
        });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setShowForm(false);
    setEditingProduct(null);

    await loadProducts();
  }

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

    const { error: updateError } =
      await supabase
        .from("products")
        .update({
          name: data.name.trim(),
          brand:
            data.brand.trim() || null,
          description:
            data.description.trim() ||
            null,
          price,
          cpu:
            data.cpu.trim() || null,
          ram:
            data.ram.trim() || null,
          storage:
            data.storage.trim() || null,
          gpu:
            data.gpu.trim() || null,
          screen:
            data.screen.trim() || null,
          battery:
            data.battery.trim() || null,
          image_url:
            data.image_url || null,
        })
        .eq(
          "id",
          editingProduct.id
        );

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingProduct(null);
    setShowForm(false);

    await loadProducts();
  }

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

    const { error: deleteError } =
      await supabase
        .from("products")
        .delete()
        .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadProducts();
  }

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

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/admin/login");
    router.refresh();
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Checking admin access...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">

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
              onClick={openAddProduct}
              className="rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:bg-gray-200"
            >
              Add Product
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-gray-700 px-5 py-3 font-medium text-gray-300 transition hover:bg-gray-900"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
            {error}
          </div>
        )}

        {(
          showForm ||
          editingProduct
        ) && (
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
                      price: `${editingProduct.price}`,
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
              onCancel={closeForm}
            />
          </div>
        )}

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
                    key={product.id}
                    product={product}
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