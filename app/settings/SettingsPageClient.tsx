"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bell,
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  ExternalLink,
  KeyRound,
  Loader2,
  LogOut,
  Save,
  Shield,
  Target,
  Upload,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { getAuthHeaders } from "@/lib/authClient";
import {
  getSettingsSnapshot,
  loadSettingsAccount,
  loadSettingsBilling,
  loadSettingsPreferences,
  loadSettingsProfile,
  prefetchSettingsTabs,
  setCachedPreferences,
  setCachedProfile,
} from "@/lib/settingsStore";

export type TabKey =
  | "profile"
  | "security"
  | "notifications"
  | "billing";

type Profile = {
  email: string;
  displayName: string;
  avatarUrl: string;
};

type Preferences = {
  product_updates: boolean;
  billing_emails: boolean;
  lead_alerts: boolean;
  usage_limit_alerts: boolean;
};

type Billing = {
  proAiPlan: string;
  proAiStatus: string;
  leadEnginePlan: string;
  leadEngineStatus: string;
  leadEngineTrialEndsAt: string | null;
  hasLeadEnginePro: boolean;
};

type AccountInfo = {
  email: string;
  provider: string;
  emailConfirmed: boolean;
  lastSignIn: string;
};

const tabs: Array<{
  key: TabKey;
  label: string;
  description: string;
  icon: typeof User;
}> = [
  {
    key: "profile",
    label: "Profile",
    description:
      "Identity, image, and workspace presence",
    icon: User,
  },
  {
    key: "security",
    label: "Security",
    description:
      "Password, provider, and session controls",
    icon: Shield,
  },
  {
    key: "notifications",
    label: "Notifications",
    description:
      "Product, billing, and lead alerts",
    icon: Bell,
  },
  {
    key: "billing",
    label: "Billing",
    description:
      "Plans, trials, and Stripe tools",
    icon: CreditCard,
  },
];

const notificationOptions: Array<{
  key: keyof Preferences;
  title: string;
  description: string;
}> = [
  {
    key: "product_updates",
    title: "Product updates",
    description:
      "New features, improvements, and Inquire announcements.",
  },
  {
    key: "billing_emails",
    title: "Billing emails",
    description:
      "Receipts, subscription changes, trials, and payment notices.",
  },
  {
    key: "lead_alerts",
    title: "Lead alerts",
    description:
      "Saved lead activity and Lead Engine workflow updates.",
  },
  {
    key: "usage_limit_alerts",
    title: "Usage limit alerts",
    description:
      "Warnings when chat, image, or PDF usage approaches plan limits.",
  },
];

const tabFromLocation =
  (): TabKey | null => {
    if (
      typeof window === "undefined"
    ) {
      return null;
    }

    const requestedTab =
      new URLSearchParams(
        window.location.search
      ).get("tab") as TabKey | null;

    return tabs.some(
      (
        tab
      ) =>
        tab.key ===
        requestedTab
    )
      ? requestedTab
      : null;
  };

