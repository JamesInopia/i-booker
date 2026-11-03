"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiUser } from "react-icons/fi";
import { ConfirmDialog, SuspendDialog } from "./account-dialogs";
import { setLiaisonRole, unsuspendUser } from "./actions";
import { LEVEL_COLOR, LEVEL_LABEL, type AccountRow } from "./types";

type DialogKind = "suspend" | "unsuspend" | "grant" | "revoke";

const th = "px-4 py-3 text-left text-base font-bold";
const td = "px-4 py-2";

export function AccountsTable({ accounts }: { accounts: AccountRow[] }) {
  const [dialog, setDialog] = useState<{ kind: DialogKind; account: AccountRow } | null>(null);
  const close = () => setDialog(null);

  return (
    <section className="min-h-[26rem] rounded-lg bg-container p-3 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className={th}>User ID</th>
              <th scope="col" className={th}>Username</th>
              <th scope="col" className={th}>Level</th>
              <th scope="col" className={th}>Email</th>
              <th scope="col" className={`${th} text-center`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-500">
                  No users match your filters.
                </td>
              </tr>
            )}
            {accounts.map((a, i) => (
              <tr key={a.email} className={i % 2 === 0 ? "bg-accent-6" : "bg-accent-5"}>
                <td className={`${td} text-sm`}>{a.shortId}</td>
                <td className={td}>
                  <div className="text-lg leading-tight">{a.name}</div>
                  {a.suspended && (
                    <div className="text-xs font-semibold text-red-600" title={a.suspensionReason ?? undefined}>
                      {a.suspendedUntilLabel ? `Suspended until ${a.suspendedUntilLabel}` : "Suspended indefinitely"}
                    </div>
                  )}
                </td>
                <td className={td}>
                  <span className="flex items-center gap-2 text-sm">
                    <FiUser size={20} className={LEVEL_COLOR[a.role]} aria-hidden="true" />
                    {LEVEL_LABEL[a.role]}
                  </span>
                </td>
                <td className={`${td} text-sm`}>{a.email}</td>
                <td className={`${td} text-center`}>
                  <ActionsMenu account={a} onSelect={(kind) => setDialog({ kind, account: a })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog?.kind === "suspend" && <SuspendDialog account={dialog.account} onClose={close} />}
      {dialog?.kind === "unsuspend" && (
        <ConfirmDialog
          title={`Lift suspension for ${dialog.account.name}?`}
          description="They'll be able to submit booking requests again right away."
          confirmLabel="Lift suspension"
          pendingLabel="Lifting..."
          tone="primary"
          onClose={close}
          onConfirm={() => unsuspendUser(dialog.account.email)}
        />
      )}
      {dialog?.kind === "grant" && (
        <ConfirmDialog
          title={`Give Admin-Liaison role to ${dialog.account.name}?`}
          description="They'll be able to review booking requests and use the admin dashboard."
          confirmLabel="Give role"
          pendingLabel="Saving..."
          tone="primary"
          onClose={close}
          onConfirm={() => setLiaisonRole(dialog.account.email, true)}
        />
      )}
      {dialog?.kind === "revoke" && (
        <ConfirmDialog
          title={`Revoke Admin-Liaison role from ${dialog.account.name}?`}
          description="They'll go back to being a requestor and lose access to the admin dashboard."
          confirmLabel="Revoke role"
          pendingLabel="Saving..."
          tone="danger"
          onClose={close}
          onConfirm={() => setLiaisonRole(dialog.account.email, false)}
        />
      )}
    </section>
  );
}

function ActionsMenu({ account, onSelect }: { account: AccountRow; onSelect: (kind: DialogKind) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const locked = account.role === "admin_supervisor";

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  }

  const pick = (kind: DialogKind) => {
    setOpen(false);
    onSelect(kind);
  };

  const item = "block w-full px-4 py-2 text-left hover:bg-gray-100";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={locked}
        title={locked ? "Admin supervisors can't be modified" : undefined}
        aria-label={`Actions for ${account.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-md bg-accent-1 px-3 py-1 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
      >
        Actions <FiChevronDown size={14} aria-hidden="true" />
      </button>

      {open && !locked && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white text-left text-sm shadow-lg"
        >
          {account.role === "admin_liaison" ? (
            <button type="button" role="menuitem" className={item} onClick={() => pick("revoke")}>
              Revoke Admin-Liaison
            </button>
          ) : (
            <button type="button" role="menuitem" className={item} onClick={() => pick("grant")}>
              Give Admin-Liaison
            </button>
          )}
          {account.suspended ? (
            <button type="button" role="menuitem" className={item} onClick={() => pick("unsuspend")}>
              Lift suspension
            </button>
          ) : (
            <button type="button" role="menuitem" className={`${item} text-red-600`} onClick={() => pick("suspend")}>
              Suspend user
            </button>
          )}
        </div>
      )}
    </>
  );
}
