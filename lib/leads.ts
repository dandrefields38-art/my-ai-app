export async function getLeads(
  query: string
) {
  console.log(
    "Lead search:",
    query
  );

  return [
    {
      name:
        "Miami Roofing Experts",

      website:
        "https://miamiroofingexperts.com",

      snippet:
        "Residential and commercial roofing company in Miami.",
    },

    {
      name:
        "Elite Roofing Group",

      website:
        "https://eliteroofinggroup.com",

      snippet:
        "South Florida roofing specialists with emergency repair services.",
    },

    {
      name:
        "Premier Roofing Solutions",

      website:
        "https://premierroofingsolutions.com",

      snippet:
        "Licensed roofing contractors serving Miami and nearby areas.",
    },
  ];
}