export default function SettingsPageClient({
  initialTab,
}: {
  initialTab: TabKey;
}) {
  const router =
    useRouter();
  const initialSettings =
    useMemo(
      () =>
        getSettingsSnapshot(),
      []
    );
  const [activeTab, setActiveTab] =
    useState<TabKey>(
      initialTab
    );
  const [profile, setProfile] =
    useState<Profile>({
      email:
        initialSettings
          .profile.email,
      displayName:
        initialSettings
          .profile.displayName,
      avatarUrl:
        initialSettings
          .profile.avatarUrl,
    });
  const [profileLoading, setProfileLoading] =
    useState(
      !initialSettings
        .profileLoaded
    );
  const [profileSaving, setProfileSaving] =
    useState(false);
  const [uploading, setUploading] =
    useState(false);
  const [dragging, setDragging] =
    useState(false);
  const [previewUrl, setPreviewUrl] =
    useState("");
  const [preferences, setPreferences] =
    useState<Preferences>(
      initialSettings
        .preferences
    );
  const [preferencesLoading, setPreferencesLoading] =
    useState(
      !initialSettings
        .preferencesLoaded
    );
  const [preferencesSaving, setPreferencesSaving] =
    useState(false);
  const [billing, setBilling] =
    useState<Billing | null>(
      initialSettings
        .billing
    );
  const [billingLoading, setBillingLoading] =
    useState(
      !initialSettings
        .billingLoaded
    );
  const [billingStatus, setBillingStatus] =
    useState("");
  const [account, setAccount] =
    useState<AccountInfo>({
      email:
        initialSettings
          .account.email,
      provider:
        initialSettings
          .account.provider,
      emailConfirmed:
        initialSettings
          .account.emailConfirmed,
      lastSignIn:
        initialSettings
          .account.lastSignIn,
    });
  const [password, setPassword] =
    useState("");
  const [securityStatus, setSecurityStatus] =
    useState("");
  const [securityWorking, setSecurityWorking] =
    useState(false);
  const [toast, setToast] =
    useState<{
      type:
        | "success"
        | "error";
      message: string;
    } | null>(null);
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const initials =
    useMemo(
      () =>
        (
          profile.displayName ||
          profile.email ||
          "I"
        )
          .slice(0, 2)
          .toUpperCase(),
      [
        profile.displayName,
        profile.email,
      ]
    );

  useEffect(() => {
    const syncTab =
      () => {
        const requestedTab =
          tabFromLocation();

        if (
          requestedTab &&
          requestedTab !==
            activeTab
        ) {
          setActiveTab(
            requestedTab
          );
        }
      };

    syncTab();

    const timeout =
      window.setTimeout(
        syncTab,
        0
      );

    return () =>
      window.clearTimeout(
        timeout
      );
  });

  useEffect(() => {
    const handlePopState =
      () => {
        const requestedTab =
          tabFromLocation();

        if (requestedTab) {
          setActiveTab(
            requestedTab
          );
        }
      };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () =>
      window.removeEventListener(
        "popstate",
        handlePopState
      );
  }, []);

  useEffect(() => {
    let alive = true;

    const loadActiveTab =
      async () => {
        if (
          activeTab === "profile"
        ) {
          setProfileLoading(
            !getSettingsSnapshot()
              .profileLoaded
          );
          const nextProfile =
            await loadSettingsProfile();

          if (alive) {
            setProfile(nextProfile);
            setProfileLoading(false);
          }
        }

        if (
          activeTab ===
          "notifications"
        ) {
          setPreferencesLoading(
            !getSettingsSnapshot()
              .preferencesLoaded
          );
          const nextPreferences =
            await loadSettingsPreferences();

          if (alive) {
            setPreferences(
              nextPreferences
            );
            setPreferencesLoading(false);
          }
        }

        if (
          activeTab === "billing"
        ) {
          setBillingLoading(
            !getSettingsSnapshot()
              .billingLoaded
          );
          const nextBilling =
            await loadSettingsBilling();

          if (alive) {
            setBilling(
              nextBilling
            );
            setBillingLoading(false);
          }
        }

        if (
          activeTab === "security"
        ) {
          const nextAccount =
            await loadSettingsAccount();

          if (alive) {
            setAccount(nextAccount);
          }
        }

        prefetchSettingsTabs(
          activeTab
        );
      };

    loadActiveTab();

    return () => {
      alive = false;
    };
  }, [activeTab]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => setToast(null),
        3200
      );

    return () =>
      window.clearTimeout(
        timeout
      );
  }, [toast]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);

  const showToast =
    (
      type:
        | "success"
        | "error",
      message: string
    ) => {
      setToast({
        type,
        message,
      });
    };

  const switchTab =
    (
      tab: TabKey
    ) => {
      setActiveTab(tab);
      window.history.replaceState(
        null,
        "",
        `/settings?tab=${tab}`
      );
    };

  const saveProfile =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();
      setProfileSaving(true);

      try {
        const headers =
          await getAuthHeaders();
        const res =
          await fetch(
            "/api/settings/profile",
            {
              method:
                "PUT",
              headers: {
                "Content-Type":
                  "application/json",
                ...headers,
              },
              body:
                JSON.stringify({
                  displayName:
                    profile.displayName,
                }),
            }
          );
        const data =
          await res.json();

        if (data.profile) {
          setCachedProfile(
            data.profile
          );
          setProfile(
            data.profile
          );
          showToast(
            "success",
            "Profile saved."
          );
        } else {
          showToast(
            "error",
            data.error ||
              "Profile could not be saved."
          );
        }
      } catch {
        showToast(
          "error",
          "Profile could not be saved. Check your connection and try again."
        );
      } finally {
        setProfileSaving(false);
      }
    };

  const uploadAvatar =
    async (
      file: File | null
    ) => {
      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        showToast(
          "error",
          "Choose an image file."
        );
        return;
      }

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      setPreviewUrl(
        URL.createObjectURL(
          file
        )
      );
      setUploading(true);

      try {
        const headers =
          await getAuthHeaders();
        const body =
          new FormData();

        body.append(
          "avatar",
          file
        );

        const res =
          await fetch(
            "/api/settings/profile/avatar",
            {
              method:
                "POST",
              headers,
              body,
            }
          );
        const data =
          await res.json();

        if (data.profile) {
          setCachedProfile(
            data.profile
          );
          setProfile(
            data.profile
          );
          setPreviewUrl("");
          showToast(
            "success",
            "Profile image updated."
          );
        } else {
          showToast(
            "error",
            data.error ||
              "Profile image could not be uploaded."
          );
        }
      } catch {
        showToast(
          "error",
          "Profile image could not be uploaded. Check your connection and try again."
        );
      } finally {
        setUploading(false);
      }
    };

  const savePreferences =
    async () => {
      setPreferencesSaving(true);

      try {
        const headers =
          await getAuthHeaders();
        const res =
          await fetch(
            "/api/settings/notifications",
            {
              method:
                "PUT",
              headers: {
                "Content-Type":
                  "application/json",
                ...headers,
              },
              body:
                JSON.stringify({
                  preferences,
                }),
            }
          );
        const data =
          await res.json();

        if (data.preferences) {
          setCachedPreferences(
            data.preferences
          );
          setPreferences(
            data.preferences
          );
          showToast(
            "success",
            "Notification preferences saved."
          );
        } else {
          showToast(
            "error",
            data.error ||
              "Preferences could not be saved."
          );
        }
      } catch {
        showToast(
          "error",
          "Preferences could not be saved. Check your connection and try again."
        );
      } finally {
        setPreferencesSaving(false);
      }
    };

  const startCheckout =
    async (
      type:
        | "pro-ai"
        | "lead-engine-pro"
    ) => {
      setBillingStatus("");
      try {
        const headers =
          await getAuthHeaders();

        if (
          !headers.Authorization
        ) {
          window.location.href =
            `/login?next=${encodeURIComponent(
              window.location.pathname +
                window.location.search
            )}`;
          return;
        }

        const res =
          await fetch(
            type ===
              "lead-engine-pro"
              ? "/api/stripe/lead-engine-checkout"
              : "/api/checkout",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
                ...headers,
              },
            }
          );
        const data =
          await res.json();

        if (data.url) {
          window.location.href =
            data.url;
          return;
        }

        setBillingStatus(
          data.error ||
            "Checkout could not be opened."
        );
      } catch {
        setBillingStatus(
          "Checkout could not be opened. Check your connection and try again."
        );
      }
    };

  const openPortal =
    async () => {
      setBillingStatus("");
      try {
        const headers =
          await getAuthHeaders();
        const res =
          await fetch(
            "/api/stripe/customer-portal",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
                ...headers,
              },
            }
          );
        const data =
          await res.json();

        if (data.url) {
          window.location.href =
            data.url;
          return;
        }

        setBillingStatus(
          data.error ||
            "Stripe Customer Portal is not available for this account yet."
        );
      } catch {
        setBillingStatus(
          "Stripe Customer Portal could not be opened. Check your connection and try again."
        );
      }
    };

  const updatePassword =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();
      setSecurityWorking(true);
      setSecurityStatus("");

      const { error } =
        await supabase.auth.updateUser(
          {
            password,
          }
        );

      const message =
        error
          ? error.message
          : "Password updated.";

      setSecurityStatus(message);
      showToast(
        error
          ? "error"
          : "success",
        message
      );
      setPassword("");
      setSecurityWorking(false);
    };

  const sendResetEmail =
    async () => {
      setSecurityWorking(true);
      setSecurityStatus("");

      const { error } =
        await supabase.auth
          .resetPasswordForEmail(
            account.email,
            {
              redirectTo:
                `${window.location.origin}/settings?tab=security`,
            }
          );

      const message =
        error
          ? error.message
          : "Password reset email sent.";

      setSecurityStatus(message);
      showToast(
        error
          ? "error"
          : "success",
        message
      );
      setSecurityWorking(false);
    };

  const signOutEverywhere =
    async () => {
      setSecurityWorking(true);
      await supabase.auth.signOut({
        scope:
          "global",
      });
      router.replace(
        "/login"
      );
    };

  return (
    <main className="h-screen overflow-y-auto bg-[#050505] p-3 text-white md:p-6">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[90] rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
            toast.type ===
            "success"
              ? "border-emerald-300/25 bg-emerald-300/15 text-emerald-50"
              : "border-red-300/25 bg-red-500/15 text-red-50"
          }`}
        >
          {toast.message}
        </div>
      )}

      <section className="min-h-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">
                Workspace
              </div>
              <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                Settings
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/50">
                Manage identity, access, notifications, and billing from one focused workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
              Signed in as{" "}
              <span className="text-white">
                {profile.email ||
                  account.email ||
                  "Loading..."}
              </span>
            </div>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[272px_1fr]">
            <nav
              aria-label="Settings sections"
              className="rounded-2xl border border-white/10 bg-black/20 p-2 lg:sticky lg:top-6 lg:h-fit"
            >
              <div
                role="tablist"
                className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1"
              >
                {tabs.map(
                  (
                    tab
                  ) => {
                    const Icon =
                      tab.icon;
                    const active =
                      activeTab ===
                      tab.key;

                    return (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={
                          active
                        }
                        aria-controls={`settings-panel-${tab.key}`}
                        key={
                          tab.key
                        }
                        onClick={() =>
                          switchTab(
                            tab.key
                          )
                        }
                        className={`group flex min-h-[68px] items-center gap-3 rounded-xl px-3 text-left transition ${
                          active
                            ? "bg-white text-black shadow-xl shadow-black/20"
                            : "text-white/62 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            active
                              ? "bg-black text-white"
                              : "bg-white/[0.06] text-white/70 group-hover:text-white"
                          }`}
                        >
                          <Icon
                            size={18}
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium">
                            {
                              tab.label
                            }
                          </span>
                          <span
                            className={`mt-0.5 block text-xs leading-5 ${
                              active
                                ? "text-black/55"
                                : "text-white/35"
                            }`}
                          >
                            {
                              tab.description
                            }
                          </span>
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </nav>

            <div className="min-w-0">
              <div
                id={`settings-panel-${activeTab}`}
                role="tabpanel"
                className="content-transition rounded-2xl border border-white/10 bg-black/20 p-4 shadow-2xl shadow-black/20 md:p-6"
              >
                {activeTab ===
                  "profile" && (
                  <ProfilePanel
                    profile={
                      profile
                    }
                    initials={
                      initials
                    }
                    loading={
                      profileLoading
                    }
                    saving={
                      profileSaving
                    }
                    uploading={
                      uploading
                    }
                    dragging={
                      dragging
                    }
                    previewUrl={
                      previewUrl
                    }
                    fileInputRef={
                      fileInputRef
                    }
                    setDragging={
                      setDragging
                    }
                    setProfile={
                      setProfile
                    }
                    saveProfile={
                      saveProfile
                    }
                    uploadAvatar={
                      uploadAvatar
                    }
                  />
                )}

                {activeTab ===
                  "security" && (
                  <SecurityPanel
                    account={
                      account
                    }
                    password={
                      password
                    }
                    working={
                      securityWorking
                    }
                    status={
                      securityStatus
                    }
                    setPassword={
                      setPassword
                    }
                    updatePassword={
                      updatePassword
                    }
                    sendResetEmail={
                      sendResetEmail
                    }
                    signOutEverywhere={
                      signOutEverywhere
                    }
                  />
                )}

                {activeTab ===
                  "notifications" && (
                  <NotificationsPanel
                    preferences={
                      preferences
                    }
                    loading={
                      preferencesLoading
                    }
                    saving={
                      preferencesSaving
                    }
                    setPreferences={
                      setPreferences
                    }
                    savePreferences={
                      savePreferences
                    }
                  />
                )}

                {activeTab ===
                  "billing" && (
                  <BillingPanel
                    billing={
                      billing
                    }
                    loading={
                      billingLoading
                    }
                    status={
                      billingStatus
                    }
                    startCheckout={
                      startCheckout
                    }
                    openPortal={
                      openPortal
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PanelHeader({
  icon: Icon,
  label,
  title,
  description,
}: {
  icon: typeof User;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-100/70">
        <Icon size={15} />
        {label}
      </div>
      <h2 className="mt-3 text-3xl font-semibold">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
        {description}
      </p>
    </div>
  );
}

function ProfilePanel({
  profile,
  initials,
  loading,
  saving,
  uploading,
  dragging,
  previewUrl,
  fileInputRef,
  setDragging,
  setProfile,
  saveProfile,
  uploadAvatar,
}: {
  profile: Profile;
  initials: string;
  loading: boolean;
  saving: boolean;
  uploading: boolean;
  dragging: boolean;
  previewUrl: string;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  setDragging: (value: boolean) => void;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  saveProfile: (event: React.FormEvent) => Promise<void>;
  uploadAvatar: (file: File | null) => Promise<void>;
}) {
  return (
    <form
      onSubmit={
        saveProfile
      }
      className="space-y-6"
    >
      <PanelHeader
        icon={User}
        label="Profile"
        title="Workspace identity"
        description="Update your display name and upload the image people see across Inquire."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <label className="block">
            <span className="text-sm text-white/55">
              Display name
            </span>
            <input
              value={
                profile.displayName
              }
              onChange={(event) =>
                setProfile(
                  (
                    current
                  ) => ({
                    ...current,
                    displayName:
                      event.target.value,
                  })
                )
              }
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-white outline-none transition focus:border-white/35 focus:bg-black/30"
              placeholder="Your name"
            />
          </label>

          <div className="mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-white/35">
              Account email
            </div>
            <div className="mt-1 truncate text-white/80">
              {loading
                ? "Loading..."
                : profile.email}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save size={17} />
            )}
            Save profile
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] text-xl font-semibold">
              {previewUrl ||
              profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    previewUrl ||
                    profile.avatarUrl
                  }
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <div className="font-medium">
                Profile image
              </div>
              <p className="mt-1 text-sm leading-5 text-white/42">
                Upload a JPG, PNG, WebP, or GIF.
              </p>
            </div>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() =>
              setDragging(false)
            }
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              uploadAvatar(
                event.dataTransfer
                  .files?.[0] ||
                  null
              );
            }}
            className={`mt-5 rounded-2xl border border-dashed p-5 transition ${
              dragging
                ? "border-emerald-200 bg-emerald-300/10"
                : "border-white/15 bg-black/20 hover:border-white/25"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) =>
                uploadAvatar(
                  event.target.files?.[0] ||
                    null
                )
              }
            />
            <Upload className="text-white/50" />
            <div className="mt-3 font-medium">
              Drop image here
            </div>
            <p className="mt-1 text-sm leading-5 text-white/42">
              Or choose one from your device.
            </p>
            <button
              type="button"
              disabled={uploading}
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-white/75 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-60"
            >
              {uploading && (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              )}
              Choose image
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function SecurityPanel({
  account,
  password,
  working,
  status,
  setPassword,
  updatePassword,
  sendResetEmail,
  signOutEverywhere,
}: {
  account: AccountInfo;
  password: string;
  working: boolean;
  status: string;
  setPassword: (value: string) => void;
  updatePassword: (event: React.FormEvent) => Promise<void>;
  sendResetEmail: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <PanelHeader
        icon={Shield}
        label="Security"
        title="Account access"
        description="Review sign-in details and make targeted credential changes without leaving settings."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h3 className="text-lg font-semibold">
            Sign-in details
          </h3>
          <div className="mt-4 space-y-3">
            <InfoRow
              label="Email"
              value={
                account.email ||
                "Loading..."
              }
            />
            <InfoRow
              label="Provider"
              value={
                account.provider
              }
            />
            <InfoRow
              label="Email verified"
              value={
                account.emailConfirmed
                  ? "Yes"
                  : "No"
              }
            />
            <InfoRow
              label="Last sign-in"
              value={
                account.lastSignIn
                  ? new Date(
                      account.lastSignIn
                    ).toLocaleString()
                  : "Unavailable"
              }
            />
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h3 className="text-lg font-semibold">
            Password
          </h3>
          <form
            onSubmit={
              updatePassword
            }
            className="mt-4"
          >
            <label className="block">
              <span className="text-sm text-white/55">
                New password
              </span>
              <input
                value={
                  password
                }
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                type="password"
                minLength={8}
                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-white outline-none transition focus:border-white/35"
                placeholder="At least 8 characters"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  working ||
                  password.length < 8
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound size={17} />
                Change password
              </button>
              <button
                type="button"
                disabled={
                  working ||
                  !account.email
                }
                onClick={
                  sendResetEmail
                }
                className="h-11 rounded-xl border border-white/10 px-4 text-sm text-white/75 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-60"
              >
                Send reset email
              </button>
            </div>
          </form>

          <button
            type="button"
            disabled={working}
            onClick={
              signOutEverywhere
            }
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-red-300/20 px-4 text-sm text-red-100 transition hover:bg-red-500/10 disabled:opacity-60"
          >
            <LogOut size={16} />
            Log out everywhere
          </button>

          {status && (
            <p className="mt-4 text-sm text-white/55">
              {status}
            </p>
          )}
        </article>
      </div>
    </div>
  );
}

