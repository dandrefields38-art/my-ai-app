export async function getLiveScores() {
  try {
    const res = await fetch(
      "https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=Basketball"
    );

    const data =
      await res.json();

    return data?.events || [];
  } catch (err) {
    console.log(
      "SPORTS ERROR:",
      err
    );

    return [];
  }
}