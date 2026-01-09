import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Pencil } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { getApiBaseUrl } from "../../services/config";
import { useTenantStore } from "../../store/tenant";

interface Location {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  price: string;
  priceUnit: "hour" | "day" | "month" | "period";
  capacity?: number | null;
  imageUrl?: string | null;
}

const locationTypes = [
  "Quadra",
  "Campo",
  "Mesa",
  "Sala",
  "Atracao",
  "Parque",
  "Lounge",
  "Outro"
] as const;

const priceUnits = [
  { value: "hour", label: "Hora" },
  { value: "day", label: "Dia" },
  { value: "month", label: "Mes" },
  { value: "period", label: "Periodo" }
] as const;

const OUTPUT_SIZE = 512;

const formatCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const number = Number(digits) / 100;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatCurrencyNumber = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
};

export function AdminLocations() {
  const queryClient = useQueryClient();
  const tenantId = useTenantStore((state) => state.tenantId);
  const apiBaseUrl = getApiBaseUrl();

  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof locationTypes)[number]>("Quadra");
  const [customType, setCustomType] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState<(typeof priceUnits)[number]["value"]>("hour");
  const [capacity, setCapacity] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [viewLocation, setViewLocation] = useState<Location | null>(null);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<(typeof locationTypes)[number]>("Quadra");
  const [editCustomType, setEditCustomType] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editPriceUnit, setEditPriceUnit] = useState<(typeof priceUnits)[number]["value"]>("hour");
  const [editCapacity, setEditCapacity] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"create" | "edit">("create");

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiFetch<{ data: Location[] }>("/api/locations")
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
      const finalType = type === "Outro" ? customType.trim() : type;
      const numericPrice = parseCurrency(price);
      if (!name.trim()) throw new Error("Informe o nome do local");
      if (!finalType) throw new Error("Informe o tipo");
      if (numericPrice <= 0) throw new Error("Informe um preco valido");

      const created = await apiFetch<Location>("/api/locations", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          type: finalType,
          description: description.trim() || null,
          price: numericPrice,
          priceUnit,
          capacity: capacity ? Number(capacity) : null
        })
      });

      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        await fetch(`${apiBaseUrl}/api/locations/${created.id}/upload-image`, {
          method: "POST",
          headers: {
            "X-Tenant-Id": tenantId
          },
          body: form,
          credentials: "include"
        });
      }

      return created;
    },
    onSuccess: () => {
      setName("");
      setType("Quadra");
      setCustomType("");
      setDescription("");
      setPrice("");
      setPriceUnit("hour");
      setCapacity("");
      setImageFile(null);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao salvar local.";
      setFormError(message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editLocation) throw new Error("Local invalido");
      const finalType = editType === "Outro" ? editCustomType.trim() : editType;
      const numericPrice = parseCurrency(editPrice);
      if (!editName.trim()) throw new Error("Informe o nome do local");
      if (!finalType) throw new Error("Informe o tipo");
      if (numericPrice <= 0) throw new Error("Informe um preco valido");

      const updated = await apiFetch<Location>(`/api/locations/${editLocation.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: editName.trim(),
            type: finalType,
            description: editDescription.trim() || null,
            price: numericPrice,
            priceUnit: editPriceUnit,
            capacity: editCapacity ? Number(editCapacity) : null
          })
        }
      );

      if (editImageFile) {
        const form = new FormData();
        form.append("file", editImageFile);
        await fetch(`${apiBaseUrl}/api/locations/${editLocation.id}/upload-image`, {
          method: "POST",
          headers: {
            "X-Tenant-Id": tenantId
          },
          body: form,
          credentials: "include"
        });
      }

      return updated;
    },
    onSuccess: () => {
      setEditLocation(null);
      setEditName("");
      setEditType("Quadra");
      setEditCustomType("");
      setEditDescription("");
      setEditPrice("");
      setEditPriceUnit("hour");
      setEditCapacity("");
      setEditImageFile(null);
      setEditImagePreview(null);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao atualizar local.";
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

  const cards = locationsQuery.data?.data ?? [];

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Locais</h2>
        <p className="text-sm text-slate-600">Gestao de locais para locacao.</p>
      </header>

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Novo local</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as (typeof locationTypes)[number])}
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          >
            {locationTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {type === "Outro" ? (
            <input
              value={customType}
              onChange={(event) => setCustomType(event.target.value)}
              placeholder="Tipo personalizado"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
          ) : null}
          <input
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            placeholder="Capacidade"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={price}
            onChange={(event) => setPrice(formatCurrency(event.target.value))}
            placeholder="Preco"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <select
            value={priceUnit}
            onChange={(event) => setPriceUnit(event.target.value as (typeof priceUnits)[number]["value"])}
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          >
            {priceUnits.map((unit) => (
              <option key={unit.value} value={unit.value}>
                Por {unit.label.toLowerCase()}
              </option>
            ))}
          </select>
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
        <Button
          className="mt-3"
          onClick={() => createMutation.mutate()}
          disabled={(type === "Outro" && !customType.trim()) || !name.trim() || !price}
        >
          {createMutation.isPending ? "Salvando..." : "Adicionar local"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {cards.map((location) => (
          <div key={location.id} className="rounded-2xl border border-brand-100 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-tight">{location.name}</p>
                <p className="text-xs text-slate-500">{location.type}</p>
                <p className="text-xs text-slate-500">
                  {formatCurrencyNumber(Number(location.price))} / {priceUnits.find((unit) => unit.value === location.priceUnit)?.label ?? "Hora"}
                </p>
              </div>
            </div>
            {location.imageUrl ? (
              <img src={location.imageUrl} alt={location.name} className="mt-2 h-20 w-full rounded-xl object-cover" />
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 transition hover:bg-sky-100"
                onClick={() => setViewLocation(location)}
              >
                <Eye className="h-4 w-4" style={{ color: "#0284c7" }} />
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600 transition hover:bg-amber-100"
                onClick={() => {
                  setEditLocation(location);
                  setEditName(location.name);
                  const matchedType = locationTypes.includes(location.type as (typeof locationTypes)[number])
                    ? (location.type as (typeof locationTypes)[number])
                    : "Outro";
                  setEditType(matchedType);
                  setEditCustomType(matchedType === "Outro" ? location.type : "");
                  setEditDescription(location.description ?? "");
                  setEditPrice(formatCurrencyNumber(Number(location.price)));
                  setEditPriceUnit(location.priceUnit);
                  setEditCapacity(location.capacity ? String(location.capacity) : "");
                  setEditImageFile(null);
                  setEditImagePreview(location.imageUrl ?? null);
                  setFormError(null);
                }}
              >
                <Pencil className="h-4 w-4" style={{ color: "#d97706" }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewLocation ? (
        <Modal title="Detalhes do local" onClose={() => setViewLocation(null)}>
          <div className="space-y-3">
            {viewLocation.imageUrl ? (
              <img src={viewLocation.imageUrl} alt={viewLocation.name} className="h-40 w-full rounded-2xl object-cover" />
            ) : null}
            <div>
              <p className="text-lg font-semibold">{viewLocation.name}</p>
              <p className="text-sm text-slate-600">{viewLocation.type}</p>
              <p className="text-sm text-slate-600">
                {formatCurrencyNumber(Number(viewLocation.price))} / {priceUnits.find((unit) => unit.value === viewLocation.priceUnit)?.label ?? "Hora"}
              </p>
              <p className="text-sm text-slate-600">Capacidade: {viewLocation.capacity ?? "-"}</p>
            </div>
            {viewLocation.description ? (
              <p className="text-sm text-slate-600">{viewLocation.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const location = viewLocation;
                  setViewLocation(null);
                  setEditLocation(location);
                  setEditName(location.name);
                  const matchedType = locationTypes.includes(location.type as (typeof locationTypes)[number])
                    ? (location.type as (typeof locationTypes)[number])
                    : "Outro";
                  setEditType(matchedType);
                  setEditCustomType(matchedType === "Outro" ? location.type : "");
                  setEditDescription(location.description ?? "");
                  setEditPrice(formatCurrencyNumber(Number(location.price)));
                  setEditPriceUnit(location.priceUnit);
                  setEditCapacity(location.capacity ? String(location.capacity) : "");
                  setEditImageFile(null);
                  setEditImagePreview(location.imageUrl ?? null);
                  setFormError(null);
                }}
              >
                Editar
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {editLocation ? (
        <Modal title="Editar local" onClose={() => setEditLocation(null)}>
          <div className="space-y-3">
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Nome"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <select
              value={editType}
              onChange={(event) => setEditType(event.target.value as (typeof locationTypes)[number])}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              {locationTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {editType === "Outro" ? (
              <input
                value={editCustomType}
                onChange={(event) => setEditCustomType(event.target.value)}
                placeholder="Tipo personalizado"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            ) : null}
            <input
              value={editCapacity}
              onChange={(event) => setEditCapacity(event.target.value)}
              placeholder="Capacidade"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={editPrice}
              onChange={(event) => setEditPrice(formatCurrency(event.target.value))}
              placeholder="Preco"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <select
              value={editPriceUnit}
              onChange={(event) => setEditPriceUnit(event.target.value as (typeof priceUnits)[number]["value"])}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              {priceUnits.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  Por {unit.label.toLowerCase()}
                </option>
              ))}
            </select>
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
              <Button variant="outline" onClick={() => setEditLocation(null)}>
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
        const file = new File([blob], `local-${Date.now()}.jpg`, { type: "image/jpeg" });
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