function NotificationsPanel({
  preferences,
  loading,
  saving,
  setPreferences,
  savePreferences,
}: {
  preferences: Preferences;
  loading: boolean;
  saving: boolean;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  savePreferences: () => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <PanelHeader
        icon={Bell}
        label="Notifications"
        title="Message preferences"
        description="Tune product, billing, lead, and usage notifications from one compact control surface."
      />

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-20 rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-3">
          {notificationOptions.map(
            (
              option
            ) => {
              const enabled =
                preferences[
                  option.key
                ];

              return (
                <label
                  key={
                    option.key
                  }
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/20 hover:bg-white/[0.055]"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {
                        option.title
                      }
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-white/45">
                      {
                        option.description
                      }
                    </span>
                  </span>
                  <span
                    className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                      enabled
                        ? "border-emerald-200/45 bg-emerald-300/45"
                        : "border-white/15 bg-white/[0.06]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                        enabled
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() =>
                      setPreferences(
                        (
                          current
                        ) => ({
                          ...current,
                          [option.key]:
                            !current[
                              option.key
                            ],
                        })
                      )
                    }
                    className="sr-only"
                  />
                </label>
              );
            }
          )}
        </div>
      )}

      <button
        type="button"
        onClick={
          savePreferences
        }
        disabled={
          saving ||
          loading
        }
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? (
          <Loader2
            size={17}
            className="animate-spin"
          />
        ) : (
          <Save size={17} />
        )}
        Save preferences
      </button>
    </div>
  );
}

