import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Pencil } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button } from "../../components/ui/button";
import { apiFetch, apiUpload } from "../../services/api";
import type { Service, PaginatedResponse } from "../../types/api";
import { formatCurrencyInput, formatCurrencyValue, parseCurrencyInput } from "../../utils/format";
import { normalizeOptionalField, parseNumericField } from "../../utils/validation";

const OUTPUT_SIZE = 512;

export function AdminServices() {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [viewService, setViewService] = useState<Service | null>(null);
  const [editService, setEditService] = useState<Service | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"create" | "edit">("create");

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch<PaginatedResponse<Service>>("/api/services")
  });

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (!editImageFile) return;
    const url = URL.createObjectURL(editImageFile);
    setEditImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [editImageFile]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const numericPrice = parseCurrencyInput(price);
      if (!name.trim()) throw new Error("Informe o nome do serviço");
      if (!unit.trim()) throw new Error("Informe a unidade");
      if (numericPrice <= 0) throw new Error("Informe um preço válido");

      const created = await apiFetch<Service>("/api/services", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: normalizeOptionalField(description) || null,
          price: numericPrice,
          unit: unit.trim()
        })
      });

      if (imageFile) {
        try {
          await apiUpload<Service>(`/api/services/${created.id}/upload-image`, imageFile);
        } catch (error) {
          console.error("Erro ao fazer upload da imagem:", error);
        }
      }
      return created;
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      setPrice("");
      setUnit("");
      setImageFile(null);
      setImagePreview(null);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao salvar serviço.";
      setFormError(message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editService) throw new Error("Serviço inválido");
      const numericPrice = parseCurrencyInput(editPrice);
      if (!editName.trim()) throw new Error("Informe o nome do serviço");
      if (!editUnit.trim()) throw new Error("Informe a unidade");
      if (numericPrice <= 0) throw new Error("Informe um preço válido");

      const updated = await apiFetch<Service>(`/api/services/${editService.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName.trim(),
          description: normalizeOptionalField(editDescription) || null,
          price: numericPrice,
          unit: editUnit.trim()
        })
      });

      if (editImageFile) {
        try {
          await apiUpload<Service>(`/api/services/${editService.id}/upload-image`, editImageFile);
        } catch (error) {
          console.error("Erro ao fazer upload da imagem:", error);
        }
      }

      return updated;
    },
    onSuccess: () => {
      setEditService(null);
      setEditName("");
      setEditDescription("");
      setEditPrice("");
      setEditUnit("");
      setEditImageFile(null);
      setEditImagePreview(null);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao atualizar serviço.";
      setFormError(message);
    }
  });

  const handleSelectImage = async (file: File | null, target: "create" | "edit") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropTarget(target);
      setCropSource(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = (file: File) => {
    if (cropTarget === "create") {
      setImageFile(file);
    } else {
      setEditImageFile(file);
    }
    setCropOpen(false);
    setCropSource(null);
  };

  const cards = servicesQuery.data?.data ?? [];

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Servicos</h2>
        <p className="text-sm text-slate-600">Cadastro de servicos e precos.</p>
      </header>

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Novo servico</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={price}
            onChange={(event) => setPrice(formatCurrencyInput(event.target.value))}
            placeholder="Preço *"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="Unidade (hora, periodo, mesa)"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descricao"
            className="min-h-[80px] w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <div className="space-y-2">
            <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100">
              Escolher imagem
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleSelectImage(event.target.files?.[0] ?? null, "create")}
                className="hidden"
              />
            </label>
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-xl object-cover" />
            ) : null}
          </div>
        </div>
        {formError ? <p className="mt-2 text-sm text-rose-500">{formError}</p> : null}
        <Button className="mt-3" onClick={() => createMutation.mutate()}>
          {createMutation.isPending ? "Salvando..." : "Adicionar servico"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {cards.map((service) => (
          <div key={service.id} className="rounded-2xl border border-brand-100 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-tight">{service.name}</p>
                <p className="text-xs text-slate-500">
                  {formatCurrencyValue(parseNumericField(service.price))} / {service.unit}
                </p>
              </div>
            </div>
            {service.imageUrl ? (
              <img src={service.imageUrl} alt={service.name} className="mt-2 h-20 w-full rounded-xl object-cover" />
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 transition hover:bg-sky-100"
                onClick={() => setViewService(service)}
              >
                <Eye className="h-4 w-4" style={{ color: "#0284c7" }} />
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600 transition hover:bg-amber-100"
                onClick={() => {
                  setEditService(service);
                  setEditName(service.name);
                  setEditDescription(service.description ?? "");
                  setEditPrice(formatCurrencyValue(parseNumericField(service.price)));
                  setEditUnit(service.unit);
                  setEditImageFile(null);
                  setEditImagePreview(service.imageUrl ?? null);
                  setFormError(null);
                }}
              >
                <Pencil className="h-4 w-4" style={{ color: "#d97706" }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewService ? (
        <Modal title="Detalhes do servico" onClose={() => setViewService(null)}>
          <div className="space-y-3">
            {viewService.imageUrl ? (
              <img src={viewService.imageUrl} alt={viewService.name} className="h-40 w-full rounded-2xl object-cover" />
            ) : null}
            <div>
              <p className="text-lg font-semibold">{viewService.name}</p>
              <p className="text-sm text-slate-600">
                {formatCurrencyValue(parseNumericField(viewService.price))} / {viewService.unit}
              </p>
            </div>
            {viewService.description ? (
              <p className="text-sm text-slate-600">{viewService.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const service = viewService;
                  setViewService(null);
                  setEditService(service);
                  setEditName(service.name);
                  setEditDescription(service.description ?? "");
                  setEditPrice(formatCurrencyValue(parseNumericField(service.price)));
                  setEditUnit(service.unit);
                  setEditImageFile(null);
                  setEditImagePreview(service.imageUrl ?? null);
                  setFormError(null);
                }}
              >
                Editar
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {editService ? (
        <Modal title="Editar servico" onClose={() => setEditService(null)}>
          <div className="space-y-3">
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Nome"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={editPrice}
              onChange={(event) => setEditPrice(formatCurrency(event.target.value))}
              placeholder="Preco"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={editUnit}
              onChange={(event) => setEditUnit(event.target.value)}
              placeholder="Unidade"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder="Descricao"
              className="min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <div className="space-y-2">
              <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100">
                Trocar imagem
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleSelectImage(event.target.files?.[0] ?? null, "edit")}
                  className="hidden"
                />
              </label>
              {editImagePreview ? (
                <img src={editImagePreview} alt={editName} className="h-24 w-24 rounded-xl object-cover" />
              ) : null}
            </div>
            {formError ? <p className="text-sm text-rose-500">{formError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditService(null)}>
                Cancelar
              </Button>
              <Button onClick={() => updateMutation.mutate()}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {cropOpen && cropSource ? (
        <ImageCropper
          src={cropSource}
          onClose={() => {
            setCropOpen(false);
            setCropSource(null);
          }}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </section>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-modal-root="true"
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/50"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))"
      }}
    >
      <div
        data-modal-panel="true"
        className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-lg sm:p-6"
        style={{ maxHeight: "calc(100vh - 3rem)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-sm text-slate-500" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function ImageCropper({
  src,
  onClose,
  onConfirm
}: {
  src: string;
  onClose: () => void;
  onConfirm: (file: File) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const handleComplete = (_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  };

  const handleConfirm = async () => {
    if (!croppedArea) return;
    const image = await createImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const sx = croppedArea.x * scaleX;
    const sy = croppedArea.y * scaleY;
    const sWidth = croppedArea.width * scaleX;
    const sHeight = croppedArea.height * scaleY;

    ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `servico-${Date.now()}.jpg`, { type: "image/jpeg" });
        onConfirm(file);
      },
      "image/jpeg",
      0.82
    );
  };

  return (
    <Modal title="Ajustar imagem" onClose={onClose}>
      <div className="space-y-4">
        <div className="relative h-[320px] w-full overflow-hidden rounded-2xl bg-slate-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onCropComplete={handleComplete}
            onZoomChange={setZoom}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Usar imagem</Button>
        </div>
      </div>
    </Modal>
  );
}

function createImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.src = src;
  });
}
