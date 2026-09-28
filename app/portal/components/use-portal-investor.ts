'use client';

import { useEffect, useState } from 'react';
import { getAccounts } from '../../components/spm-api';
import type { Guid, InvestorAccount } from '../../components/types';

/**
 * Which investor is this portal showing?
 *
 * ► MOCK AFFORDANCE — the finished platform answers this from authentication. ◄
 * §6-1 item 1 (registration, KYC, profile) is not built, so the portal has no
 * signed-in user to derive an identity from. Rather than hard-coding one
 * investor and hiding the assumption, the choice is explicit and shared: every
 * portal page uses this hook, so switching investor on one screen carries to
 * the others instead of each page disagreeing about who you are.
 *
 * The selection lives in `sessionStorage`, next to the mock request store, and
 * is deleted with it when the real service and real auth arrive.
 */

const SELECTED_KEY = 'spm.portal.investor';

function readSelected(): Guid | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

function writeSelected(id: Guid): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SELECTED_KEY, id);
  } catch {
    // Storage blocked; the in-page selection still works for this view.
  }
}

export interface PortalInvestor {
  accounts: InvestorAccount[] | null;
  accountId: Guid | '';
  account: InvestorAccount | null;
  setAccountId: (id: Guid) => void;
  failed: boolean;
}

export function usePortalInvestor(): PortalInvestor {
  const [accounts, setAccounts] = useState<InvestorAccount[] | null>(null);
  const [accountId, setAccountIdState] = useState<Guid | ''>('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getAccounts()
      .then((all) => {
        if (!alive) return;
        const active = all.filter((a) => a.isActive);
        setAccounts(active);

        // Read the stored choice only after mount — reading storage during
        // render would make the server and client disagree and break hydration.
        const stored = readSelected();
        const valid = stored && active.some((a) => a.id === stored) ? stored : null;
        if (valid) {
          setAccountIdState(valid);
        } else if (active.length > 0) {
          setAccountIdState(active[0].id);
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  function setAccountId(id: Guid): void {
    setAccountIdState(id);
    writeSelected(id);
  }

  return {
    accounts,
    accountId,
    account: accounts?.find((a) => a.id === accountId) ?? null,
    setAccountId,
    failed,
  };
}
