const PLANTNET_API_URL = "https://my-api.plantnet.org/v2/identify/all";

type PlantNetResult = {
  score: number;
  species: {
    scientificNameWithoutAuthor?: string;
    commonNames?: string[];
  };
};

type PlantNetResponse = {
  results?: PlantNetResult[];
};

function stripBase64Prefix(value: string): string {
  const commaIndex = value.indexOf(",");
  if (value.startsWith("data:") && commaIndex !== -1) {
    return value.slice(commaIndex + 1);
  }
  return value;
}

export function isPlantVisionConfigured(): boolean {
  return Boolean(process.env.PLANTNET_API_KEY?.trim());
}

export async function identifyPlantHintFromImage(base64Image: string): Promise<string> {
  const apiKey = process.env.PLANTNET_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("PLANTNET_API_KEY is not configured");
  }

  const imageBuffer = Buffer.from(stripBase64Prefix(base64Image), "base64");
  if (imageBuffer.length === 0) {
    throw new Error("Invalid image payload");
  }

  const form = new FormData();
  form.append(
    "images",
    new Blob([imageBuffer], { type: "image/jpeg" }),
    "plant.jpg"
  );

  const response = await fetch(`${PLANTNET_API_URL}?api-key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pl@ntNet request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as PlantNetResponse;
  const results = data.results ?? [];
  if (results.length === 0) {
    return "";
  }

  const parts: string[] = [];
  for (const result of results.slice(0, 5)) {
    if (result.species.scientificNameWithoutAuthor) {
      parts.push(result.species.scientificNameWithoutAuthor);
    }
    for (const commonName of result.species.commonNames ?? []) {
      parts.push(commonName);
    }
  }

  return parts.join(" ");
}
