"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiImage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import {
  deleteManagedRoom,
  saveManagedRoom,
  type ManagedRoom,
} from "./manage-room-actions";

type EditorMode = "add" | "edit";
type RoomForm = {
  name: string;
  description: string;
  maxCapacity: string;
  prohibitions: string;
  thumbnail: string | null;
  gallery: (string | null)[];
};
type ModalState =
  | { kind: "editor"; mode: EditorMode; roomId?: string }
  | { kind: "delete"; roomId: string }
  | null;

const emptyForm = (): RoomForm => ({
  name: "",
  description: "",
  maxCapacity: "",
  prohibitions: "",
  thumbnail: null,
  gallery: [null, null],
});

const source = (value: string) =>
  /^(https?:)?\/\//.test(value) ||
  value.startsWith("/") ||
  value.startsWith("data:image/")
    ? value
    : `/${value}`;

function Dialog({
  title,
  children,
  onClose,
  danger = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  danger?: boolean;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-3 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${danger ? "max-w-md" : "max-w-xl"} rounded-lg bg-white p-5 shadow-2xl sm:p-6`}
      >
        {children}
      </section>
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      setError("Choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setError("Image must be 4.5 MB or less. Try compressing it?");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.onerror = () => setError("Could not read this image.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="min-w-0">
      <span className="mb-1 block text-xs font-bold text-gray-800">
        {label}
      </span>
      <div className="rounded-lg border border-[#9fb7ee] p-2 shadow-sm">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={upload}
          className="sr-only"
          aria-label={`Upload ${label.toLowerCase()}`}
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-[#8ca9e6] bg-[#f1f5fa] text-3xl text-accent-1 hover:bg-[#e3ebfb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"
            aria-label={
              value
                ? `Replace ${label.toLowerCase()}`
                : `Add ${label.toLowerCase()}`
            }
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={source(value)}
                alt={`${label} preview`}
                className="h-full w-full object-cover"
              />
            ) : (
              <FiPlus aria-hidden="true" />
            )}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={`Remove ${label.toLowerCase()}`}
              className="absolute right-1 top-1 rounded-full bg-white p-1 text-accent-2 shadow hover:bg-red-50"
            >
              <FiX />
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-accent-2">
          {error}
        </p>
      )}
    </div>
  );
}

function RoomEditor({
  mode,
  room,
  existingRooms,
  onCancel,
  onSave,
}: {
  mode: EditorMode;
  room?: ManagedRoom;
  existingRooms: ManagedRoom[];
  onCancel: () => void;
  onSave: (data: RoomForm) => Promise<void>;
}) {
  const [form, setForm] = useState<RoomForm>(() =>
    room
      ? {
          name: room.name,
          description: room.description || "",
          maxCapacity: room.maxCapacity == null ? "" : String(room.maxCapacity),
          prohibitions: room.prohibitions || "",
          thumbnail: room.thumbnail,
          gallery: [...room.gallery],
        }
      : emptyForm(),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof RoomForm>(key: K, value: RoomForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const name = form.name.trim();
    const capacity = Number(form.maxCapacity);
    if (!name) {
      setError("Please enter a room name.");
      return;
    }
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      setError("Maximum capacity must be a positive whole number.");
      return;
    }
    if (
      existingRooms.some(
        (item) =>
          item.roomId !== room?.roomId &&
          item.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      setError("A room with this name already exists.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, name, maxCapacity: String(capacity) });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save room.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-[#8ca9e6] bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-accent-1 focus:ring-2 focus:ring-accent-1/20";

  return (
    <Dialog
      title={mode === "add" ? "Add Room" : "Edit Room"}
      onClose={onCancel}
    >
      <div className="mb-4 flex items-center justify-between border-b border-[#8da7e5] pb-2">
        <h2 className="text-xl font-bold">
          {mode === "add" ? "Add Room" : "Edit Room"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close form"
          className="rounded p-1 hover:bg-gray-100"
        >
          <FiX />
        </button>
      </div>
      <form onSubmit={save} className="space-y-3">
        {/* One 3-column row so the Thumbnail, Image 1 and Image 2 labels and cards line up. */}
        <div
          role="group"
          aria-label="Room images"
          className="grid grid-cols-3 items-start gap-3"
        >
          <ImageField
            label="Thumbnail"
            value={form.thumbnail}
            onChange={(value) => update("thumbnail", value)}
          />
          {form.gallery.map((image, index) => (
            <ImageField
              key={index}
              label={`Image ${index + 1}`}
              value={image}
              onChange={(value) =>
                update(
                  "gallery",
                  form.gallery.map((existing, position) =>
                    position === index ? value : existing,
                  ),
                )
              }
            />
          ))}
        </div>
        <label className="block text-xs font-bold">
          Name <span className="text-red-600">*</span>
          <input
            required
            maxLength={120}
            className={`${inputClass} mt-1`}
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Enter room name"
          />
        </label>
        <label className="block text-xs font-bold">
          Description
          <textarea
            rows={2}
            maxLength={2000}
            className={`${inputClass} mt-1 resize-y`}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Room description"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold">
            Max Capacity <span className="text-red-600">*</span>
            <input
              required
              type="number"
              min={1}
              max={100000}
              step={1}
              className={`${inputClass} mt-1`}
              value={form.maxCapacity}
              onChange={(event) => update("maxCapacity", event.target.value)}
            />
          </label>
          <label className="block text-xs font-bold">
            Prohibitions
            <input
              maxLength={500}
              className={`${inputClass} mt-1`}
              value={form.prohibitions}
              onChange={(event) => update("prohibitions", event.target.value)}
              placeholder="e.g. Food and drinks"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-accent-2">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="min-w-32 rounded-full bg-accent-2 px-5 py-2 font-bold text-white hover:brightness-110"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-w-32 rounded-full bg-accent-1 px-5 py-2 font-bold text-white hover:brightness-110"
          >
            {saving ? "Saving..." : mode === "add" ? "Add Room" : "Update"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function ManageRooms({ initialRooms }: { initialRooms: ManagedRoom[] }) {
  const [rooms, setRooms] = useState<ManagedRoom[]>(initialRooms);
  const [query, setQuery] = useState("");
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openActionsId) return;
    const handleClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node))
        setOpenActionsId(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenActionsId(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openActionsId]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rooms.filter((room) => room.name.toLowerCase().includes(term));
  }, [query, rooms]);

  const selectedRoom =
    modal && "roomId" in modal
      ? rooms.find((room) => room.roomId === modal.roomId)
      : undefined;

  const saveRoom = async (data: RoomForm) => {
    if (!modal || modal.kind !== "editor") return;
    // Send actual binary File objects via multipart FormData instead of
    // sending multi-megabyte base64 strings through React's serializer.
    const payload = new FormData();
    if (modal.mode === "edit" && selectedRoom)
      payload.set("roomId", selectedRoom.roomId);
    payload.set("name", data.name);
    payload.set("description", data.description);
    payload.set("maxCapacity", data.maxCapacity);
    payload.set("prohibitions", data.prohibitions);
    const fields = ["thumbnail", "gallery0", "gallery1"] as const;
    const selectedImages = [data.thumbnail, ...data.gallery];
    for (const [index, field] of fields.entries()) {
      const value = selectedImages[index];
      if (!value) {
        payload.set(field, "");
      } else if (value.startsWith("data:")) {
        // FileReader produced a preview data URI. Convert it back to a binary
        // Blob before sending; base64 is not placed in the action arguments.
        const blob = await (await fetch(value)).blob();
        const ext = {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/webp": "webp",
          "image/gif": "gif",
        }[blob.type];
        if (!ext || blob.size > 4.5 * 1024 * 1024)
          throw new Error(
            "Each image must be PNG, JPEG, WebP, or GIF and at most 4.5 MB.",
          );
        payload.set(
          field,
          new File([blob], `${field}.${ext}`, { type: blob.type }),
        );
      } else {
        payload.set(field, value);
      }
    }
    const result = await saveManagedRoom(payload);
    if (!result.ok) throw new Error(result.error);
    if (modal.mode === "edit") {
      setRooms((current) =>
        current.map((item) =>
          item.roomId === result.room.roomId ? result.room : item,
        ),
      );
      setMessage(`Updated "${result.room.name}" successfully.`);
    } else {
      setRooms((current) => [...current, result.room]);
      setMessage(`Added "${result.room.name}" successfully.`);
    }
    setModal(null);
  };

  const deleteRoom = async () => {
    if (!modal || modal.kind !== "delete" || !selectedRoom || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const result = await deleteManagedRoom(selectedRoom.roomId);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setRooms((current) =>
        current.filter((room) => room.roomId !== selectedRoom.roomId),
      );
      setMessage(`Deleted "${selectedRoom.name}" successfully.`);
      setModal(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete this room.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Search for a room</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a room"
            className="h-11 w-full rounded-full bg-white px-5 pr-12 text-sm shadow-sm outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-accent-1"
          />
          <FiSearch
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-700"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setMessage("");
            setOpenActionsId(null);
            setModal({ kind: "editor", mode: "add" });
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-1 px-6 py-2.5 font-bold text-white hover:brightness-110"
        >
          <FiPlus aria-hidden="true" /> Add Room
        </button>
      </div>

      {message && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          <FiCheck aria-hidden="true" /> {message}
          <button
            type="button"
            onClick={() => setMessage("")}
            className="ml-auto p-1"
            aria-label="Dismiss notification"
          >
            <FiX />
          </button>
        </div>
      )}

      <div className="min-h-80 overflow-x-auto rounded-md bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white">
            <tr className="border-b border-gray-200">
              <th className="w-[27%] px-5 py-4 font-bold">Room Thumbnail</th>
              <th className="w-[36%] px-5 py-4 font-bold">Room Name</th>
              <th className="w-[20%] px-5 py-4 text-center font-bold">
                Max Capacity
              </th>
              <th className="px-5 py-4 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((room, index) => (
              <tr
                key={room.roomId}
                className={`${index % 2 === 0 ? "bg-[#dedede]" : "bg-[#f3f3f3]"} border-b border-white/70`}
              >
                <td className="px-3 py-2">
                  {room.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={source(room.thumbnail)}
                      alt={`${room.name} thumbnail`}
                      className="h-20 w-40 max-w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-40 max-w-full items-center justify-center gap-2 rounded-md bg-white/70 text-xs text-gray-500">
                      <FiImage size={20} /> No image
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">{room.name}</td>
                <td className="px-5 py-4 text-center">
                  {room.maxCapacity ?? "—"}
                </td>
                <td className="px-5 py-4 text-right">
                  <div
                    className="relative inline-block text-left"
                    ref={
                      openActionsId === room.roomId ? dropdownRef : undefined
                    }
                  >
                    <button
                      type="button"
                      aria-expanded={openActionsId === room.roomId}
                      aria-haspopup="menu"
                      onClick={() =>
                        setOpenActionsId(
                          openActionsId === room.roomId ? null : room.roomId,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded bg-accent-1 px-3 py-2 text-white hover:brightness-110"
                    >
                      Actions <FiChevronDown aria-hidden="true" />
                    </button>
                    {openActionsId === room.roomId && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg bg-white p-1 shadow-xl ring-1 ring-gray-200"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenActionsId(null);
                            setMessage("");
                            setModal({
                              kind: "editor",
                              mode: "edit",
                              roomId: room.roomId,
                            });
                          }}
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-accent-1 hover:bg-blue-50"
                        >
                          <FiEdit2 /> Edit
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenActionsId(null);
                            setMessage("");
                            setDeleteError("");
                            setModal({ kind: "delete", roomId: room.roomId });
                          }}
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-accent-2 hover:bg-red-50"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-gray-500">
            {rooms.length === 0
              ? "No rooms have been added yet. Click Add Room to create one."
              : "No rooms match your search."}
          </div>
        )}
      </div>

      {modal?.kind === "editor" && (
        <RoomEditor
          key={`${modal.mode}-${modal.roomId || "new"}`}
          mode={modal.mode}
          room={selectedRoom}
          existingRooms={rooms}
          onCancel={() => setModal(null)}
          onSave={saveRoom}
        />
      )}
      {modal?.kind === "delete" && selectedRoom && (
        <Dialog
          title="Confirm delete room"
          onClose={() => setModal(null)}
          danger
        >
          <div className="text-center">
            <FiTrash2
              aria-hidden="true"
              className="mx-auto mb-1 text-6xl text-accent-2"
            />
            <h2 className="text-3xl font-extrabold text-accent-2">WARNING!</h2>
            <p className="mt-1 text-xl font-bold sm:text-2xl">
              You’re about to remove a room!
            </p>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Are you sure you want to remove{" "}
              <strong>{selectedRoom.name}</strong>?
            </p>
            {deleteError && (
              <p
                role="alert"
                className="mt-3 text-sm font-semibold text-accent-2"
              >
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={deleteRoom}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-1 px-4 py-3 font-bold text-white hover:brightness-110"
              >
                <FiCheck aria-hidden="true" />{" "}
                {deleting ? "Deleting..." : "Yes, Delete it!"}
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-2 px-4 py-3 font-bold text-white hover:brightness-110"
              >
                <FiX aria-hidden="true" /> No, Keep it!
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
