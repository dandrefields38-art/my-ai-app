import SettingsPageClient, {
  type TabKey,
} from "@/app/settings/SettingsPageClient";

const validTabs: TabKey[] = [
  "profile",
  "security",
  "notifications",
  "billing",
];

const parseInitialTab = (
  tab:
    | string
    | string[]
    | undefined
): TabKey => {
  const requestedTab =
    Array.isArray(tab)
      ? tab[0]
      : tab;

  return validTabs.includes(
    requestedTab as TabKey
  )
    ? (requestedTab as TabKey)
    : "profile";
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?:
      | string
      | string[];
  }>;
}) {
  const params =
    await searchParams;

  return (
    <SettingsPageClient
      initialTab={parseInitialTab(
        params.tab
      )}
    />
  );
}
