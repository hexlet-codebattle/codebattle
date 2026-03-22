import Gon from "gon";

export default {
  default: Gon?.getAsset?.("locale") || "en",
};
