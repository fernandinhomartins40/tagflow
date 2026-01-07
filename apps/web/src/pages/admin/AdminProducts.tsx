import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { useTenantStore } from "../../store/tenant";
import { useAuthStore } from "../../store/auth";

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
}

export function AdminProducts() {
  const queryClient = useQueryClient();
  const tenantId = useTenantStore((state) => state.tenantId);
  const token = useAuthStore((state) => state.token);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<{ data: Product[] }>("/api/products")
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await apiFetch<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify({ name, price: Number(price), imageUrl })
      });
      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        await fetch(`${import.meta.env.VITE_API_URL}/api/products/${created.id}/upload-image`, {
          method: "POST",
          headers: {
            "X-Tenant-Id": tenantId,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: form
        });
      }
      return created;
    },
    onSuccess: () => {
      setName("");
      setPrice("");
      setImageUrl("");
      setImageFile(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Produtos</h2>
        <p className="text-sm text-slate-600">Cadastro e estoque.</p>
      </header>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Novo produto</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Preco"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="URL da imagem"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
        </div>
        <Button className="mt-3" onClick={() => createMutation.mutate()}>
          {createMutation.isPending ? "Salvando..." : "Adicionar produto"}
        </Button>
      </div>
      <div className="grid gap-3">
        {productsQuery.data?.data?.map((product) => (
          <div key={product.id} className="rounded-2xl border border-brand-100 bg-white p-4">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="text-sm text-slate-600">R$ {product.price}</p>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="mt-3 h-24 w-24 rounded-xl object-cover" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
