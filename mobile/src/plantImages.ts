import { Asset } from "expo-asset";
import type { ImageSourcePropType } from "react-native";

const plantImages: Record<string, ImageSourcePropType> = {
  "monstera-deliciosa": require("../assets/plants/monstera-deliciosa.png"),
  "ficus-elastica": require("../assets/plants/ficus-elastica.png"),
  spathiphyllum: require("../assets/plants/spathiphyllum.png"),
  "epipremnum-aureum": require("../assets/plants/epipremnum-aureum.png"),
  "sansevieria-trifasciata": require("../assets/plants/sansevieria-trifasciata.png"),
  "aloe-vera": require("../assets/plants/aloe-vera.png"),
  "crassula-ovata": require("../assets/plants/crassula-ovata.png"),
  "zamioculcas-zamiifolia": require("../assets/plants/zamioculcas-zamiifolia.png"),
  "dracaena-marginata": require("../assets/plants/dracaena-marginata.png"),
  "chlorophytum-comosum": require("../assets/plants/chlorophytum-comosum.png"),
  "anthurium-andraeanum": require("../assets/plants/anthurium-andraeanum.png"),
  phalaenopsis: require("../assets/plants/phalaenopsis.png"),
  saintpaulia: require("../assets/plants/saintpaulia.png"),
  "hedera-helix": require("../assets/plants/hedera-helix.png"),
  "yucca-elephantipes": require("../assets/plants/yucca-elephantipes.png"),
  "ficus-benjamina": require("../assets/plants/ficus-benjamina.png"),
  "ficus-lyrata": require("../assets/plants/ficus-lyrata.png"),
  calathea: require("../assets/plants/calathea.png"),
  "maranta-leuconeura": require("../assets/plants/maranta-leuconeura.png"),
  "philodendron-scandens": require("../assets/plants/philodendron-scandens.png"),
  dieffenbachia: require("../assets/plants/dieffenbachia.png"),
  "begonia-rex": require("../assets/plants/begonia-rex.png"),
  "kalanchoe-blossfeldiana": require("../assets/plants/kalanchoe-blossfeldiana.png"),
  echeveria: require("../assets/plants/echeveria.png"),
  cactaceae: require("../assets/plants/cactaceae.png"),
  schlumbergera: require("../assets/plants/schlumbergera.png"),
  "nephrolepis-exaltata": require("../assets/plants/nephrolepis-exaltata.png"),
  peperomia: require("../assets/plants/peperomia.png"),
  tradescantia: require("../assets/plants/tradescantia.png"),
  cyclamen: require("../assets/plants/cyclamen.png"),
  azalea: require("../assets/plants/azalea.png"),
  "chamaedorea-elegans": require("../assets/plants/chamaedorea-elegans.png"),
  "dypsis-lutescens": require("../assets/plants/dypsis-lutescens.png"),
  strelitzia: require("../assets/plants/strelitzia.png"),
  "pilea-peperomioides": require("../assets/plants/pilea-peperomioides.png"),
  "hoya-carnosa": require("../assets/plants/hoya-carnosa.png"),
  gardenia: require("../assets/plants/gardenia.png"),
  "codiaeum-variegatum": require("../assets/plants/codiaeum-variegatum.png"),
  aglaonema: require("../assets/plants/aglaonema.png"),
  "schefflera-arboricola": require("../assets/plants/schefflera-arboricola.png"),
  "syngonium-podophyllum": require("../assets/plants/syngonium-podophyllum.png"),
  "fittonia-albivenis": require("../assets/plants/fittonia-albivenis.png"),
  "beaucarnea-recurvata": require("../assets/plants/beaucarnea-recurvata.png"),
  "asplenium-nidus": require("../assets/plants/asplenium-nidus.png"),
  adiantum: require("../assets/plants/adiantum.png"),
  "senecio-rowleyanus": require("../assets/plants/senecio-rowleyanus.png"),
  haworthia: require("../assets/plants/haworthia.png"),
  "dracaena-fragrans": require("../assets/plants/dracaena-fragrans.png"),
  "aspidistra-elatior": require("../assets/plants/aspidistra-elatior.png"),
  "pachira-aquatica": require("../assets/plants/pachira-aquatica.png"),
  pelargonium: require("../assets/plants/pelargonium.png"),
  "euphorbia-pulcherrima": require("../assets/plants/euphorbia-pulcherrima.png"),
  "hibiscus-rosa-sinensis": require("../assets/plants/hibiscus-rosa-sinensis.png"),
  "fatsia-japonica": require("../assets/plants/fatsia-japonica.png"),
  "cordyline-fruticosa": require("../assets/plants/cordyline-fruticosa.png"),
};

const fallbackImage: ImageSourcePropType = require("../assets/plants/generic-plant.png");

export const heroImage: ImageSourcePropType = require("../assets/illustrations/hero-plants.png");
export const emptyStateImage: ImageSourcePropType = require("../assets/illustrations/empty-state.png");

const allBundledImages = [
  ...Object.values(plantImages),
  fallbackImage,
  heroImage,
  emptyStateImage,
] as number[];

let preloadPromise: Promise<void> | undefined;

export function getPlantImage(plantTypeId: string): ImageSourcePropType {
  return plantImages[plantTypeId] ?? fallbackImage;
}

export function preloadPlantImages(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = Asset.loadAsync(allBundledImages).then(() => undefined);
  }
  return preloadPromise;
}
