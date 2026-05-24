import { Client } from "@googlemaps/google-maps-services-js";

const client = new Client({});

export async function POST(req: Request) {
  try {
    const { query, location } =
      await req.json();

    const apiKey =
      process.env.GOOGLE_PLACES_API_KEY!;

    // =====================
    // GEOCODE
    // =====================

    const geoRes =
      await client.geocode({
        params: {
          address: location,
          key: apiKey,
        },
      });

    const coords =
      geoRes.data.results[0]
        .geometry.location;

    // =====================
    // GOOGLE SEARCH
    // =====================

    const placesRes =
      await client.placesNearby({
        params: {
          location: coords,

          radius: 25000,

          keyword: query,

          key: apiKey,
        },
      });

    const rawPlaces =
      placesRes.data.results.slice(
        0,
        10
      );

    // =====================
    // ENRICH LEADS
    // =====================

    const enrichedLeads =
      await Promise.all(
        rawPlaces.map(
          async (
            place: any
          ) => {
            try {
              // =====================
              // GOOGLE DETAILS
              // =====================

              const details =
                await client.placeDetails(
                  {
                    params: {
                      place_id:
                        place.place_id,

                      fields: [
                        "name",
                        "formatted_phone_number",
                        "website",
                        "rating",
                        "formatted_address",
                        "business_status",
                        "types",
                        "url",
                      ],

                      key: apiKey,
                    },
                  }
                );

              const result =
                details.data
                  .result;

              let domain =
                "";

              // =====================
              // EXTRACT DOMAIN
              // =====================

              if (
                result.website
              ) {
                try {
                  domain =
                    new URL(
                      result.website
                    ).hostname.replace(
                      "www.",
                      ""
                    );
                } catch {
                  domain =
                    "";
                }
              }

              // =====================
              // APOLLO COMPANY ENRICH
              // =====================

              let apolloData: any =
                null;

              if (domain) {
                try {
                  const enrichRes =
                    await fetch(
                      `${process.env.NEXT_PUBLIC_APP_URL}/api/apollo-enrich`,
                      {
                        method:
                          "POST",

                        headers: {
                          "Content-Type":
                            "application/json",
                        },

                        body: JSON.stringify(
                          {
                            domain,
                          }
                        ),
                      }
                    );

                  apolloData =
                    await enrichRes.json();
                } catch (
                  apolloErr
                ) {
                  console.log(
                    apolloErr
                  );
                }
              }

              // =====================
              // APOLLO CONTACTS
              // =====================

              let contacts: any[] =
                [];

              if (domain) {
                try {
                  const contactsRes =
                    await fetch(
                      `${process.env.NEXT_PUBLIC_APP_URL}/api/apollo-contacts`,
                      {
                        method:
                          "POST",

                        headers: {
                          "Content-Type":
                            "application/json",
                        },

                        body: JSON.stringify(
                          {
                            domain,
                          }
                        ),
                      }
                    );

                  const contactsData =
                    await contactsRes.json();

                  contacts =
                    contactsData.contacts ||
                    [];
                } catch (
                  contactErr
                ) {
                  console.log(
                    contactErr
                  );
                }
              }

              // =====================
              // LEAD SCORING
              // =====================

              let leadScore =
                50;

              if (
                result.website
              )
                leadScore += 10;

              if (
                result.formatted_phone_number
              )
                leadScore += 15;

              if (
                result.rating >=
                4
              )
                leadScore += 10;

              if (
                apolloData
                  ?.organization
                  ?.estimated_num_employees
              )
                leadScore += 10;

              if (
                apolloData
                  ?.organization
                  ?.linkedin_url
              )
                leadScore += 5;

              if (
                contacts.length >
                0
              )
                leadScore += 15;

              return {
                name:
                  result.name ||
                  "Unknown",

                address:
                  result.formatted_address ||
                  "",

                phone:
                  result.formatted_phone_number ||
                  "",

                website:
                  result.website ||
                  "",

                rating:
                  result.rating ||
                  "N/A",

                business_status:
                  result.business_status ||
                  "",

                categories:
                  result.types ||
                  [],

                google_maps:
                  result.url ||
                  "",

                location,

                lead_score:
                  leadScore,

                // =====================
                // APOLLO ORG DATA
                // =====================

                employees:
                  apolloData
                    ?.organization
                    ?.estimated_num_employees ||
                  null,

                linkedin:
                  apolloData
                    ?.organization
                    ?.linkedin_url ||
                  "",

                industry:
                  apolloData
                    ?.organization
                    ?.industry ||
                  query,

                short_description:
                  apolloData
                    ?.organization
                    ?.short_description ||
                  "",

                founded_year:
                  apolloData
                    ?.organization
                    ?.founded_year ||
                  null,

                // =====================
                // CONTACTS
                // =====================

                contacts,
              };
            } catch (
              detailErr
            ) {
              console.log(
                detailErr
              );

              return null;
            }
          }
        )
      );

    const cleaned =
      enrichedLeads.filter(
        Boolean
      );

    // =====================
    // SORT BY SCORE
    // =====================

    cleaned.sort(
      (a: any, b: any) =>
        b.lead_score -
        a.lead_score
    );

    return Response.json({
      leads: cleaned,
    });
  } catch (error) {
    console.log(
      "LEADS ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to fetch leads",
      },
      {
        status: 500,
      }
    );
  }
}