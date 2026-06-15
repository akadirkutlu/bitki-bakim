import { Image, type ImageProps } from "expo-image";
import React from "react";
import type { ImageSourcePropType, StyleProp, ImageStyle } from "react-native";
import { colors } from "../theme";

type Props = {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageProps["contentFit"];
};

export const PlantImage = React.memo(function PlantImage({
  source,
  style,
  contentFit = "contain",
}: Props) {
  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={150}
      placeholder={{ blurhash: "L6Pj0^jE.AyE_3t7t7R**0o#DgR4" }}
      placeholderContentFit="contain"
      recyclingKey={typeof source === "number" ? String(source) : undefined}
    />
  );
});

export const UserPhotoImage = React.memo(function UserPhotoImage({
  uri,
  style,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
    />
  );
});

export const IllustrationImage = React.memo(function IllustrationImage({
  source,
  style,
  contentFit = "contain",
}: Props) {
  return (
    <Image
      source={source}
      style={[{ backgroundColor: colors.cream }, style]}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={200}
    />
  );
});
