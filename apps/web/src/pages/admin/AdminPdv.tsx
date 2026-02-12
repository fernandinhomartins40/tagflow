import { useEffect, useMemo, useState } from "react";
import { Boxes, CupSoda, MapPinned, CreditCard, Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { ScannerModal } from "../../components/ScannerModal";
import { useNfc } from "../../hooks/useNfc";
import { formatCurrencyInput, formatCurrencyValue, parseCurrencyInput } from "../../utils/currency";
import { AddCreditModal, type PaymentMethod } from "../../components/AddCreditModal";

interface Customer {
  id: string;
  name: string;
  credits: string;
  creditLimit?: string | null;
}

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
}

interface Service {
  id: string;
  name: string;
  price: string;
}

interface Location {
  id: string;
  name: string;
  price: string;
  priceUnit: "hour" | "day" | "month" | "period";
}

interface BookingConflict {
  id: string;
  customerId?: string | null;
  customerName?: string | null;
}

interface IdentifierData {
  tabType?: "credit" | "prepaid";
}

interface Tab {
  id: string;
  customerId: string;
  identifierCode: string;
  type: "credit" | "prepaid";
  status: "open" | "closed";
}

type CartItemType = "product" | "service" | "location" | "credit";

interface CartItem {
  key: string;
  type: CartItemType;
  id?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  startAt?: string;
  endAt?: string;
  participants?: Array<{ customerId: string; amount: number }>;
  conflict?: BookingConflict | null;
  paymentMethod?: PaymentMethod;
}

const priceUnits = {
  hour: "Hora",
  day: "Dia",
  month: "Mes",
  period: "Periodo"
} as const;

const quickActions = [
  {
    key: "products",
    label: "Produtos",
    icon: Boxes,
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/25 dark:text-amber-200 dark:border-amber-400/40"
  },
  {
    key: "services",
    label: "Servicos",
    icon: CupSoda,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400/40"
  },
  {
    key: "locations",
    label: "Locais",
    icon: MapPinned,
    color: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/25 dark:text-teal-200 dark:border-teal-400/40"
  },
  {
    key: "credit",
    label: "Credito pre-pago",
    icon: CreditCard,
    color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/25 dark:text-rose-200 dark:border-rose-400/40"
  },
  {
    key: "link",
    label: "Vincular",
    icon: Link2,
    color: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-100 dark:border-slate-400/30"
  }
] as const;

