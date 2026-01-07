import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";

interface Booking {
  id: string;
  locationId: string;
  startAt: string;
  endAt: string;
  total: string;
  status: string;
}

export function AdminBookings() {
  const queryClient = useQueryClient();
  const [locationId, setLocationId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [total, setTotal] = useState("");
  const [participants, setParticipants] = useState<Array<{ customerId: string; share: string }>>([]);
  const [availability, setAvailability] = useState<Array<{ id: string; startAt: string; endAt: string }>>([]);

  const bookingsQuery = useQuery({
    queryKey: ["bookings", startAt, endAt, locationId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startAt) params.set("startAt", new Date(startAt).toISOString());
      if (endAt) params.set("endAt", new Date(endAt).toISOString());
      if (locationId) params.set("locationId", locationId);
      const query = params.toString();
      return apiFetch<{ data: Booking[] }>(`/api/bookings${query ? `?${query}` : ""}`);
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "checkin" | "checkout" }) => {
      return apiFetch(`/api/bookings/${id}/${action}`, { method: "POST" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] })
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/locations")
  });

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/customers")
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<Booking>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          locationId,
          customerId: customerId || undefined,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          total: Number(total),
          status: "pending",
          participants: participants
            .filter((p) => p.customerId && p.share)
            .map((p) => ({ customerId: p.customerId, share: Number(p.share) }))
        })
      });
    },
    onSuccess: () => {
      setLocationId("");
      setCustomerId("");
      setStartAt("");
      setEndAt("");
      setTotal("");
      setParticipants([]);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    }
  });

  const availabilityMutation = useMutation({
    mutationFn: async () => {
      if (!locationId || !startAt || !endAt) {
        return { slots: [] as Array<{ id: string; startAt: string; endAt: string }> };
      }
      return apiFetch<{ slots: Array<{ id: string; startAt: string; endAt: string }> }>(
        `/api/locations/${locationId}/availability?startAt=${new Date(startAt).toISOString()}&endAt=${new Date(endAt).toISOString()}`
      );
    },
    onSuccess: (data) => setAvailability(data.slots)
  });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Reservas</h2>
        <p className="text-sm text-slate-600">Criacao e acompanhamento.</p>
      </header>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Nova reserva</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          >
            <option value="">Selecione o local</option>
            {locationsQuery.data?.data?.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          >
            <option value="">Cliente principal (opcional)</option>
            {customersQuery.data?.data?.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <input
            value={total}
            onChange={(event) => setTotal(event.target.value)}
            placeholder="Total"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
            placeholder="Inicio (YYYY-MM-DD HH:MM)"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            placeholder="Fim (YYYY-MM-DD HH:MM)"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Divisao de valor</p>
          {participants.map((participant, index) => (
            <div key={`${participant.customerId}-${index}`} className="grid gap-2 md:grid-cols-3">
              <select
                value={participant.customerId}
                onChange={(event) => {
                  const copy = [...participants];
                  copy[index] = { ...copy[index], customerId: event.target.value };
                  setParticipants(copy);
                }}
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              >
                <option value="">Cliente</option>
                {customersQuery.data?.data?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              <input
                value={participant.share}
                onChange={(event) => {
                  const copy = [...participants];
                  copy[index] = { ...copy[index], share: event.target.value };
                  setParticipants(copy);
                }}
                placeholder="Valor"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setParticipants(participants.filter((_, i) => i !== index))}
              >
                Remover
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setParticipants([...participants, { customerId: "", share: "" }])}
          >
            Adicionar participante
          </Button>
        </div>
        <Button className="mt-3" onClick={() => createMutation.mutate()}>
          {createMutation.isPending ? "Salvando..." : "Adicionar reserva"}
        </Button>
        <Button className="mt-3 ml-2" variant="outline" onClick={() => availabilityMutation.mutate()}>
          Ver disponibilidade
        </Button>
        {availability.length ? (
          <div className="mt-3 rounded-xl bg-brand-50 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Conflitos encontrados</p>
            {availability.map((slot) => (
              <p key={slot.id} className="text-sm text-slate-600">
                {new Date(slot.startAt).toLocaleString("pt-BR")} - {new Date(slot.endAt).toLocaleString("pt-BR")}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <div className="grid gap-3">
        {bookingsQuery.data?.data?.map((booking) => (
          <div key={booking.id} className="rounded-2xl border border-brand-100 bg-white p-4">
            <h3 className="text-lg font-semibold">Reserva {booking.id}</h3>
            <p className="text-sm text-slate-600">Local: {booking.locationId}</p>
            <p className="text-sm text-slate-600">
              {new Date(booking.startAt).toLocaleString("pt-BR")} - {new Date(booking.endAt).toLocaleString("pt-BR")}
            </p>
            <p className="text-sm text-slate-600">R$ {booking.total}</p>
            <p className="text-xs text-brand-500">{booking.status}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus.mutate({ id: booking.id, action: "checkin" })}
              >
                Check-in
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus.mutate({ id: booking.id, action: "checkout" })}
              >
                Check-out
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