function BillingPanel({
  billing,
  loading,
  status,
  startCheckout,
  openPortal,
}: {
  billing: Billing | null;
  loading: boolean;
  status: string;
  startCheckout: (
    type:
      | "pro-ai"
      | "lead-engine-pro"
  ) => Promise<void>;
  openPortal: () => Promise<void>;
}) {
  const leadEngineDisplay =
    getLeadEngineDisplay(
      billing
    );

  return (
    <div className="space-y-6">
      <PanelHeader
        icon={CreditCard}
        label="Billing"
        title="Products and plans"
        description="Review product access, manage Stripe billing, or start the plan that fits your workflow."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <PlanCard
          icon="pro"
          title="Pro AI"
          subtitle="General AI, uploads, and productivity workflows"
          status={
            billing?.proAiPlan ===
            "pro"
              ? "Active"
              : "Free"
          }
          detail={
            billing?.proAiStatus ||
            "free"
          }
          loading={loading}
        />
        <PlanCard
          icon="lead"
          title="Lead Engine Pro"
          subtitle="$150/month with a 3-day free trial"
          status={
            leadEngineDisplay.label
          }
          detail={
            leadEngineDisplay.detail
          }
          trialEndsAt={
            billing?.leadEngineTrialEndsAt
          }
          loading={loading}
        />
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <button
          type="button"
          onClick={openPortal}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-white/75 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ExternalLink size={16} />
          Open Stripe portal
        </button>
        <button
          type="button"
          onClick={() =>
            startCheckout(
              "pro-ai"
            )
          }
          className="h-11 rounded-xl bg-white px-4 font-medium text-black transition hover:bg-white/90"
        >
          Upgrade to Pro AI
        </button>
        <button
          type="button"
          onClick={() =>
            billing?.hasLeadEnginePro
              ? openPortal()
              : startCheckout(
                  "lead-engine-pro"
                )
          }
          className="h-11 rounded-xl bg-emerald-300 px-4 font-medium text-black transition hover:bg-emerald-200"
        >
          {billing?.hasLeadEnginePro
            ? "Manage Subscription"
            : "Start Lead Engine Pro trial"}
        </button>
      </div>

      {status && (
        <p className="text-sm text-white/55">
          {status}
        </p>
      )}
    </div>
  );
}

