"use client";

import { useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";

import { supabase } from "@/lib/supabase";

export type ProductFormData = {
  name: string;
  brand: string;
  description: string;
  price: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  screen: string;
  battery: string;
  image_url: string;
};

type ProductFormProps = {
  initialData?: ProductFormData;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
};

const EMPTY_FORM: ProductFormData = {
  name: "",
  brand: "",
  description: "",
  price: "",
  cpu: "",
  ram: "",
  storage: "",
  gpu: "",
  screen: "",
  battery: "",
  image_url: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function ProductForm({
  initialData,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(
    initialData ?? EMPTY_FORM
  );

  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] =
    useState(false);

  const [imageError, setImageError] =
    useState("");

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError(
        "Only JPG, JPEG, PNG and WebP images are allowed."
      );

      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setImageError(
        "Image size must not exceed 5 MB."
      );

      event.target.value = "";
      return;
    }

    try {
      setImageUploading(true);

      const extension =
        file.name.split(".").pop()?.toLowerCase() ??
        "jpg";

      const fileName =
        `${crypto.randomUUID()}.${extension}`;

      const filePath =
        `products/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("product-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data } =
        supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

      setForm((previous) => ({
        ...previous,
        image_url: data.publicUrl,
      }));
    } catch (error) {
      console.error(
        "Image upload failed:",
        error
      );

      setImageError(
        "Image upload failed. Please try again."
      );
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading || imageUploading) {
      return;
    }

    setLoading(true);

    try {
      await onSubmit(form);
    } catch (error) {
      console.error(
        "Product save failed:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="surface space-y-8 p-5 sm:p-7"
    >
      <div>
        <h3 className="text-xl font-semibold">
          Basic information
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Enter the laptop specifications used by
          the catalogue and AI assistant.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="Product Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <Input
          label="Brand"
          name="brand"
          value={form.brand}
          onChange={handleChange}
        />

        <Input
          label="Price"
          name="price"
          type="number"
          value={form.price}
          onChange={handleChange}
          required
        />

      </div>

      <div className="border-t border-gray-800 pt-6">
        <p className="mb-4 text-sm font-semibold text-gray-300">Hardware specifications</p>
        <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="CPU"
          name="cpu"
          value={form.cpu}
          onChange={handleChange}
        />
        <Input
          label="RAM"
          name="ram"
          value={form.ram}
          onChange={handleChange}
        />
        <Input
          label="Storage"
          name="storage"
          value={form.storage}
          onChange={handleChange}
        />
        <Input
          label="GPU"
          name="gpu"
          value={form.gpu}
          onChange={handleChange}
        />
        </div>
      </div>

      <div className="border-t border-gray-800 pt-6">
        <p className="mb-4 text-sm font-semibold text-gray-300">Display and battery</p>
        <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="Screen"
          name="screen"
          value={form.screen}
          onChange={handleChange}
        />
        <Input
          label="Battery"
          name="battery"
          value={form.battery}
          onChange={handleChange}
        />
        </div>
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm text-gray-300"
        >
          Description
        </label>

        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={5}
          placeholder="Describe this laptop and its ideal use cases..."
          className="field-control min-h-32 resize-y"
        />
      </div>

      <div className="border-t border-gray-800 pt-6">
        <h3 className="text-lg font-semibold">
          Product Image
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          JPG, JPEG, PNG or WebP. Maximum size:
          5 MB.
        </p>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageUpload}
          disabled={imageUploading}
          className="field-control mt-4 block text-sm file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium file:text-black disabled:cursor-not-allowed disabled:opacity-50"
        />

        {imageUploading && (
          <p className="mt-3 text-sm text-gray-400">
            Uploading image...
          </p>
        )}

        {imageError && (
          <div className="mt-3 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-400">
            {imageError}
          </div>
        )}

        {form.image_url && (
          <div className="mt-5">
            <p className="mb-2 text-sm text-gray-400">
              Preview
            </p>

            <div className="max-w-lg overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
              <img
                src={form.image_url}
                alt="Product preview"
                className="h-64 w-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-800 pt-6 sm:flex-row">
        <button
          type="submit"
          disabled={
            loading || imageUploading
          }
          className="btn-primary"
        >
          {imageUploading
            ? "Uploading..."
            : loading
              ? "Saving..."
              : "Save Product"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-tertiary border border-gray-700 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

type InputProps = {
  label: string;
  name: keyof ProductFormData;
  value: string;
  type?: "text" | "number";
  required?: boolean;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
};

function Input({
  label,
  name,
  value,
  type = "text",
  required = false,
  onChange,
}: InputProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm text-gray-300"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-400">
            *
          </span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        required={required}
        onChange={onChange}
        min={
          type === "number"
            ? "0"
            : undefined
        }
        step={
          type === "number"
            ? "0.01"
            : undefined
        }
        className="field-control"
      />
    </div>
  );
}