export function AdminPdv() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeModal, setActiveModal] = useState<"products" | "services" | "locations" | null>(null);
  const [identifyOpen, setIdentifyOpen] = useState(false);
  const [identifyMethod, setIdentifyMethod] = useState<"nfc" | "qr" | "barcode" | "number" | "search">("nfc");
  const [identifier, setIdentifier] = useState("");
  const [numberInput, setNumberInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCustomerId, setSearchCustomerId] = useState<string | null>(null);
  const [searchIdentifier, setSearchIdentifier] = useState("");
  const [tabType, setTabType] = useState<"credit" | "prepaid">("prepaid");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanType, setScanType] = useState<"qr" | "barcode">("qr");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [locationStart, setLocationStart] = useState("");
  const [locationEnd, setLocationEnd] = useState("");
  const [locationTotal, setLocationTotal] = useState("");
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [locationConflict, setLocationConflict] = useState<BookingConflict | null>(null);
  const [confirmReserved, setConfirmReserved] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationTarget, setLocationTarget] = useState<Location | null>(null);
  const [locationNotice, setLocationNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [participantSearch, setParticipantSearch] = useState("");
  const [participantIdentifier, setParticipantIdentifier] = useState("");
  const [participantAmount, setParticipantAmount] = useState("");
  const [participantTargetKey, setParticipantTargetKey] = useState<string | null>(null);

  const nfc = useNfc({
    onRead: (event) => {
      console.log("NFC lido:", event);
      let nfcCode = "";

      // Se tem serial number, usa ele
      if (event.serialNumber) {
        nfcCode = event.serialNumber;
        setIdentifier(event.serialNumber);
      } else if (event.records.length > 0) {
        // Senão, usa o primeiro registro de texto
        const textRecord = event.records.find(r => r.recordType === "text");
        if (textRecord) {
          nfcCode = textRecord.data;
          setIdentifier(textRecord.data);
        }
      }

      // Auto-submit quando NFC é lido com sucesso
      if (nfcCode && identifyOpen) {
        console.log("Auto-submetendo NFC:", nfcCode);
        setTimeout(() => {
          handleConfirmIdentify();
        }, 500); // Pequeno delay para garantir que o state foi atualizado
      }
    },
    onError: (err) => {
      console.error("Erro NFC:", err);
      setError(err.message);
    }
  });

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<{ data: Product[] }>("/api/products")
  });

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch<{ data: Service[] }>("/api/services")
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiFetch<{ data: Location[] }>("/api/locations")
  });

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/customers")
  });

  const filteredCustomers = useMemo(() => {
    if (!participantSearch) return [];
    return customersQuery.data?.data?.filter((c) => c.name.toLowerCase().includes(participantSearch.toLowerCase())) ?? [];
  }, [participantSearch, customersQuery.data?.data]);

  const openTabMutation = useMutation({
    mutationFn: async (payload: { identifier: string; type: "credit" | "prepaid" }) => {
      return apiFetch<Tab>("/api/tabs/open", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  });

  const addTabItemMutation = useMutation({
    mutationFn: async (payload: {
      tabId: string;
      productId?: string;
      serviceId?: string;
      locationId?: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      total: number;
      startAt?: string;
      endAt?: string;
    }) => {
      return apiFetch("/api/tabs/items", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  });

  const addTabItemParticipants = useMutation({
    mutationFn: async (payload: { tabItemId: string; participants: Array<{ customerId: string; amount: number }> }) => {
      return apiFetch("/api/tabs/items/participants", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  });

  const addCreditsMutation = useMutation({
    mutationFn: async (payload: { customerId: string; amount: number; paymentMethod: PaymentMethod }) => {
      return apiFetch(`/api/customers/${payload.customerId}/add-credits`, {
        method: "POST",
        body: JSON.stringify({ amount: payload.amount, paymentMethod: payload.paymentMethod })
      });
    }
  });

  const createBookingMutation = useMutation({
    mutationFn: async (payload: {
      locationId: string;
      startAt: string;
      endAt: string;
      total: number;
      participants: Array<{ customerId: string; share: number }>;
    }) => {
      return apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          locationId: payload.locationId,
          startAt: payload.startAt,
          endAt: payload.endAt,
          total: payload.total,
          status: "in_progress",
          participants: payload.participants
        })
      });
    }
  });

  useEffect(() => {
    if (identifyOpen) {
      nfc.clear();
      nfc.startScan();
    } else {
      nfc.stopScan();
    }
  }, [identifyOpen]);

  useEffect(() => {
    if (!identifyOpen) return;
    if (!identifier.trim()) return;
    apiFetch<{ identifierData?: IdentifierData | null }>(`/api/customers/by-identifier/${identifier}`)
      .then((res) => {
        if (res.identifierData?.tabType) {
          setTabType(res.identifierData.tabType);
        }
      })
      .catch(() => null);
  }, [identifyOpen, identifier]);

  useEffect(() => {
    setLocationConflict(null);
    setConfirmReserved(false);
  }, [locationStart, locationEnd, locationTarget?.id]);

  useEffect(() => {
    if (!locationTarget) return;
    if (!locationStart || !locationEnd) return;
    const { total } = resolveLocationCharge(locationTarget);
    setLocationTotal(formatCurrencyValue(total));
  }, [locationStart, locationEnd, locationTarget]);

  const addItem = (item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p.key === item.key);
      if (existing) {
        return prev.map((p) => (p.key === item.key ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, item];
    });
  };

  const removeItem = (key: string) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((p) => p.key !== key);
      }
      return prev.map((p) => (p.key === key ? { ...p, quantity: p.quantity - 1 } : p));
    });
  };

  const removeItemAll = (key: string) => {
    setCartItems((prev) => prev.filter((p) => p.key !== key));
  };

  const openIdentifyModal = () => {
    if (cartItems.length === 0) return;
    setIdentifyMethod("nfc");
    setIdentifyOpen(true);
    setError(null);
  };

  const resolveIdentifier = () => {
    if (identifyMethod === "number") {
      return numberInput.trim();
    }
    if (identifyMethod === "search") {
      return searchIdentifier.trim();
    }
    return identifier.trim();
  };

  const handleConfirmIdentify = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsProcessing(true);

    try {
      const resolved = resolveIdentifier();
      if (!resolved) {
        setError("Informe um identificador valido.");
        return;
      }

      let customerId: string | null = null;
      if (identifyMethod === "search") {
        if (!searchCustomerId) {
          setError("Selecione um cliente.");
          return;
        }
        customerId = searchCustomerId;
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/customers/${searchCustomerId}/activate-tag`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ type: "manual", code: resolved, tabType })
          });

          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 409) {
              setError(errorData.message || "Este código já está vinculado a outro cliente ativo.");
              return;
            }
          } else {
            setSuccessMessage("✓ Identificador vinculado com sucesso!");
          }
        } catch (err) {
          console.error("Erro ao vincular identificador:", err);
          // Continue mesmo se falhar (pode já estar vinculado)
        }
      }

      const tab = await openTabMutation.mutateAsync({ identifier: resolved, type: tabType });

      const itemsSnapshot = [...cartItems];
      for (const item of itemsSnapshot) {
        if (item.type === "credit") {
          const customer = await apiFetch<{ data: Customer | null }>(`/api/customers/by-identifier/${resolved}`);
          if (!customer.data) {
            throw new Error("Cliente nao encontrado para inserir credito");
          }
          await addCreditsMutation.mutateAsync({
            customerId: customer.data.id,
            amount: item.price,
            paymentMethod: item.paymentMethod ?? "cash"
          });
          continue;
        }

        if (item.type === "location") {
          if (!item.startAt || !item.endAt) {
            throw new Error("Informe horario da locacao");
          }
          const participants = item.participants ?? [];
          await createBookingMutation.mutateAsync({
            locationId: item.id ?? "",
            startAt: item.startAt,
            endAt: item.endAt,
            total: item.price,
            participants: participants.map((p) => ({ customerId: p.customerId, share: p.amount }))
          });
        }

        const created = await addTabItemMutation.mutateAsync({
          tabId: tab.id,
          productId: item.type === "product" ? item.id : undefined,
          serviceId: item.type === "service" ? item.id : undefined,
          locationId: item.type === "location" ? item.id : undefined,
          description: item.type === "location" ? "Locacao" : undefined,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
          startAt: item.startAt,
          endAt: item.endAt
        });

        if (item.type === "location" && item.participants?.length) {
          await addTabItemParticipants.mutateAsync({
            tabItemId: (created as { id: string }).id,
            participants: item.participants
          });
        }
      }

      setSuccessMessage(`✓ Comanda processada com sucesso! ${itemsSnapshot.length} item(ns) adicionado(s).`);

      // Aguardar 1.5s para mostrar mensagem antes de fechar
      setTimeout(() => {
        setCartItems([]);
        setIdentifyOpen(false);
        setIdentifier("");
        setNumberInput("");
        setSearchIdentifier("");
        setSearchCustomerId(null);
        setSuccessMessage(null);
      }, 1500);

    } catch (err: any) {
      console.error("Erro ao processar comanda:", err);
      setError(err.message || "Erro ao processar comanda. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const calcLocationTotal = (location: Location | undefined) => {
    if (!location || !locationStart || !locationEnd) return;
    const { total } = resolveLocationCharge(location);
    setLocationTotal(formatCurrencyValue(total));
  };

  const resolveLocationCharge = (location: Location) => {
    const start = new Date(locationStart);
    const end = new Date(locationEnd);
    const diffMs = end.getTime() - start.getTime();
    const price = Number(location.price);
    if (diffMs <= 0 || !Number.isFinite(price)) {
      return { quantity: 1, total: price };
    }
    let quantity = 1;
    switch (location.priceUnit) {
      case "hour":
        quantity = Math.max(1, Math.ceil(diffMs / 3_600_000));
        break;
      case "day":
        quantity = Math.max(1, Math.ceil(diffMs / 86_400_000));
        break;
      case "month":
        quantity = Math.max(1, Math.ceil(diffMs / 2_592_000_000));
        break;
      case "period":
      default:
        quantity = 1;
    }
    return { quantity, total: price * quantity };
  };

  const checkLocationConflict = async (locationId: string) => {
    if (!locationStart || !locationEnd) return null;
    const res = await apiFetch<{ data: BookingConflict | null }>(
      `/api/bookings/for-slot?locationId=${locationId}&startAt=${new Date(locationStart).toISOString()}&endAt=${new Date(locationEnd).toISOString()}`
    );
    setLocationConflict(res.data ?? null);
    return res.data;
  };

  const addLocationToCart = async (location: Location) => {
    if (!locationStart || !locationEnd) {
      setError("Informe horario da locacao.");
      setLocationNotice({ type: "error", message: "Informe horario da locacao." });
      return false;
    }
    const alreadyAdded = cartItems.some((item) => item.type === "location" && item.id === location.id);
    if (alreadyAdded) {
      setError("Este local ja esta na lista de itens do PDV.");
      setLocationNotice({ type: "error", message: "Este local ja esta na lista de itens do PDV." });
      return false;
    }
    const hasOverlap = cartItems.some((item) => {
      if (item.type !== "location" || item.id !== location.id || !item.startAt || !item.endAt) return false;
      const existingStart = new Date(item.startAt).getTime();
      const existingEnd = new Date(item.endAt).getTime();
      const nextStart = new Date(locationStart).getTime();
      const nextEnd = new Date(locationEnd).getTime();
      return nextStart < existingEnd && nextEnd > existingStart;
    });
    if (hasOverlap) {
      setError("Este local ja esta na lista de itens para o mesmo periodo.");
      setLocationNotice({ type: "error", message: "Este local ja esta na lista de itens para o mesmo periodo." });
      return false;
    }
    const conflict = await checkLocationConflict(location.id);
    if (conflict && !confirmReserved) {
      setError("Local reservado. Confirme o atendimento para continuar.");
      setLocationNotice({ type: "error", message: "Local reservado. Confirme o atendimento para continuar." });
      return false;
    }
    const { quantity, total } = resolveLocationCharge(location);
    addItem({
      key: `location-${location.id}-${locationStart}-${locationEnd}`,
      type: "location",
      id: location.id,
      name: location.name,
      price: parseCurrencyInput(locationTotal) || Number(location.price),
      quantity,
      startAt: new Date(locationStart).toISOString(),
      endAt: new Date(locationEnd).toISOString(),
      conflict: conflict ?? null
    });
    setConfirmReserved(false);
    setLocationConflict(null);
    setError(null);
    setLocationNotice({ type: "success", message: "Local adicionado na comanda." });
    return true;
  };

  const toLocalInputValue = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const openLocationModal = (location: Location) => {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setLocationTarget(location);
    setLocationStart(toLocalInputValue(now));
    setLocationEnd(toLocalInputValue(end));
    setLocationTotal(formatCurrencyValue(Number(location.price)));
    setError(null);
    setLocationModalOpen(true);
  };

  const adjustLocationEnd = (minutes: number) => {
    if (!locationEnd) return;
    const current = new Date(locationEnd);
    const adjusted = new Date(current.getTime() + minutes * 60 * 1000);
    setLocationEnd(toLocalInputValue(adjusted));
  };

  const getLocationStepMinutes = (unit: Location["priceUnit"]) => {
    switch (unit) {
      case "hour":
        return 60;
      case "day":
        return 1440;
      case "month":
        return 43200;
      case "period":
      default:
        return 30;
    }
  };

  const openParticipantModal = (key: string) => {
    setParticipantTargetKey(key);
    setParticipantSearch("");
    setParticipantIdentifier("");
    setParticipantAmount("");
  };

  const updateParticipants = (next: Array<{ customerId: string; amount: number }>) => {
    setCartItems((prev) => prev.map((item) => (item.key === participantTargetKey ? { ...item, participants: next } : item)));
  };

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">PDV</h2>
        <p className="text-sm text-slate-600 dark:text-neutral-300">Selecione itens e vincule a comanda rapidamente.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => {
              if (action.key === "link") {
                navigate("/admin/identifiers");
                return;
              }
              if (action.key === "credit") {
                setCreditModalOpen(true);
                return;
              }
              setActiveModal(action.key);
              setError(null);
            }}
            className={`aspect-square w-full rounded-2xl border ${action.color} p-3 text-left text-sm font-semibold shadow-sm transition hover:brightness-95 dark:hover:brightness-110`}
          >
            <action.icon className="h-6 w-6" />
            <span className="mt-auto">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#2a2420] dark:bg-[#1b1613]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Itens da comanda</h3>
          <span className="text-xs text-slate-400 dark:text-neutral-400">{cartItems.length} item(s)</span>
        </div>
        {locationNotice ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
              locationNotice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
            }`}
          >
            {locationNotice.message}
          </div>
        ) : null}
        <div className="mt-3 space-y-2">
          {cartItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-neutral-400">Nenhum item selecionado.</p>
          ) : (
            cartItems.map((item) => (
              <div key={item.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-[#2a2420]">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">R$ {item.price.toFixed(2)} {item.type === "location" && item.startAt ? "- locacao" : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.type === "location" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="!border-amber-300 !text-amber-700 hover:!bg-amber-50"
                        onClick={() => openParticipantModal(item.key)}
                      >
                        Dividir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="!border-rose-300 !text-rose-700 hover:!bg-rose-50"
                        onClick={() => removeItemAll(item.key)}
                      >
                        Remover
                      </Button>
                    </>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => removeItem(item.key)}>
                    -
                  </Button>
                  <span className="text-sm">{item.quantity}</span>
                  <Button size="sm" variant="outline" onClick={() => addItem(item)}>
                    +
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCartItems([])}>
            Cancelar
          </Button>
          <Button onClick={openIdentifyModal}>
            Adicionar
          </Button>
        </div>
      </div>

      {activeModal ? (
        <Modal
          title={activeModal === "products" ? "Produtos" : activeModal === "services" ? "Servicos" : "Locais"}
          onClose={() => {
            setActiveModal(null);
            setError(null);
          }}
        >
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-300">
            Itens adicionados neste modal:{" "}
            {cartItems.filter((item) => {
              if (activeModal === "products") return item.type === "product";
              if (activeModal === "services") return item.type === "service";
              if (activeModal === "locations") return item.type === "location";
              return false;
            }).length}
          </div>
          {activeModal === "products" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {productsQuery.data?.data?.map((product) => (
                <ItemCard
                  key={product.id}
                  title={product.name}
                  imageUrl={product.imageUrl ?? undefined}
                  price={Number(product.price)}
                  onAdd={() => addItem({ key: `product-${product.id}`, type: "product", id: product.id, name: product.name, price: Number(product.price), quantity: 1, imageUrl: product.imageUrl ?? undefined })}
                  onRemove={() => removeItem(`product-${product.id}`)}
                />
              ))}
              <div className="mt-4 space-y-2 sm:col-span-2">
                {cartItems
                  .filter((item) => item.type === "product")
                  .map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-[#2a2420]">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">Qtd: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => removeItem(item.key)}>
                          -
                        </Button>
                        <Button size="sm" onClick={() => addItem(item)}>
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
          {activeModal === "services" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {servicesQuery.data?.data?.map((service) => (
                <ItemCard
                  key={service.id}
                  title={service.name}
                  price={Number(service.price)}
                  onAdd={() => addItem({ key: `service-${service.id}`, type: "service", id: service.id, name: service.name, price: Number(service.price), quantity: 1 })}
                  onRemove={() => removeItem(`service-${service.id}`)}
                />
              ))}
              <div className="mt-4 space-y-2 sm:col-span-2">
                {cartItems
                  .filter((item) => item.type === "service")
                  .map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-[#2a2420]">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">Qtd: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => removeItem(item.key)}>
                          -
                        </Button>
                        <Button size="sm" onClick={() => addItem(item)}>
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
          {activeModal === "locations" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {locationsQuery.data?.data?.map((location) => (
                  <ItemCard
                    key={location.id}
                    title={`${location.name} - R$ ${location.price}/${priceUnits[location.priceUnit]}`}
                    price={Number(location.price)}
                    onAdd={() => openLocationModal(location)}
                    onRemove={() => removeItem(`location-${location.id}-${locationStart}-${locationEnd}`)}
                  />
                ))}
              </div>
              {error ? <p className="text-sm text-rose-500">{error}</p> : null}
              <div className="mt-4 space-y-2">
                {cartItems
                  .filter((item) => item.type === "location")
                  .map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-[#2a2420]">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                          {item.startAt ? new Date(item.startAt).toLocaleString("pt-BR") : ""} -{" "}
                          {item.endAt ? new Date(item.endAt).toLocaleString("pt-BR") : ""}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => removeItem(item.key)}>
                        Remover
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {identifyOpen ? (
        <Modal title="Identificar cliente" onClose={() => setIdentifyOpen(false)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-neutral-300">Prioridade: NFC. O leitor foi ativado automaticamente.</p>
            <p className="text-xs text-slate-500 dark:text-neutral-400">Credito pre-pago = saldo antecipado. Credito = consumo com acerto no final.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant={identifyMethod === "nfc" ? "default" : "outline"} onClick={() => setIdentifyMethod("nfc")}>NFC</Button>
              <Button variant={identifyMethod === "qr" ? "default" : "outline"} onClick={() => { setIdentifyMethod("qr"); setScanType("qr"); setScanOpen(true); }}>QR Code</Button>
              <Button variant={identifyMethod === "barcode" ? "default" : "outline"} onClick={() => { setIdentifyMethod("barcode"); setScanType("barcode"); setScanOpen(true); }}>Codigo de barras</Button>
              <Button variant={identifyMethod === "number" ? "default" : "outline"} onClick={() => setIdentifyMethod("number")}>Numeracao</Button>
              <Button variant={identifyMethod === "search" ? "default" : "outline"} onClick={() => setIdentifyMethod("search")}>Busca de cliente</Button>
            </div>

            {identifyMethod === "number" ? (
              <input
                value={numberInput}
                onChange={(event) => setNumberInput(event.target.value)}
                placeholder="Digite a numeracao"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            ) : null}

            {identifyMethod === "search" ? (
              <div className="space-y-2">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar cliente por nome"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
                <div className="flex flex-wrap gap-2">
                  {(customersQuery.data?.data ?? [])
                    .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 6)
                    .map((c) => (
                      <Button key={c.id} size="sm" variant={searchCustomerId === c.id ? "default" : "outline"} onClick={() => setSearchCustomerId(c.id)}>
                        {c.name}
                      </Button>
                    ))}
                </div>
                <input
                  value={searchIdentifier}
                  onChange={(event) => setSearchIdentifier(event.target.value)}
                  placeholder="Identificador para vincular"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
            ) : null}

            {identifyMethod === "nfc" ? (
              <div
              className={`rounded-xl border p-3 text-sm ${
                isProcessing && identifier
                  ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200"
                  : nfc.status === "read-success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : nfc.status === "read-error" || nfc.status === "write-error"
                      ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
                      : nfc.status === "permission-denied"
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200"
                        : nfc.status === "not-supported"
                          ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
                          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-300"
              }`}
            >
                {isProcessing && identifier
                  ? `⏳ Processando NFC: ${identifier}...`
                  : nfc.status === "read-success" && identifier
                    ? `✓ Leitura OK: ${identifier}`
                    : nfc.status === "read-error"
                      ? `✗ ${nfc.error?.message || "Falha ao ler NFC. Aproxime novamente."}`
                      : nfc.status === "permission-denied"
                        ? "⚠ Permissão NFC negada. Ative NFC nas configurações."
                        : nfc.status === "not-supported"
                          ? "✗ NFC não suportado neste dispositivo/navegador."
                          : nfc.status === "scanning"
                            ? "📡 Aguardando aproximação da tag NFC..."
                            : "Aguardando leitura NFC..."}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={tabType}
                onChange={(event) => setTabType(event.target.value as "credit" | "prepaid")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                disabled={isProcessing}
              >
                <option value="prepaid">Comanda pre-paga (saldo antecipado)</option>
                <option value="credit">Comanda credito (acerto no final)</option>
              </select>
              <Button onClick={handleConfirmIdentify} disabled={isProcessing}>
                {isProcessing ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {participantTargetKey ? (
        <Modal title="Dividir locacao" onClose={() => setParticipantTargetKey(null)}>
          <div className="space-y-3">
            <input
              value={participantSearch}
              onChange={(event) => setParticipantSearch(event.target.value)}
              placeholder="Buscar participante por nome"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <div className="flex flex-wrap gap-2">
              {filteredCustomers.slice(0, 6).map((customer) => (
                <Button
                  key={customer.id}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const target = cartItems.find((c) => c.key === participantTargetKey);
                    const list = target?.participants ?? [];
                    if (list.some((p) => p.customerId === customer.id)) return;
                    updateParticipants([...list, { customerId: customer.id, amount: 0 }]);
                  }}
                >
                  {customer.name}
                </Button>
              ))}
            </div>
            <input
              value={participantIdentifier}
              onChange={(event) => setParticipantIdentifier(event.target.value)}
              placeholder="Adicionar por identificador"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={participantAmount}
              onChange={(event) => setParticipantAmount(formatCurrencyInput(event.target.value))}
              placeholder="Valor"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <Button
              variant="outline"
              onClick={async () => {
                if (!participantIdentifier) return;
                const res = await apiFetch<{ data: Customer | null }>(`/api/customers/by-identifier/${participantIdentifier}`);
                if (!res.data) return;
                const target = cartItems.find((c) => c.key === participantTargetKey);
                const list = target?.participants ?? [];
                if (list.some((p) => p.customerId === res.data!.id)) return;
                updateParticipants([...list, { customerId: res.data.id, amount: parseCurrencyInput(participantAmount) || 0 }]);
                setParticipantIdentifier("");
                setParticipantAmount("");
              }}
            >
              Adicionar participante
            </Button>
          </div>
        </Modal>
      ) : null}

      {locationModalOpen && locationTarget ? (
        <Modal title={`Adicionar ${locationTarget.name}`} onClose={() => setLocationModalOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-300">
              Valor base: R$ {Number(locationTarget.price).toFixed(2)} / {priceUnits[locationTarget.priceUnit]}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600 dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-300">
              Quantidade calculada: {resolveLocationCharge(locationTarget).quantity}
            </div>
            {locationNotice ? (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  locationNotice.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
                }`}
              >
                {locationNotice.message}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200">
                {error}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-400">Inicio</label>
                <input
                  type="datetime-local"
                  value={locationStart}
                  onChange={(event) => setLocationStart(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-400">Fim</label>
                <input
                  type="datetime-local"
                  value={locationEnd}
                  onChange={(event) => setLocationEnd(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => adjustLocationEnd(-getLocationStepMinutes(locationTarget.priceUnit))}>
                    -{getLocationStepMinutes(locationTarget.priceUnit)} min
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => adjustLocationEnd(getLocationStepMinutes(locationTarget.priceUnit))}>
                    +{getLocationStepMinutes(locationTarget.priceUnit)} min
                  </Button>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-400">Total</label>
                <input
                  value={locationTotal}
                  onChange={(event) => setLocationTotal(formatCurrencyInput(event.target.value))}
                  onBlur={() => calcLocationTotal(locationTarget)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
            </div>
            {locationConflict ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200">
                Local reservado. Cliente: {locationConflict.customerName ?? "Nao informado"}.
              </div>
            ) : null}
            {locationConflict ? (
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-neutral-300">
                <input type="checkbox" checked={confirmReserved} onChange={(event) => setConfirmReserved(event.target.checked)} />
                Confirmar atendimento da reserva
              </label>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setLocationModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!locationTarget) return;
                  const success = await addLocationToCart(locationTarget);
                  if (success) {
                    setLocationModalOpen(false);
                  }
                }}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      <ScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        mode={scanType}
        onScan={(value) => {
          if (scanType === "qr" || scanType === "barcode") {
            setIdentifier(value);
          }
          setScanOpen(false);
        }}
      />
      <AddCreditModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        onConfirm={(amount, method) => {
          addItem({
            key: `credit-${Date.now()}`,
            type: "credit",
            name: "Credito",
            price: amount,
            quantity: 1,
            paymentMethod: method
          });
          setCreditModalOpen(false);
        }}
      />
    </section>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  if (typeof document === "undefined") {
    return null;
  }

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
        className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-lg dark:bg-[#120f0d] sm:p-6"
        style={{ maxHeight: "calc(100vh - 3rem)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-sm text-slate-500 dark:text-neutral-400" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function ItemCard({ title, imageUrl, price, onAdd, onRemove }: { title: string; imageUrl?: string; price: number; onAdd: () => void; onRemove: () => void }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-[#2a2420] dark:bg-[#1b1613]">
      <div className="space-y-2">
        <div className="h-16 w-full rounded-xl bg-slate-100 dark:bg-[#241e1a]">
          {imageUrl ? <img src={imageUrl} alt={title} className="h-full w-full rounded-xl object-cover" /> : null}
        </div>
        <div>
          <p className="text-xs font-semibold">{title}</p>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400">R$ {price.toFixed(2)}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={onRemove}>
          -
        </Button>
        <Button size="sm" onClick={onAdd}>
          +
        </Button>
      </div>
    </div>
  );
}

