"use client";

import { getAuthHeaders } from "@/lib/authClient";
import {
  getCachedBilling,
  loadBillingState,
  refreshBillingState,
  setCachedBilling,
  type BillingState,
} from "@/lib/billingStore";
import { supabase } from "@/lib/supabase";

export type SettingsTabKey =
  | "profile"
  | "security"
  | "notifications"
  | "billing";

export type SettingsProfile = {
  email: string;
  displayName: string;
  avatarUrl: string;
};

export type SettingsPreferences = {
  product_updates: boolean;
  billing_emails: boolean;
  lead_alerts: boolean;
  usage_limit_alerts: boolean;
};

export type SettingsAccount = {
  email: string;
  provider: string;
  emailConfirmed: boolean;
  lastSignIn: string;
};

const defaultProfile: SettingsProfile = {
  email: "",
  displayName: "",
  avatarUrl: "",
};

const defaultPreferences: SettingsPreferences = {
  product_updates: true,
  billing_emails: true,
  lead_alerts: true,
  usage_limit_alerts: true,
};

const defaultAccount: SettingsAccount = {
  email: "",
  provider: "email",
  emailConfirmed: false,
  lastSignIn: "",
};

let profile = defaultProfile;
let profileLoaded = false;
let profilePending:
  | Promise<SettingsProfile>
  | null = null;

let preferences = defaultPreferences;
let preferencesLoaded = false;
let preferencesPending:
  | Promise<SettingsPreferences>
  | null = null;

let account = defaultAccount;
let accountLoaded = false;
let accountPending:
  | Promise<SettingsAccount>
  | null = null;

export function getSettingsSnapshot() {
  const billing =
    getCachedBilling();

  return {
    profile,
    profileLoaded,
    preferences,
    preferencesLoaded,
    account,
    accountLoaded,
    billing:
      billing.billing,
    billingLoaded:
      billing.loaded,
  };
}

export function setCachedProfile(
  nextProfile: SettingsProfile
) {
  profile = nextProfile;
  profileLoaded = true;
}

export function setCachedPreferences(
  nextPreferences: SettingsPreferences
) {
  preferences = nextPreferences;
  preferencesLoaded = true;
}

export {
  setCachedBilling,
  type BillingState as SettingsBilling,
};

export async function loadSettingsProfile(
  force = false
) {
  if (
    !force &&
    profileLoaded
  ) {
    return profile;
  }

  if (
    !force &&
    profilePending
  ) {
    return profilePending;
  }

  profilePending = (async () => {
    const headers =
      await getAuthHeaders();
    const res =
      await fetch(
        "/api/settings/profile",
        { headers }
      );
    const data =
      await res.json();

    if (data.profile) {
      setCachedProfile(
        data.profile
      );
    }

    profilePending = null;
    return profile;
  })();

  return profilePending;
}

export async function loadSettingsPreferences(
  force = false
) {
  if (
    !force &&
    preferencesLoaded
  ) {
    return preferences;
  }

  if (
    !force &&
    preferencesPending
  ) {
    return preferencesPending;
  }

  preferencesPending = (async () => {
    const headers =
      await getAuthHeaders();
    const res =
      await fetch(
        "/api/settings/notifications",
        { headers }
      );
    const data =
      await res.json();

    if (data.preferences) {
      setCachedPreferences(
        data.preferences
      );
    }

    preferencesPending = null;
    return preferences;
  })();

  return preferencesPending;
}

export async function loadSettingsAccount(
  force = false
) {
  if (
    !force &&
    accountLoaded
  ) {
    return account;
  }

  if (
    !force &&
    accountPending
  ) {
    return accountPending;
  }

  accountPending = (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      account = {
        email:
          user.email || "",
        provider:
          String(
            user.app_metadata
              ?.provider ||
              "email"
          ),
        emailConfirmed:
          Boolean(
            user.email_confirmed_at
          ),
        lastSignIn:
          user.last_sign_in_at ||
          "",
      };
    }

    accountLoaded = true;
    accountPending = null;
    return account;
  })();

  return accountPending;
}

export function loadSettingsBilling(
  force = false
) {
  return force
    ? refreshBillingState()
    : loadBillingState();
}

export async function loadSettingsTab(
  tab: SettingsTabKey,
  force = false
) {
  if (tab === "profile") {
    return loadSettingsProfile(force);
  }

  if (tab === "notifications") {
    return loadSettingsPreferences(force);
  }

  if (tab === "billing") {
    return loadSettingsBilling(force);
  }

  return loadSettingsAccount(force);
}

export function prefetchSettingsTabs(
  activeTab: SettingsTabKey
) {
  const run = () => {
    (
      [
        "profile",
        "security",
        "notifications",
        "billing",
      ] as SettingsTabKey[]
    )
      .filter(
        (tab) =>
          tab !== activeTab
      )
      .forEach((tab) => {
        void loadSettingsTab(tab);
      });
  };

  if (
    typeof window !==
      "undefined" &&
    "requestIdleCallback" in window
  ) {
    window.requestIdleCallback(
      run,
      { timeout: 1200 }
    );
    return;
  }

  globalThis.setTimeout(
    run,
    80
  );
}