function PlanCard({
  icon,
  title,
  subtitle,
  status,
  detail,
  trialEndsAt,
  loading,
}: {
  icon: "pro" | "lead";
  title: string;
  subtitle: string;
  status: string;
  detail: string;
  trialEndsAt?: string | null;
  loading: boolean;
}) {
  const Icon =
    icon === "lead"
      ? Target
      : Crown;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-emerald-100">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            {title}
          </h3>
          <p className="text-sm text-white/45">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        {loading ? (
          <div className="skeleton h-6 w-32 rounded-lg" />
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {status ===
                "Active" ||
              status ===
                "Trial Active" ? (
                <CheckCircle2
                  size={18}
                  className="text-emerald-200"
                />
              ) : (
                <Check
                  size={18}
                  className="text-white/35"
                />
              )}
              <span className="font-medium">
                {status}
              </span>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-white/55">
              {detail}
            </span>
          </div>
        )}
      </div>

      {trialEndsAt && (
        <p className="mt-3 text-sm text-emerald-100/75">
          Trial ends{" "}
          {new Date(
            trialEndsAt
          ).toLocaleDateString()}
        </p>
      )}
    </article>
  );
}

function getLeadEngineDisplay(
  billing: Billing | null
) {
  if (
    billing?.leadEngineStatus ===
    "trialing"
  ) {
    return {
      label:
        "Trial Active",
      detail:
        `${getTrialDaysRemaining(
          billing
            .leadEngineTrialEndsAt
        )} days remaining`,
    };
  }

  if (
    billing?.leadEngineStatus ===
      "active" ||
    billing?.hasLeadEnginePro
  ) {
    return {
      label:
        "Active",
      detail:
        billing
          ?.leadEngineStatus ||
        "active",
    };
  }

  return {
    label:
      "Inactive",
    detail:
      billing
        ?.leadEngineStatus ||
      "free",
  };
}

function getTrialDaysRemaining(
  trialEndsAt: string | null
) {
  if (!trialEndsAt) {
    return 3;
  }

  const msRemaining =
    new Date(
      trialEndsAt
    ).getTime() -
    Date.now();

  return Math.max(
    0,
    Math.ceil(
      msRemaining /
        (24 * 60 * 60 * 1000)
    )
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-xs uppercase tracking-[0.12em] text-white/35">
        {label}
      </div>
      <div className="mt-1 break-words text-white/80">
        {value}
      </div>
    </div>
  );
}
